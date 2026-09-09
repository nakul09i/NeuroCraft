# NeuroCraft Backend Technical Documentation

## 1. Architectural Overview

NeuroCraft uses a local-first, modular architecture built on **FastAPI**, **SQLAlchemy**, and **SQLite**.

```
Frontend (React/Vite on port 3000)
       │
       ▼ (proxied / direct CORS)
FastAPI Gateway (Uvicorn on port 8000)
 ├── Middleware:
 │    ├── Environment-Aware CORS Middleware
 │    ├── Request Logging Middleware (sanitizes sensitive headers)
 │    └── Centralized Error Handlers (400, 401, 403, 404, 409, 422, 429, 500, 503)
 ├── Domain Routers (services/api/src/neurocraft_api/routes/):
 │    ├── health.py     (GET /health, GET /api/v1/health, GET /)
 │    ├── auth.py       (POST /api/v1/auth/signup, /login, GET /me)
 │    ├── scans.py      (POST /api/v1/scans, GET /scans, GET /scans/{id}, DELETE)
 │    ├── recon.py      (POST /api/v1/recon, GET /recon, GET /recon/{id}, DELETE)
 │    ├── trust.py      (POST /api/v1/quantum/simulations, /simulate, GET)
 │    ├── reports.py    (POST /api/v1/reports, GET /reports, GET /reports/{id}, DELETE)
 │    ├── dashboard.py  (GET /api/v1/dashboard/stats)
 │    └── settings.py   (GET /api/v1/settings, PUT /settings/{key}, DELETE)
 ├── Repositories (services/api/src/neurocraft_api/repositories/):
 │    ├── scan_repo.py      (Strict scan and finding boundary isolation)
 │    └── settings_repo.py  (Local preferences and configurations)
 └── Engine & Persistence:
      ├── IngestionManager  (Quarantine staging as .bin, strict size limits, auto-cleanup)
      ├── ScannerOrchestrator, ReconEngine, QuantumTrustSimulator
      └── Persistent SQLite (neurocraft.db via SQLAlchemy + aiosqlite)
```

## 2. FastAPI Entrypoint & Startup

### Canonical Entrypoints
- **Local / Container Development**: `neurocraft_api.main:app`
- **Vercel Serverless / Fallback**: `api.index:app`

### Exact Startup Command

```bash
# In active virtual environment (.venv)
uvicorn neurocraft_api.main:app --host 127.0.0.1 --port 8000 --reload
```

## 3. Environment Variables Configuration

Centralized configuration is managed by `packages/shared-config/src/neurocraft_config/settings.py` with automatic `.env` discovery.

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `NeuroCraft` | Service application name |
| `APP_ENV` | `development` | Environment mode (`development`, `production`, `offline`) |
| `APP_DEBUG` | `true` | Debug mode |
| `APP_HOST` | `127.0.0.1` | Binding host address |
| `APP_PORT` | `8000` | Gateway listening port |
| `DATABASE_URL` | `sqlite+aiosqlite:///./neurocraft.db` | Primary local SQLite persistence |
| `MAX_UPLOAD_SIZE_BYTES`| `104857600` (100MB) | File ingestion ceiling |
| `QUARANTINE_DIR` | `./scratch/quarantine` | Isolated temporary file staging directory |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins |

## 4. Health & Diagnostic Endpoints

### `GET /health`
Adheres to canonical health API contract:
```json
{
  "status": "ok",
  "service": "neurocraft-api",
  "version": "0.1.0",
  "app_name": "NeuroCraft",
  "environment": "development"
}
```

### `GET /api/v1/health`
Detailed diagnostic output reporting engine statuses and database connectivity.

## 5. Centralized Error Handling

All uncaught exceptions and HTTP errors return predictable JSON and never leak Python stack traces, internal file paths, or credentials:

- `400 Bad Request`: Security bounds or input validation violations
- `401 Unauthorized`: Missing or invalid JWT credentials
- `403 Forbidden`: Resource access restricted
- `404 Not Found`: Target entity does not exist or belongs to another user
- `409 Conflict`: Database unique constraint violation
- `422 Unprocessable Content`: Schema validation failures (maintains `detail` array compatible with frontend)
- `500 Internal Server Error`: Unhandled server exception (full trace logged server-side, safe message to client)
- `503 Service Unavailable`: Database locked or operational issue

## 6. Secure Upload & Passive Analysis

1. **Zero Execution**: Uploaded files are strictly analyzed through passive binary headers, PE structures, and signature matching. No subprocesses or shell calls are executed.
2. **Path Sanitization**: Filenames are cleaned with `sanitize_filename()` (stripping `../`, `..\\`, null bytes).
3. **Quarantine Staging**: Files are staged as `{scan_id}.bin` inside an isolated quarantine folder.
4. **Unconditional Cleanup**: Temporary quarantined files are guaranteed to be unlinked in `finally:` blocks.
