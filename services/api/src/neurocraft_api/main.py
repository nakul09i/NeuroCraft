"""FastAPI Gateway service for NeuroCraft."""

import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from neurocraft_config import get_config
from neurocraft_logging import get_logger
from neurocraft_scanner import IngestionError, IngestionManager, ScannerOrchestrator
from neurocraft_types import ScanResponse, ScanResult

from neurocraft_api.database import get_scan_by_id, init_db, save_scan_result

logger = get_logger("neurocraft.api")
config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifecycle startup and shutdown handler."""
    logger.info("Initializing NeuroCraft API database and scanner engines...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    yield
    logger.info("NeuroCraft API shutting down.")


app = FastAPI(
    title="NeuroCraft API",
    version="0.1.0",
    description="Detect. Verify. Prove. — AI-assisted, multi-layer cybersecurity platform for file analysis and cryptographic provenance.",
    lifespan=lifespan,
)

# CORS middleware
origins = (
    [origin.strip() for origin in config.allowed_origins.split(",") if origin.strip()]
    if hasattr(config, "allowed_origins")
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ingestion_mgr = IngestionManager()
scanner_orchestrator = ScannerOrchestrator()


@app.get("/health", tags=["Health"])
async def root_health() -> dict[str, str]:
    """Basic service health check."""
    return {"status": "ok", "service": "neurocraft-api"}


@app.get("/api/v1/health", tags=["Health"])
async def detailed_health() -> dict[str, Any]:
    """Detailed system diagnostic health check including engines and dependencies."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "app_env": config.app_env,
        "engines": {
            "static_analysis": "COMPLETED",
            "yara": "NOT_CONFIGURED",
            "clamav": "NOT_CONFIGURED" if not config.clamav_enabled else "AVAILABLE",
            "ml": "NOT_CONFIGURED",
        },
        "limits": {
            "max_upload_size_bytes": config.max_upload_size_bytes,
            "scanner_timeout_seconds": config.scanner_timeout_seconds,
        },
    }


@app.post(
    "/api/v1/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Scanning"],
    summary="Upload and scan an untrusted file",
)
async def create_scan(file: UploadFile = File(...)) -> ScanResponse:
    """
    Ingests an untrusted file into quarantine, runs static analysis, computes deterministic
    risk scores, persists metadata, and returns a structured scan result.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    try:
        # Ingest file stream into isolated quarantine
        scan_id, clean_name, quarantine_path, size_bytes = ingestion_mgr.ingest_stream(
            stream=file.file,
            original_filename=file.filename,
        )

        try:
            # Execute static scanner orchestrator
            scan_result = scanner_orchestrator.scan_file(
                file_path=quarantine_path,
                original_filename=clean_name,
                scan_id=scan_id,
            )

            # Persist metadata to database
            await save_scan_result(scan_result)

            # Return public structured scan response
            return scan_result.to_response()

        finally:
            # CRITICAL MANDATE: Unconditionally clean up quarantine file
            ingestion_mgr.cleanup(quarantine_path)

    except IngestionError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err
    except Exception as exc:
        logger.error(f"Internal scan failure for {file.filename}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during static analysis.",
        ) from exc


@app.get(
    "/api/v1/scans/{scan_id}",
    response_model=ScanResponse,
    tags=["Scanning"],
    summary="Retrieve scan results by scan_id",
)
async def get_scan(scan_id: str) -> ScanResponse:
    """Retrieve historical scan result and evidence findings by scan_id."""
    record = await get_scan_by_id(scan_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' not found.",
        )

    # Reconstruct ScanResult from stored JSON
    raw_data = json.loads(str(record.raw_result_json))
    scan_result = ScanResult.model_validate(raw_data)
    return scan_result.to_response()
