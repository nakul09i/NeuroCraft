"""File Scanning & Analysis API routes."""

import json
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from neurocraft_logging import get_logger
from neurocraft_scanner import IngestionManager, ScannerOrchestrator
from neurocraft_types import (
    ConfidenceEnum,
    FileIntegrityReport,
    Finding,
    HashMatchStatusEnum,
    IntegrityStatusEnum,
    ScanResponse,
    ScanResult,
    SeverityEnum,
    TrustAssessment,
    TrustEvidenceItem,
    TrustLevelEnum,
    UserContext,
    VerdictLevel,
)

from neurocraft_api.auth import get_optional_user
from neurocraft_api.reports import (
    export_scan_as_csv,
    export_scan_as_json,
    export_scan_as_pdf,
)
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
    reference_hash: str | None = Form(None),
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
        # Execute static passive scanner orchestrator with optional reference hash
        scan_result = scanner_orchestrator.scan_file(
            file_path=quarantine_path,
            original_filename=clean_name,
            scan_id=scan_id,
            reference_hash=reference_hash,
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
    response: Response,
    limit: int = 50,
    offset: int = 0,
    q: str | None = None,
    risk_level: str | None = None,
    status: str | None = None,
    sort_by: str = "newest",
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent scans, enforcing user isolation, search, filtering, and pagination."""
    user_id = user.user_id if user else None
    total_count = await scan_repo.count_scans(
        user_id=user_id,
        q=q,
        risk_level=risk_level,
        status=status,
    )
    records = await scan_repo.list_scans(
        user_id=user_id,
        limit=limit,
        offset=offset,
        q=q,
        risk_level=risk_level,
        status=status,
        sort_by=sort_by,
    )

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)

    return [
        {
            "id": r.scan_id,
            "scan_id": r.scan_id,
            "user_id": r.user_id,
            "filename": r.filename,
            "file_type": r.file_type,
            "file_size": r.file_size_bytes,
            "file_size_bytes": r.file_size_bytes,
            "sha256": r.sha256,
            "status": getattr(r, "status", "completed"),
            "analysis_status": getattr(r, "status", "completed"),
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "confidence": getattr(r, "confidence", "HIGH"),
            "integrity_status": (
                r.integrity.integrity_status if r.integrity else "UNKNOWN"
            ),
            "signature_status": (
                r.integrity.signature_status if r.integrity else "UNSIGNED"
            ),
            "trust_score": r.integrity.trust_score if r.integrity else 50.0,
            "trust_level": (
                getattr(r.integrity, "trust_level", "NEUTRAL")
                if r.integrity
                else "NEUTRAL"
            ),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if getattr(r, "updated_at", None) else None,
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


@router.get(
    "/{scan_id}/findings",
    response_model=list[Finding],
    summary="Retrieve isolated findings for a scan",
)
async def get_scan_findings(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> list[Finding]:
    """
    Retrieve security findings strictly belonging to the given scan_id.
    Guarantees scan isolation: never returns findings belonging to other scans.
    """
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    finding_records = await scan_repo.get_findings_for_scan(scan_id)
    findings: list[Finding] = []
    for fr in finding_records:
        evidence_dict = {}
        if fr.evidence_json:
            try:
                evidence_dict = json.loads(fr.evidence_json)
            except Exception:
                evidence_dict = {}

        findings.append(
            Finding(
                id=fr.finding_id,
                category=fr.category,
                title=fr.title,
                description=getattr(fr, "description", "") or "",
                severity=SeverityEnum(fr.severity),
                confidence=ConfidenceEnum(fr.confidence),
                evidence=evidence_dict,
                source_engine=fr.source_engine,
                weight=getattr(fr, "weight", 0.0) or 0.0,
            )
        )
    return findings


@router.get(
    "/{scan_id}/integrity",
    response_model=FileIntegrityReport,
    summary="Retrieve cryptographic file integrity and signature assessment",
)
async def get_scan_integrity(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> FileIntegrityReport:
    """
    Retrieve deterministic file integrity report, reference hash comparison,
    and digital signature verification for a scan.
    """
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    # First attempt extraction from persisted ScanResult JSON
    if scan_record.raw_result_json:
        try:
            scan_res = ScanResult.model_validate_json(scan_record.raw_result_json)
            if scan_res.integrity:
                return scan_res.integrity
        except Exception:
            pass

    # Query from file_integrity database table
    int_rec = await scan_repo.get_file_integrity(scan_id, user_id)
    if not int_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integrity report for scan '{scan_id}' is not available.",
        )

    evidence_items = []
    if int_rec.evidence_json:
        try:
            raw_ev = json.loads(int_rec.evidence_json)
            evidence_items = [TrustEvidenceItem.model_validate(e) for e in raw_ev]
        except Exception:
            evidence_items = []

    # Safe fallback mapping
    return FileIntegrityReport(
        scan_id=int_rec.scan_id,
        sha256=int_rec.sha256,
        sha512=int_rec.sha512,
        sha1=int_rec.sha1,
        reference_hash=int_rec.reference_hash,
        hash_match_status=HashMatchStatusEnum(int_rec.hash_match_status),
        integrity_status=IntegrityStatusEnum(int_rec.integrity_status),
        trust_score=int_rec.trust_score,
        trust_level=TrustLevelEnum.HIGH if int_rec.trust_score >= 70.0 else TrustLevelEnum.NEUTRAL,
        confidence=ConfidenceEnum(int_rec.confidence),
        confidence_score=int_rec.confidence_score,
        evidence=evidence_items,
        created_at=int_rec.created_at,
    )


@router.get(
    "/{scan_id}/trust",
    response_model=TrustAssessment,
    summary="Retrieve separate trust evaluation distinguishing identity/provenance from risk",
)
async def get_scan_trust(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> TrustAssessment:
    """
    Retrieve separate Trust Assessment (0-100) vs Risk Score (0-100).
    Guarantees evidence-based logic: unsigned != malicious; mismatch != automatic malware.
    """
    integrity_report = await get_scan_integrity(scan_id, user)
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found.",
        )

    summary = (
        f"Trust score is {integrity_report.trust_score}/100 ({integrity_report.trust_level.value}). "
        f"Integrity posture: {integrity_report.integrity_status.value}. "
        f"Risk level is {scan_record.risk_level} ({scan_record.risk_score}/100)."
    )

    return TrustAssessment(
        scan_id=scan_id,
        trust_score=integrity_report.trust_score,
        trust_level=integrity_report.trust_level,
        confidence=integrity_report.confidence,
        confidence_score=integrity_report.confidence_score,
        integrity_status=integrity_report.integrity_status,
        risk_level=VerdictLevel(scan_record.risk_level),
        risk_score=scan_record.risk_score,
        evidence=integrity_report.evidence,
        summary=summary,
        created_at=integrity_report.created_at,
    )


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


@router.get(
    "/{scan_id}/recon",
    summary="Retrieve correlated reconnaissance intelligence for a scan",
)
async def get_scan_recon(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """
    Retrieve correlated passive reconnaissance data for this scan.
    Enforces user isolation: never reveals recon data belonging to other users.
    """
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    return await scan_repo.get_scan_recon(scan_id, user_id)


@router.get(
    "/{scan_id}/report",
    summary="Generate and export security audit report in PDF, CSV, or JSON",
)
async def export_scan_report(
    scan_id: str,
    format: str = "pdf",
    user: UserContext | None = Depends(get_optional_user),
) -> Response:
    """
    Export evidence-based security report for a scan.
    Supported formats: 'pdf' (default), 'csv', 'json'.
    Strictly enforces user isolation: only the owner of the scan can download the report.
    """
    user_id = user.user_id if user else None
    scan_record = await scan_repo.get_scan_by_id(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    int_rec = await scan_repo.get_file_integrity(scan_id, user_id)
    recon_data = await scan_repo.get_scan_recon(scan_id, user_id)

    # Sanitize scan_id for safe filenames
    safe_scan_id = "".join(c for c in scan_id if c.isalnum() or c in ("-", "_"))[:32]
    fmt = format.lower().strip()

    if fmt == "json":
        json_data = export_scan_as_json(scan_record, int_rec, recon_data)
        content_bytes = json.dumps(json_data, indent=2).encode("utf-8")
        return Response(
            content=content_bytes,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_scan_id}_report.json"'
            },
        )
    elif fmt == "csv":
        csv_str = export_scan_as_csv(scan_record, int_rec)
        return Response(
            content=csv_str.encode("utf-8"),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_scan_id}_report.csv"'
            },
        )
    elif fmt == "pdf":
        pdf_bytes = export_scan_as_pdf(scan_record, int_rec, recon_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_scan_id}_report.pdf"'
            },
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported report format '{format}'. Supported formats are: pdf, csv, json.",
        )

