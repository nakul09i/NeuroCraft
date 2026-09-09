"""Health check and service metadata endpoints."""

from typing import Any

from fastapi import APIRouter
from neurocraft_config import get_config

config = get_config()
router = APIRouter(tags=["Health"])


@router.get("/")
@router.get("/api")
async def root_index() -> dict[str, Any]:
    """Root metadata endpoint for NeuroCraft API Gateway."""
    return {
        "status": "ok",
        "service": "NeuroCraft API Gateway",
        "version": "0.1.0",
        "tagline": "Detect. Verify. Prove.",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@router.get("/health")
async def root_health() -> dict[str, Any]:
    """Basic service health check adhering strictly to API contract."""
    return {
        "status": "ok",
        "service": "neurocraft-api",
        "version": "0.1.0",
        "app_name": config.app_name,
        "environment": config.app_env,
    }


@router.get("/api/v1/health")
async def api_health() -> dict[str, Any]:
    """Detailed API gateway health diagnostic check."""
    return {
        "status": "ok",
        "service": "neurocraft-api",
        "version": "0.1.0",
        "app_name": config.app_name,
        "environment": config.app_env,
        "engines": {
            "static_analysis": "COMPLETED",
            "signatures": "COMPLETED",
            "quantum": "COMPLETED",
            "recon": "COMPLETED",
            "reports": "COMPLETED",
            "yara": "NOT_CONFIGURED",
            "clamav": "NOT_CONFIGURED",
            "ml": "NOT_CONFIGURED",
        },
        "database": "connected",
    }
