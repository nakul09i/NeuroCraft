# NeuroCraft Offline-First Architecture & Local Sync Queue

**Project**: NeuroCraft  
**Tagline**: *Detect. Verify. Prove.*  
**Phase**: Step 7 — True Offline-First Architecture + Local Sync Queue  

---

## 1. Architectural Philosophy: Local-First Sovereign Analysis

NeuroCraft is engineered with an **Offline-First Mandate**:
1. **Zero Mandatory External Network Dependencies**: Core scanning, cryptographic hashing, structural binary parsing, rule evaluation, risk score synthesis, trust & file integrity assessment, scan history browsing, local report generation (PDF, CSV, JSON), and configuration management operate 100% locally on device.
2. **Primary Operational Source of Truth**: Local SQLite database. All scans, observations, certificates, and reports are committed to SQLite *before* any cloud replication is attempted.
3. **Asynchronous Cloud Sync Layer**: Google Firebase Firestore functions strictly as an optional, asynchronous secondary synchronization mechanism for multi-device backup and cross-device telemetry. An offline status or lack of cloud credentials never impedes or blocks local analysis.

---

## 2. Persistent Local Sync Queue (`sync_queue`)

To guarantee zero data loss during network outages or intermittent mobile connectivity, NeuroCraft employs a persistent SQLite queue table.

```
┌────────────────────────────────────────────────────────┐
│               LOCAL TRANSACTION (SQLite)               │
│                                                        │
│   Scan Analysis Results  ──────►  `scans` table        │
│   Digital Trust Records  ──────►  `file_integrity`     │
│   Security Reports       ──────►  `reports`            │
│   Atomic Sync Enqueue    ──────►  `sync_queue` table   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  Offline?                │
              │  Stay in SQLite Queue    │
              └────────────┬─────────────┘
                           │ Network Restored (online event / flush)
                           ▼
              ┌──────────────────────────┐
              │  Sync Engine             │
              │  Topological Ordering    │
              │  Bounded Backoff Retry   │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  Cloud Firestore         │
              │  users/{uid}/scans/...   │
              └──────────────────────────┘
```

### Table Schema & Performance Indexes

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `VARCHAR(64)` PRIMARY KEY | Unique queue item identifier (`sync-<uuid>`) |
| `user_id` | `VARCHAR(64)` FOREIGN KEY | Tenant owner (isolated by profile ID) |
| `entity_type` | `VARCHAR(50)` | `"scan"`, `"integrity"`, `"report"`, `"setting"` |
| `entity_id` | `VARCHAR(64)` | Local identifier of target entity |
| `operation` | `VARCHAR(20)` | `"CREATE"`, `"UPDATE"`, `"DELETE"` |
| `payload_json` | `TEXT` | Sanitized metadata payload (NEVER raw binary bytes) |
| `status` | `VARCHAR(20)` | `"PENDING"`, `"SYNCING"`, `"SYNCED"`, `"RETRYING"`, `"FAILED"` |
| `attempt_count`| `INTEGER` | Current retry attempt count (0 to 5) |
| `max_attempts` | `INTEGER` | Maximum retry attempts before permanent `FAILED` (default 5) |
| `last_attempt_at`| `TIMESTAMP` | Timestamp of most recent replication attempt |
| `next_attempt_at`| `TIMESTAMP` | Timestamp for next scheduled retry |
| `error_message`| `TEXT` | Diagnostic error message from most recent failure |
| `created_at` | `TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | Record update timestamp |

**Indexes**:
- `ix_sync_queue_user_id`: Tenant boundary isolation.
- `ix_sync_queue_status`: Quick filtering of ready/in-flight items.
- `ix_sync_queue_entity`: Fast deduplication lookup (`entity_type, entity_id`).
- `ix_sync_queue_next_attempt`: Compound index (`status, next_attempt_at`) for scheduled polling.
- `ix_sync_queue_user_status`: User-specific queue summaries.

---

## 3. Queue Guarantees & Protocols

### A. Topological Dependency Ordering
Entities are replicated according to structural dependency hierarchy:
1. `scan`: Parent scan entity must replicate first.
2. `integrity`: Cryptographic trust and Authenticode signature record.
3. `report`: Consolidated audit report referencing scan.
4. `setting`: User configuration preferences.

### B. Deterministic Idempotency
Cloud Firestore paths mirror local primary keys exactly:
- Scans: `users/{userId}/scans/{scanId}`
- Reports: `users/{userId}/reports/{reportId}`
- Settings: `users/{userId}/settings/{key}`
- Integrity: `users/{userId}/integrity/{scanId}`

Because replication uses upsert semantics (`setDoc(..., { merge: true })`), re-attempting replication 1 or 10 times yields exactly 1 consistent cloud document without duplicates.

### C. Bounded Exponential Backoff Schedule
When a replication attempt fails due to socket drop, DNS failure, or cloud outage, the item transitions to `RETRYING` with an exponential backoff bounded at 60 seconds:

$$\text{delay} = \min(2^{\text{attempt}}, 60)$$

- Attempt 1: 2.0s
- Attempt 2: 4.0s
- Attempt 3: 8.0s
- Attempt 4: 16.0s
- Attempt 5: 32.0s
- Maximum Bounded: 60.0s

If the item fails after 5 attempts, it transitions to `FAILED`. Failed items can be retried individually or in bulk via `POST /api/v1/sync/retry/{id}` or `POST /api/v1/sync/retry-all`.

### D. Conflict Resolution: Last-Write-Wins (LWW)
Every replicated entity includes an ISO-8601 UTC `updated_at` timestamp. If a remote document has a newer timestamp than the incoming local update, the remote state is preserved.

---

## 4. Crash Recovery & Startup Self-Healing

When the NeuroCraft backend starts (`lifespan` in `neurocraft_api/main.py`), `run_crash_recovery()` automatically executes:
1. **In-Flight Scans**: Scans stranded in `"processing"` or `"pending"` state due to an unexpected power loss or crash transition to `"failed"` with the diagnostic record: `"Scan interrupted: Process terminated or crashed before completion."`
2. **Stranded Queue Items**: Any sync queue item left in `"SYNCING"` state transitions to `"RETRYING"`, with `next_attempt_at` set to immediate UTC now and error diagnostic: `"Previous sync attempt interrupted by process restart."`

---

## 5. Defensive Passive Reconnaissance Offline Safeguards

Passive reconnaissance inherently requires network access to query public nameservers, TLS endpoints, and HTTP response headers.

Under offline conditions:
1. **Zero Hallucination / Zero Fake Data**: NeuroCraft NEVER invents or synthesizes fake recon results when offline.
2. **Cached Lookup**: The system searches local SQLite for an existing reconnaissance scan for the target:
   - If found: Returns the cached report with `cached: true` and documented observation timestamp (`limitations: ["System offline: Returning cached reconnaissance scan observed at <ISO-timestamp>"]`).
   - If not found: Returns HTTP 503 Service Unavailable with detail: `"Recon unavailable while offline. Passive reconnaissance requires active network connectivity and no cached results exist for this target."`

---

## 6. REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/sync/status` | `GET` | Retrieve queue metrics (pending, synced, failed count, last sync timestamp) |
| `/api/v1/sync/queue` | `GET` | List user's sync queue items with status filter and pagination |
| `/api/v1/sync/flush` | `POST` | Trigger immediate replication pass for ready queue items |
| `/api/v1/sync/retry/{item_id}` | `POST` | Reset specific failed item to `PENDING` for immediate retry |
| `/api/v1/sync/retry-all` | `POST` | Reset all user's failed/retrying items to `PENDING` |
