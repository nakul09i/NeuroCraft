# NeuroCraft Background Worker Service

**Module**: `services/worker`  
**Package**: `src/neurocraft_worker`  

---

## 1. Responsibility

The **Worker Service** executes long-running, CPU-intensive analysis tasks out of band from the web request loop:
* Consumes analysis jobs from the Redis task queue.
* Coordinates pipeline execution across `services/scanner`, `services/ml-engine`, `services/risk-engine`, and `services/integrity-service`.
* Enforces hard timeouts per job to prevent infinite loops on malformed binaries.
* Cleans up temporary files in quarantine storage upon job completion or failure.
* Persists final scan results into PostgreSQL and emits completion events.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `JobPayload`: Enqueued task containing `task_id`, `quarantine_file_path`, `options`, and `user_context`.
* **Outputs**:
  - Database status update (`COMPLETED` or `FAILED`).
  - Stored `ScanResult` JSON and cryptographic receipt.

---

## 3. Future Dependencies

* `celery` or `rq` or `arq`: Async task queue framework backed by Redis.
* `sqlalchemy` / `asyncpg`: Database ORM for persistence.
* `redis`: Job broker.

---

## 4. Security Considerations

* **Guaranteed Quarantine Cleanup**: The worker must run an unconditional `finally` block to remove temporary files from `./scratch/quarantine/` after analysis.
* **Non-Root Execution**: Worker processes must run under an unprivileged OS user.
* **Process Sandboxing**: Parser executions are isolated and given memory and CPU quotas.

---

## 5. Planned Interfaces

```python
class AnalysisWorker:
    """Consumes background jobs and manages execution lifecycle."""

    async def process_job(self, task_id: str, file_path: Path) -> None:
        pass
```
