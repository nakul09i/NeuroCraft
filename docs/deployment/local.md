# Local Development & Free-First Setup Guide

**Document**: `docs/deployment/local.md`  
**Status**: Guide (Phase 0)

---

## 1. Prerequisites

* **Python 3.12+** (tested up to Python 3.14)
* **Git 2.40+**
* (Optional) **PostgreSQL 15+** and **Redis 7+** (or run them via lightweight local Docker containers)

---

## 2. Setting Up the Development Environment

```bash
# 1. Clone the repository
git clone https://github.com/neurocraft/neurocraft.git
cd neurocraft

# 2. Create Python virtual environment
python -m venv .venv

# 3. Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# 4. Install in editable mode with development dependencies
pip install -e ".[dev]"

# 5. Configure environment variables
cp .env.example .env
```

---

## 3. Free-First Validation

Run our Phase 0 verification suite to confirm that no paid API keys or external proprietary cloud services are required:
```bash
python scripts/security/verify_foundation.py
```
