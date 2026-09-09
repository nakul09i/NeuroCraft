# NeuroCraft Database Architecture & SQLite Specification

## 1. Role & Purpose of SQLite

> [!IMPORTANT]
> **SQLite is the primary LOCAL and OFFLINE database for NeuroCraft.**  
> It delivers zero-setup, student-friendly, and offline-first storage for scans, findings, reports, recon assets, quantum trust simulations, and local settings. SQLite is not intended as a multi-instance production cloud database.

For distributed multi-instance cloud deployments, PostgreSQL can be configured simply by overriding the `DATABASE_URL` environment variable.

## 2. Location & Configuration

- **Default Database Path**: `./neurocraft.db` (persisted in workspace root)
- **Fallback / Temporary Path**: `/tmp/neurocraft.db` (under Vercel/serverless environments)
- **Connection Protocol**: Asynchronous SQLAlchemy with `aiosqlite`
- **Connection String**: `sqlite+aiosqlite:///./neurocraft.db`
- **Configuration Variable**: `DATABASE_URL`

## 3. ORM Architecture

NeuroCraft uses **SQLAlchemy 2.0 DeclarativeBase** models (`services/api/src/neurocraft_api/database.py`) coupled with an async session factory (`async_sessionmaker[AsyncSession]`) and dependency injection helper `get_db_session()`.

## 4. Migration System

Migrations are managed by `services/api/src/neurocraft_api/migrations/runner.py`.

### Migration Guarantees:
- **Zero Data Loss**: Migrations **NEVER** execute `DROP TABLE` or delete records automatically.
- **Idempotency**: Execution history is tracked in the `schema_migrations` table (`version`, `description`, `applied_at`).
- **Automatic Execution**: Unapplied migrations are automatically discovered and safely executed on application startup during the FastAPI `lifespan` handler.

### Registered Migrations:
1. `001_initial_schema`: Base tables for profiles, scans, findings, capabilities, recon scans, recon assets, recon findings, quantum simulations, and reports.
2. `002_add_settings`: Persistent local user preferences and key-value configurations.

## 5. Domain Models & Schema

```
ProfileRecord (User Profile)
  ├── ScanRecord (1:N)
  │     ├── FindingRecord (1:N, cascade delete)
  │     └── CapabilityRecord (1:N, cascade delete)
  ├── ReconScanRecord (1:N)
  │     ├── ReconAssetRecord (1:N, cascade delete)
  │     └── ReconFindingRecord (1:N, cascade delete)
  ├── QuantumSimulationRecord (1:N)
  ├── ReportRecord (1:N)
  └── SettingRecord (1:N)
```

### Table Definitions

1. **`profiles`**: User identity accounts and roles.
2. **`scans`**: Analyzed file metadata, cryptographic hashes (MD5, SHA-1, SHA-256), MIME types, and deterministic risk score/verdict.
3. **`findings`**: Normalized static analysis findings linked by `scan_id` with category, severity, confidence, and evidence JSON.
4. **`capabilities`**: Extracted functional capabilities (e.g., persistence, encryption, network activity) linked by `scan_id`.
5. **`recon_scans`**: Passive DNS, TLS, and HTTP security header exposure audits.
6. **`recon_assets`**: Discovered infrastructure endpoints.
7. **`recon_findings`**: Passive exposure findings with remediation recommendations.
8. **`quantum_simulations`**: Qubit statevector verification simulation metrics and deviations.
9. **`reports`**: Consolidated multi-engine security audit reports.
10. **`settings`**: Key-value store for offline flags, theme preferences, and local options.

## 6. Strict Scan Isolation

Scan data isolation is enforced at the repository layer (`ScanRepository` in `repositories/scan_repo.py`):
- Findings and capabilities are strictly scoped to matching `scan_id`.
- Scan A queries exclusively resolve Finding A records; Scan B queries exclusively resolve Finding B records.
- Foreign key constraints ensure child records are deleted when a parent scan is removed.

## 7. Performance & Indexing

Selective B-tree indexes are configured on frequently queried columns:
- `scans`: `scan_id` (unique), `user_id`, `sha256`, `created_at`
- `findings`: `scan_id`
- `capabilities`: `scan_id`
- `recon_scans`: `user_id`, `target`, `created_at`
- `quantum_simulations`: `user_id`, `created_at`
- `reports`: `user_id`, `created_at`
- `settings`: `user_id`

## 8. Persistence & Restart Verification

All operations write synchronously to the SQLite file. In-memory databases are strictly forbidden. The database survives application stops, restarts, and reboots without schema recreation or data destruction.
