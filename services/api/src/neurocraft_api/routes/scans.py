"""File Scanning & Analysis API routes."""

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from neurocraft_logging import get_logger
from neurocraft_scanner import IngestionManager, ScannerOrchestrator
from neurocraft_types import ScanResponse, ScanResult, UserContext

from neurocraft_api.auth import get_optional_user
from neurocraft_api.repositories.scan_repo import ScanRepository

logger = get_logger("neurocraft.api.scans")
router = APIRouter(prefix="/api/v1/scans", tags=["Scans"])

ingestion_mgr = IngestionManager()
scanner_orchestrator = ScannerOrchestrator()
scan_repo = ScanRepository()


@router.post(
    "",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and scan an untrusted file",
)
async def create_scan(
    file: UploadFile = File(...),
    user: UserContext | None = Depends(get_optional_user),
) -> ScanResponse:
    """
    Ingests an untrusted file into isolated quarantine staging, runs static analysis,
    computes deterministic risk scores, persists findings to SQLite, and returns scan results.

    CRITICAL SECURITY MANDATES:
    - Files are strictly staged as isolated .bin files
    - Uploaded files are NEVER executed or passed to shell subprocesses
    - Quarantined file is cleaned up unconditionally
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    user_id = user.user_id if user else None

    # Ingest file stream into isolated quarantine
    scan_id, clean_name, quarantine_path, size_bytes = ingestion_mgr.ingest_stream(
        stream=file.file,
        original_filename=file.filename,
    )

    try:
        # Execute static passive scanner orchestrator
        scan_result = scanner_orchestrator.scan_file(
            file_path=quarantine_path,
            original_filename=clean_name,
            scan_id=scan_id,
        )
        scan_result.user_id = user_id

        # Persist metadata, findings, and capabilities to database via repository
        await scan_repo.save_scan_result(scan_result, user_id=user_id)

        # Return public structured scan response
        return scan_result.to_response()

    finally:
        # CRITICAL MANDATE: Unconditionally clean up quarantine file
        ingestion_mgr.cleanup(quarantine_path)


@router.get(
    "",
    summary="List recent scans for authenticated user",
)
async def list_scans(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent scans, enforcing user isolation when authenticated."""
    user_id = user.user_id if user else None
    records = await scan_repo.list_scans(user_id=user_id, limit=limit)
    return [
        {
            "scan_id": r.scan_id,
            "filename": r.filename,
            "sha256": r.sha256,
            "file_type": r.file_type,
            "file_size_bytes": r.file_size_bytes,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Retrieve full scan result by ID",
)
async def get_scan(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ScanResponse:
    """Retrieve full persisted ScanResponse by ID enforcing user isolation."""
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    scan_res = ScanResult.model_validate_json(scan_record.raw_result_json)
    return scan_res.to_response()


@router.delete(
    "/{scan_id}",
    summary="Delete a scan by ID",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_scan(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> None:
    """Delete a scan record and its cascaded findings/capabilities."""
    user_id = user.user_id if user else None
    deleted = await scan_repo.delete_scan(scan_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found or access denied.",
        )
