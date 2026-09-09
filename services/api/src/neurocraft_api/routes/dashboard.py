"""Dashboard Metrics and Aggregations API route."""

from typing import Any

from fastapi import APIRouter, Depends
from neurocraft_types import UserContext

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    get_quantum_simulations_for_user,
    get_recon_scans_for_user,
    get_scans_for_user,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    summary="Retrieve aggregated metrics for dashboard",
)
async def get_dashboard_stats(
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Provide high-level cybersecurity overview metrics."""
    user_id = user.user_id if user else None
    scans = await get_scans_for_user(user_id=user_id, limit=100)
    recons = await get_recon_scans_for_user(user_id=user_id, limit=100)
    quants = await get_quantum_simulations_for_user(user_id=user_id, limit=100)

    high_risk_scans = sum(1 for s in scans if s.risk_score >= 60.0)
    avg_risk = round(sum(s.risk_score for s in scans) / len(scans), 1) if scans else 0.0

    return {
        "total_scans": len(scans),
        "critical_threats": high_risk_scans,
        "high_risk_findings": high_risk_scans,
        "average_risk_score": avg_risk,
        "average_exposure": avg_risk,
        "recon_targets": len(recons),
        "recon_scans_count": len(recons),
        "quantum_simulations": len(quants),
        "quantum_simulations_count": len(quants),
        "recent_scans": [
            {
                "scan_id": s.scan_id,
                "filename": s.filename,
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans[:5]
        ],
    }
