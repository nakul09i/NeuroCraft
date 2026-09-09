"""Vercel Serverless Function entrypoint for NeuroCraft FastAPI Gateway.

Exports the canonical FastAPI application instance (`app`) located in
`services/api/src/neurocraft_api/main.py`.
"""

import sys
from pathlib import Path

# Resolve repository root directory
ROOT_DIR = Path(__file__).resolve().parent.parent

# Ensure repository root and internal module search paths are present in sys.path
PACKAGE_PATHS = [
    ROOT_DIR,
    ROOT_DIR / "packages" / "shared-types" / "src",
    ROOT_DIR / "packages" / "shared-config" / "src",
    ROOT_DIR / "packages" / "shared-security" / "src",
    ROOT_DIR / "packages" / "shared-logging" / "src",
    ROOT_DIR / "packages" / "api-client" / "src",
    ROOT_DIR / "services" / "api" / "src",
    ROOT_DIR / "services" / "scanner" / "src",
    ROOT_DIR / "services" / "ml-engine" / "src",
    ROOT_DIR / "services" / "risk-engine" / "src",
    ROOT_DIR / "services" / "quantum-engine" / "src",
    ROOT_DIR / "services" / "recon-engine" / "src",
    ROOT_DIR / "services" / "explanation-engine" / "src",
    ROOT_DIR / "services" / "integrity-service" / "src",
    ROOT_DIR / "services" / "provenance-service" / "src",
    ROOT_DIR / "services" / "worker" / "src",
]

for p in PACKAGE_PATHS:
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

# Import canonical FastAPI application instance
from neurocraft_api.main import app  # noqa: E402

__all__ = ["app"]
