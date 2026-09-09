"""Routes package exports for NeuroCraft API Gateway."""

from neurocraft_api.routes.auth import router as auth_router
from neurocraft_api.routes.dashboard import router as dashboard_router
from neurocraft_api.routes.health import router as health_router
from neurocraft_api.routes.recon import router as recon_router
from neurocraft_api.routes.reports import router as reports_router
from neurocraft_api.routes.scans import router as scans_router
from neurocraft_api.routes.settings import router as settings_router
from neurocraft_api.routes.trust import router as trust_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "health_router",
    "recon_router",
    "reports_router",
    "scans_router",
    "settings_router",
    "trust_router",
]
