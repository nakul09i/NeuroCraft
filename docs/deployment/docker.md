# Docker & Container Orchestration Guide

**Document**: `docs/deployment/docker.md`  
**Status**: Guide (Phase 0)

---

## 1. Overview

NeuroCraft provides a self-contained, free-first Docker Compose configuration (`docker-compose.yml`) that spins up all local supporting open-source services without third-party cloud accounts.

---

## 2. Running Local Infrastructure

To start only the supporting databases and security daemons (PostgreSQL, Redis, ClamAV):

```bash
docker compose up -d postgres redis clamav
```

To view logs:
```bash
docker compose logs -f
```

To stop all containers:
```bash
docker compose down
```

---

## 3. Production Hardening Notes

* Analysis worker containers run with unprivileged user `UID 10001`.
* Temporary quarantine volumes are mounted in-memory (`tmpfs`) with `noexec` flags to guarantee zero execution.
