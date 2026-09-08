# ==============================================================================
# NeuroCraft Automation Makefile (Phase 0 Foundation)
# Provides commands for verification, code quality, and environment management.
# ==============================================================================

.PHONY: help info setup lint format typecheck test dev docker-up docker-down clean

help:
	@echo "NeuroCraft — Phase 0 Automation"
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  info         Display project metadata, Python environment and tool status"
	@echo "  setup        Set up local development virtual environment"
	@echo "  lint         Run static code linting (requires ruff in venv)"
	@echo "  format       Format codebase (requires ruff in venv)"
	@echo "  typecheck    Run static type analysis (requires mypy in venv)"
	@echo "  test         Run unit and verification tests (requires pytest in venv)"
	@echo "  verify       Run Phase 0 architecture and safety checks"
	@echo "  dev          [Future] Start local development servers"
	@echo "  docker-up    [Future] Start local Docker services (PostgreSQL, Redis, ClamAV)"
	@echo "  docker-down  [Future] Stop local Docker services"
	@echo "  clean        Clean build artifacts, caches, and ephemeral scratch files"

info:
	@python -c "import sys; print(f'Python Version : {sys.version}')"
	@python scripts/security/verify_foundation.py

setup:
	@echo "[NeuroCraft] Setting up virtual environment..."
	python -m venv .venv
	@echo "[NeuroCraft] Virtual environment created at .venv. Activate and run:"
	@echo "  .venv/Scripts/activate  (Windows)"
	@echo "  source .venv/bin/activate  (Linux/macOS)"
	@echo "  pip install -e \".[dev]\""

lint:
	@python -c "import shutil; exit(0 if shutil.which('ruff') else 1)" 2>/dev/null && ruff check . || \
	python -m ruff check . 2>/dev/null || \
	echo "[NOTE] 'ruff' is not installed in the active environment. Install via: pip install -e \".[dev]\""

format:
	@python -c "import shutil; exit(0 if shutil.which('ruff') else 1)" 2>/dev/null && ruff format . || \
	python -m ruff format . 2>/dev/null || \
	echo "[NOTE] 'ruff' is not installed in the active environment. Install via: pip install -e \".[dev]\""

typecheck:
	@python -c "import shutil; exit(0 if shutil.which('mypy') else 1)" 2>/dev/null && mypy packages services || \
	python -m mypy packages services 2>/dev/null || \
	echo "[NOTE] 'mypy' is not installed in the active environment. Install via: pip install -e \".[dev]\""

test:
	@python -c "import shutil; exit(0 if shutil.which('pytest') else 1)" 2>/dev/null && pytest tests/unit || \
	python -m pytest tests/unit 2>/dev/null || \
	python tests/unit/test_foundation.py

verify:
	python scripts/security/verify_foundation.py

dev:
	@echo "[Future] Developer mode orchestrator. In Phase 1+, this will launch the FastAPI backend and Next.js frontend."

docker-up:
	@echo "[Future] Starting Docker services (PostgreSQL, Redis, ClamAV)..."
	docker compose up -d postgres redis clamav 2>/dev/null || echo "[NOTE] Docker is not running or not installed on this system."

docker-down:
	@echo "[Future] Stopping Docker services..."
	docker compose down 2>/dev/null || echo "[NOTE] Docker is not running or not installed on this system."

clean:
	@python -c "import shutil, pathlib; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('.pytest_cache')]; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('.mypy_cache')]"
	@echo "[NeuroCraft] Cleaned temporary caches."
