"""Security Audit Reports API routes."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_types import ReportRequest, ReportResponse, UserContext

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    delete_report_for_user,
    get_report_by_id,
    get_reports_for_user,
)
from neurocraft_api.reports import ReportGenerator

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])
report_generator = ReportGenerator()


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a consolidated security audit report",
)
async def create_report(
    req: ReportRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> ReportResponse:
    """Generate a multi-engine security report synthesizing Scans, Recon, and Quantum simulations."""
    user_id = user.user_id if user else None
    return await report_generator.generate(req, user_id=user_id)


@router.get(
    "",
    summary="List security reports",
)
async def list_reports(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent security reports."""
    user_id = user.user_id if user else None
    records = await get_reports_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Retrieve report by ID",
)
async def get_report(
    report_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ReportResponse:
    """Retrieve full consolidated security report."""
    user_id = user.user_id if user else None
    rec = await get_report_by_id(report_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found or access denied.",
        )

    return ReportResponse(
        id=rec.id,
        user_id=rec.user_id,
        scan_id=rec.scan_id,
        recon_id=rec.recon_id,
        quantum_id=rec.quantum_id,
        report_type=rec.report_type,
        title=rec.title,
        summary=rec.summary,
        content=json.loads(rec.content_json) if rec.content_json else {},
        created_at=rec.created_at,
    )


@router.delete(
    "/{report_id}",
    summary="Delete a report by ID",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_report(
    report_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> None:
    """Delete a security report record."""
    user_id = user.user_id if user else None
    deleted = await delete_report_for_user(report_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found or access denied.",
        )
