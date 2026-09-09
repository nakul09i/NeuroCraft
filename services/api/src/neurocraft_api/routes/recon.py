"""Passive Defensive Reconnaissance API routes."""

import json
import logging
import os
import socket
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_recon import ReconEngine, SSRFSecurityError
from neurocraft_types import (
    ConfidenceEnum,
    ReconScanRequest,
    ReconScanResponse,
    UserContext,
    VerdictLevel,
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    ReconScanRecord,
    delete_recon_scan_for_user,
    get_recon_scan_by_id,
    get_recon_scans_for_user,
    get_session_factory,
    save_recon_scan,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/recon", tags=["Reconnaissance"])
recon_engine = ReconEngine()


def _record_to_recon_response(
    rec: ReconScanRecord,
    cached: bool = False,
    extra_limitation: str | None = None,
) -> ReconScanResponse:
    """Helper to convert a persistent ReconScanRecord to a validated ReconScanResponse."""
    dns_list = json.loads(rec.dns_json) if rec.dns_json else []
    tls_raw = json.loads(rec.tls_json) if rec.tls_json else None
    tls_dict = tls_raw if (tls_raw and isinstance(tls_raw, dict) and tls_raw.get("subject")) else None

    hdrs_raw = json.loads(rec.headers_json) if rec.headers_json else None
    headers_dict = hdrs_raw if (hdrs_raw and isinstance(hdrs_raw, dict) and len(hdrs_raw) > 0) else None

    tech_list = json.loads(getattr(rec, "tech_json", "[]") or "[]")
    rdap_dict = json.loads(getattr(rec, "rdap_json", "{}") or "{}") or None
    if isinstance(rdap_dict, dict) and not rdap_dict:
        rdap_dict = None
    limitations_list = json.loads(getattr(rec, "limitations_json", "[]") or "[]")

    if extra_limitation and extra_limitation not in limitations_list:
        limitations_list.insert(0, extra_limitation)

    conf_str = getattr(rec, "confidence", "HIGH")
    try:
        conf_enum = ConfidenceEnum(conf_str)
    except ValueError:
        conf_enum = ConfidenceEnum.HIGH

    try:
        level_enum = VerdictLevel(rec.exposure_level)
    except ValueError:
        level_enum = VerdictLevel.SAFE

    return ReconScanResponse(
        id=rec.id,
        user_id=rec.user_id,
        target=rec.target,
        target_type=getattr(rec, "target_type", "DOMAIN"),
        authorization_confirmed=getattr(rec, "authorization_confirmed", True),
        status=rec.status,
        exposure_score=rec.exposure_score,
        exposure_level=level_enum,
        confidence=conf_enum,
        confidence_score=getattr(rec, "confidence_score", 0.90),
        dns_records=dns_list,
        tls_info=tls_dict,
        security_headers=headers_dict,
        technologies=tech_list,
        rdap_info=rdap_dict,
        limitations=limitations_list,
        cached=cached,
        assets=[
            {
                "id": a.asset_id,
                "hostname": a.hostname,
                "asset_type": a.asset_type,
                "source": a.source,
                "status": a.status,
                "metadata": json.loads(a.metadata_json) if a.metadata_json else {},
                "observed_at": a.observed_at or rec.created_at,
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
                "source": getattr(f, "source", "RECON"),
                "observed_at": getattr(f, "observed_at", rec.created_at) or rec.created_at,
            }
            for f in rec.findings
        ],
        created_at=rec.created_at,
        completed_at=rec.completed_at,
    )


async def get_latest_recon_scan_by_target(target: str, user_id: str | None = None) -> ReconScanRecord | None:
    """Find the most recent recon scan for a target in SQLite, respecting tenant boundaries."""
    clean_target = target.strip().lower()
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = (
            select(ReconScanRecord)
            .options(
                selectinload(ReconScanRecord.assets),
                selectinload(ReconScanRecord.findings),
            )
            .where(ReconScanRecord.target == clean_target)
        )
        if user_id is not None:
            stmt = stmt.where((ReconScanRecord.user_id == user_id) | (ReconScanRecord.user_id.is_(None)))
        else:
            stmt = stmt.where(ReconScanRecord.user_id.is_(None))
        stmt = stmt.order_by(ReconScanRecord.created_at.desc())
        res = await session.execute(stmt)
        return res.scalars().first()


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
    """Perform passive DNS, TLS, and HTTP security header analysis on target.

    Offline Safeguards:
    When offline, never fakes results. Returns cached record marked CACHED with observed_at timestamp,
    or returns 503 if no cached record exists.
    """
    if not req.target or len(req.target.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid domain or hostname target is required.",
        )

    if not req.authorization_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User authorization confirmation is required before reconnaissance.",
        )

    user_id = user.user_id if user else None
    clean_target = req.target.strip().lower()

    # 1. Check if offline mode is simulated or active
    if os.getenv("NEUROCRAFT_OFFLINE_MODE") == "1":
        cached_rec = await get_latest_recon_scan_by_target(clean_target, user_id=user_id)
        if cached_rec:
            observed_ts = cached_rec.created_at.isoformat() if cached_rec.created_at else "previously"
            return _record_to_recon_response(
                cached_rec,
                cached=True,
                extra_limitation=f"System offline: Returning cached reconnaissance scan observed at {observed_ts}.",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recon unavailable while offline. Passive reconnaissance requires active network connectivity and no cached results exist for this target.",
        )

    # 2. Attempt active passive scan
    try:
        recon_res = await recon_engine.scan_target(
            target=clean_target,
            user_id=user_id,
            authorization_confirmed=req.authorization_confirmed,
        )
    except SSRFSecurityError as ssrf_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target rejected by SSRF perimeter protection: {ssrf_err}",
        ) from ssrf_err
    except (TimeoutError, socket.gaierror, ConnectionError, OSError) as net_err:
        logger.warning(f"Recon network error for {clean_target}: {net_err}. Checking for cached scan.")
        cached_rec = await get_latest_recon_scan_by_target(clean_target, user_id=user_id)
        if cached_rec:
            observed_ts = cached_rec.created_at.isoformat() if cached_rec.created_at else "previously"
            return _record_to_recon_response(
                cached_rec,
                cached=True,
                extra_limitation=f"Network unreachable: Returning cached reconnaissance scan observed at {observed_ts}.",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recon unavailable while offline. Passive reconnaissance requires active network connectivity and no cached results exist for this target.",
        ) from net_err
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        ) from val_err

    # If scan completed but all modules failed due to network outage (0 assets, 0 DNS, no TLS, no HTTP)
    if (
        not recon_res.assets
        and not recon_res.dns_records
        and not recon_res.tls_info
        and not recon_res.security_headers
        and any("offline" in lim.lower() or "error" in lim.lower() for lim in recon_res.limitations)
    ):
        cached_rec = await get_latest_recon_scan_by_target(clean_target, user_id=user_id)
        if cached_rec:
            observed_ts = cached_rec.created_at.isoformat() if cached_rec.created_at else "previously"
            return _record_to_recon_response(
                cached_rec,
                cached=True,
                extra_limitation=f"Network unreachable: Returning cached reconnaissance scan observed at {observed_ts}.",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recon unavailable while offline. Passive reconnaissance requires active network connectivity and no cached results exist for this target.",
        )

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
            "target_type": getattr(r, "target_type", "DOMAIN"),
            "status": r.status,
            "exposure_score": r.exposure_score,
            "exposure_level": r.exposure_level,
            "confidence": getattr(r, "confidence", "HIGH"),
            "confidence_score": getattr(r, "confidence_score", 0.90),
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

    return _record_to_recon_response(rec, cached=False)


