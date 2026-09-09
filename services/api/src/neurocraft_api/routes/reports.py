"""Security Audit Reports API routes."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from neurocraft_types import ReportRequest, ReportResponse, UserContext

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    delete_report_for_user,
    get_report_by_id,
    get_reports_for_user,
)
from neurocraft_api.reports import (
    ReportGenerator,
    export_scan_as_csv,
    export_scan_as_json,
    export_scan_as_pdf,
)
from neurocraft_api.repositories.scan_repo import ScanRepository

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])
report_generator = ReportGenerator()
scan_repo = ScanRepository()


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


@router.get(
    "/{report_id}/export",
    summary="Export consolidated security report as PDF, CSV, or JSON",
)
async def export_consolidated_report(
    report_id: str,
    format: str = "pdf",
    user: UserContext | None = Depends(get_optional_user),
) -> Response:
    """
    Download a security report in PDF, CSV, or JSON format.
    Enforces user isolation: only the owner can export their reports.
    """
    user_id = user.user_id if user else None
    rec = await get_report_by_id(report_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found or access denied.",
        )

    safe_report_id = "".join(c for c in report_id if c.isalnum() or c in ("-", "_"))[:32]
    fmt = format.lower().strip()

    # If linked to a scan_id, use scan exporter for rich forensic details
    if rec.scan_id:
        scan_rec = await scan_repo.get_scan_by_id(rec.scan_id, user_id)
        if scan_rec:
            int_rec = await scan_repo.get_file_integrity(rec.scan_id, user_id)
            recon_data = await scan_repo.get_scan_recon(rec.scan_id, user_id)

            if fmt == "json":
                data = export_scan_as_json(scan_rec, int_rec, recon_data)
                return Response(
                    content=json.dumps(data, indent=2).encode("utf-8"),
                    media_type="application/json",
                    headers={
                        "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.json"'
                    },
                )
            elif fmt == "csv":
                csv_data = export_scan_as_csv(scan_rec, int_rec)
                return Response(
                    content=csv_data.encode("utf-8"),
                    media_type="text/csv; charset=utf-8",
                    headers={
                        "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.csv"'
                    },
                )
            elif fmt == "pdf":
                pdf_bytes = export_scan_as_pdf(scan_rec, int_rec, recon_data)
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.pdf"'
                    },
                )

    # Fallback / standalone consolidated report export
    raw_content = json.loads(rec.content_json) if rec.content_json else {}
    if fmt == "json":
        full_json = {
            "id": rec.id,
            "report_id": rec.id,
            "title": rec.title,
            "report_type": rec.report_type,
            "summary": rec.summary,
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
            "content": raw_content,
        }
        return Response(
            content=json.dumps(full_json, indent=2).encode("utf-8"),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.json"'
            },
        )
    elif fmt == "csv":
        import csv
        import io
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["report_id", "title", "report_type", "summary", "created_at"])
        w.writerow([
            rec.id,
            rec.title,
            rec.report_type,
            rec.summary,
            rec.created_at.isoformat() if rec.created_at else "",
        ])
        return Response(
            content=buf.getvalue().encode("utf-8"),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.csv"'
            },
        )
    elif fmt == "pdf":
        from neurocraft_api.reports.pdf_builder import PdfStreamBuilder
        pdf = PdfStreamBuilder()
        pdf.new_page(title_suffix=rec.title)
        pdf.add_section_header(1, "Executive Summary")
        pdf.add_paragraph(rec.summary or "Security assessment completed.", size=9.0)
        pdf.add_section_header(2, "Report Scope & Details")
        pdf.add_key_value("Report ID:", rec.id)
        pdf.add_key_value("Type:", rec.report_type)
        if rec.created_at:
            pdf.add_key_value("Generated At:", rec.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"))
        return Response(
            content=pdf.build_pdf_bytes(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="neurocraft_{safe_report_id}_report.pdf"'
            },
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{format}'. Supported formats: pdf, csv, json.",
        )

