# NeuroCraft API Gateway Service

**Module**: `services/api`  
**Package**: `src/neurocraft_api`  
**Framework**: FastAPI (Python 3.12+)

---

## 1. Responsibility

The **API Gateway Service** serves as the central ingress point for all NeuroCraft interactions (Web UI, Desktop client, CLI, automated pipelines). It:
* Validates incoming HTTP requests and authentication headers.
* Manages streaming multipart uploads into isolated quarantine directories.
* Applies rate limiting, file size verification, and sanitization before dispatching jobs.
* Orchestrates asynchronous analysis tasks via the task worker queue.
* Serves query endpoints for scan results, evidence reports, and cryptographic provenance proofs.

---

## 2. Inputs & Outputs

* **Inputs**:
  - Multipart form file uploads (`/api/v1/scan/upload`).
  - SHA-256 lookup queries (`/api/v1/lookup/{sha256}`).
  - Verification requests (`/api/v1/integrity/verify`).
* **Outputs**:
  - Task status tokens (`202 Accepted` with `task_id`).
  - Structured JSON scan reports conforming to `ScanResult` schema.
  - OpenAPI 3.1 schema documentation (`/docs`, `/openapi.json`).

---

## 3. Future Dependencies

* `fastapi`: Async ASGI web framework.
* `uvicorn[standard]`: High-performance ASGI web server.
* `pydantic`: Schema validation and serialization.
* `python-multipart`: Streaming file upload parsing.
* `packages/shared-types`: Canonical domain schemas.
* `packages/shared-config`: Typed environment configuration.
* `packages/shared-security`: Input sanitizers and path validators.
* `packages/shared-logging`: Redacted JSON logger.

---

## 4. Security Considerations

* **Denial of Service Prevention**: Strict limits on upload request body size (default max: 100 MB).
* **Quarantine Isolation**: Uploaded files are written directly into an ephemeral directory with non-executable permissions (`0600`).
* **Header Validation**: User-supplied filenames are sanitized to prevent directory traversal (`../`).
* **Error Masking**: Internal tracebacks and stack traces are logged internally but masked in HTTP error responses to prevent information disclosure.

---

## 5. Planned Interfaces

```python
# Planned Route Architecture
POST /api/v1/scan/upload        -> Returns 202 Accepted { task_id: UUID }
GET  /api/v1/scan/{task_id}     -> Returns { status: PENDING|PROCESSING|COMPLETED, result?: ScanResult }
GET  /api/v1/lookup/{sha256}    -> Returns Cached ScanResult or 404
POST /api/v1/integrity/verify   -> Validates cryptographic Merkle proof against ledger
GET  /api/v1/health             -> Liveness and readiness status of services
```
