"""FastAPI Gateway service for NeuroCraft.

Provides comprehensive REST endpoints for:
- File Scans & Static Evidence Analysis
- Digital Signatures & Authenticode Certificates
- Passive Defensive Reconnaissance
- Quantum Trust Simulation (SIH Key Differentiator)
- Security Reports Synthesis
- User Authentication & Ownership Authorization
- Local Configuration & Persistence
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from neurocraft_config import get_config
from neurocraft_logging import get_logger

from neurocraft_api.database import close_db, init_db
from neurocraft_api.middleware import RequestLoggingMiddleware, register_error_handlers
from neurocraft_api.migrations import run_migrations
from neurocraft_api.routes import (
    auth_router,
    dashboard_router,
    health_router,
    recon_router,
    reports_router,
    scans_router,
    settings_router,
    sync_router,
    trust_router,
)
from neurocraft_api.sync import run_crash_recovery

logger = get_logger("neurocraft.api")
config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifecycle startup and shutdown handler."""
    logger.info(
        f"Starting {config.app_name} API Gateway v0.1.0 in '{config.app_env}' mode..."
    )
    try:
        # 1. Initialize SQLite database layer
        await init_db()
        logger.info("Database connection initialized successfully.")

        # 2. Run safe, non-destructive incremental migrations
        applied = await run_migrations()
        if applied:
            logger.info(f"Applied {len(applied)} new migrations: {applied}")
        else:
            logger.info("Database schema is up to date.")

        # 3. Offline-first crash recovery: recover interrupted scans and stuck sync queue items
        recovery_stats = await run_crash_recovery()
        logger.info(
            f"Crash recovery executed: {recovery_stats['recovered_scans']} scans recovered, "
            f"{recovery_stats['recovered_sync_items']} sync items reset."
        )
    except Exception as e:
        logger.error(f"Error during database initialization, migration, or recovery: {e}", exc_info=True)

    yield

    # Clean shutdown
    logger.info("NeuroCraft API shutting down. Closing database connections...")
    try:
        await close_db()
        logger.info("Database connections closed cleanly.")
    except Exception as e:
        logger.error(f"Error during database shutdown: {e}")
    logger.info("NeuroCraft API shutdown complete.")


app = FastAPI(
    title="NeuroCraft API",
    version="0.1.0",
    description="Detect. Verify. Prove. — AI-assisted, multi-layer cybersecurity platform for file analysis and cryptographic provenance.",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# Middlewares: Logging, CORS & Centralized Error Handling
# ------------------------------------------------------------------------------

# 1. Centralized Error Handlers (catches HTTP, validation, DB, and unhandled errors)
register_error_handlers(app)

# 2. Access / Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Environment-Aware CORS Middleware
configured_origins = [
    origin.strip()
    for origin in config.allowed_origins.split(",")
    if origin.strip()
]

if config.is_production:
    # Strict validation in production: do not allow wildcard origins with credentials
    if "*" in configured_origins:
        logger.warning(
            "CORS: Wildcard origin detected in production configuration! Restricting to configured origins."
        )
        effective_origins = [o for o in configured_origins if o != "*"]
    else:
        effective_origins = configured_origins
    allow_all_origins = False
else:
    # Development: default to local frontend origins
    effective_origins = configured_origins if configured_origins else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    allow_all_origins = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=effective_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Modular Domain Routers
# ------------------------------------------------------------------------------

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(scans_router)
app.include_router(recon_router)
app.include_router(trust_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(sync_router)

# ------------------------------------------------------------------------------
# Static SPA Frontend Serving (For unified single-process / demo hosting)
# ------------------------------------------------------------------------------

_candidates = [
    Path(__file__).resolve().parent.parent.parent.parent.parent / "apps" / "web" / "dist",
    Path("apps/web/dist"),
    Path("dist"),
]
_web_dist = next((p for p in _candidates if p.is_dir() and (p / "index.html").is_file()), None)

if _web_dist:
    _assets_dir = _web_dist / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="web_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str) -> Any:
        if (
            full_path.startswith("api/")
            or full_path.startswith("health")
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
        ):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API endpoint not found.")
        target = _web_dist / full_path
        if target.is_file():
            return FileResponse(target)
        index_file = _web_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")