@router.get(
    "/{recon_id}/observations",
    summary="Retrieve structured observations (findings and assets) for a recon scan",
)
async def get_recon_observations(
    recon_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Retrieve structured observation list for a reconnaissance scan."""
    user_id = user.user_id if user else None
    rec = await get_recon_scan_by_id(recon_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon scan '{recon_id}' not found or access denied.",
        )

    return {
        "recon_id": rec.id,
        "target": rec.target,
        "target_type": getattr(rec, "target_type", "DOMAIN"),
        "status": rec.status,
        "exposure_score": rec.exposure_score,
        "exposure_level": rec.exposure_level,
        "observations": [
            {
                "id": f.finding_id,
                "category": f.category,
                "title": f.title,
                "severity": f.severity,
                "confidence": f.confidence,
                "evidence": json.loads(f.evidence_json) if f.evidence_json else {},
                "recommendation": f.recommendation,
                "source": getattr(f, "source", "RECON"),
                "observed_at": getattr(f, "observed_at", rec.created_at).isoformat()
                if getattr(f, "observed_at", None)
                else None,
            }
            for f in rec.findings
        ],
        "assets": [
            {
                "id": a.asset_id,
                "hostname": a.hostname,
                "asset_type": a.asset_type,
                "source": a.source,
                "status": a.status,
                "metadata": json.loads(a.metadata_json) if a.metadata_json else {},
                "observed_at": a.observed_at.isoformat() if a.observed_at else None,
            }
            for a in rec.assets
        ],
    }


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
