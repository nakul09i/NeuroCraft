"""Passive Defensive Reconnaissance API routes."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_recon import ReconEngine
from neurocraft_types import ReconScanRequest, ReconScanResponse, UserContext

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    delete_recon_scan_for_user,
    get_recon_scan_by_id,
    get_recon_scans_for_user,
    save_recon_scan,
)

router = APIRouter(prefix="/api/v1/recon", tags=["Reconnaissance"])
recon_engine = ReconEngine()


@router.post(
    "",
    response_model=ReconScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute defensive passive reconnaissance on a domain",
)
async def create_recon_scan(
    req: ReconScanRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> ReconScanResponse:
    """Perform passive DNS, TLS, and HTTP security header analysis on target."""
    if not req.target or len(req.target.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid domain or hostname target is required.",
        )

    user_id = user.user_id if user else None
    recon_res = await recon_engine.scan_target(req.target, user_id=user_id)
    await save_recon_scan(recon_res, user_id=user_id)
    return recon_res


@router.get(
    "",
    summary="List reconnaissance scans",
)
async def list_recon_scans(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent reconnaissance scans for authenticated user."""
    user_id = user.user_id if user else None
    records = await get_recon_scans_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "target": r.target,
            "status": r.status,
            "exposure_score": r.exposure_score,
            "exposure_level": r.exposure_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/{recon_id}",
    response_model=ReconScanResponse,
    summary="Retrieve reconnaissance scan report by ID",
)
async def get_recon_scan(
    recon_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ReconScanResponse:
    """Retrieve full reconnaissance scan results."""
    user_id = user.user_id if user else None
    rec = await get_recon_scan_by_id(recon_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon scan '{recon_id}' not found or access denied.",
        )

    dns_list = json.loads(rec.dns_json) if rec.dns_json else []
    tls_dict = json.loads(rec.tls_json) if rec.tls_json else None
    headers_dict = json.loads(rec.headers_json) if rec.headers_json else None

    return ReconScanResponse(
        id=rec.id,
        user_id=rec.user_id,
        target=rec.target,
        status=rec.status,
        exposure_score=rec.exposure_score,
        exposure_level=rec.exposure_level,
        dns_records=dns_list,
        tls_info=tls_dict,
        security_headers=headers_dict,
        assets=[
            {
                "id": a.asset_id,
                "hostname": a.hostname,
                "asset_type": a.asset_type,
                "source": a.source,
                "status": a.status,
                "metadata": json.loads(a.metadata_json) if a.metadata_json else {},
            }
            for a in rec.assets
        ],
        findings=[
            {
                "id": f.finding_id,
                "category": f.category,
                "title": f.title,
                "severity": f.severity,
                "confidence": f.confidence,
                "evidence": json.loads(f.evidence_json) if f.evidence_json else {},
                "recommendation": f.recommendation,
            }
            for f in rec.findings
        ],
        created_at=rec.created_at,
        completed_at=rec.completed_at,
    )


@router.delete(
    "/{recon_id}",
    summary="Delete a recon scan by ID",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_recon(
    recon_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> None:
    """Delete a reconnaissance scan and cascaded assets/findings."""
    user_id = user.user_id if user else None
    deleted = await delete_recon_scan_for_user(recon_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon scan '{recon_id}' not found or access denied.",
        )
