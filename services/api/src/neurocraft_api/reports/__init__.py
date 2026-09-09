"""Consolidated security report generation and export package.

Synthesizes static file analysis, digital signature verification, passive reconnaissance,
and quantum trust simulations into an explainable, audit-ready security report.
Provides multi-format export capabilities:
- PDF (Zero-dependency vector layout)
- CSV (RFC 4180 spreadsheet table)
- JSON (Sanitized structural payload)
"""

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from neurocraft_logging import get_logger
from neurocraft_types import (
    ReportRequest,
    ReportResponse,
)

from neurocraft_api.database import (
    get_quantum_simulation_by_id,
    get_recon_scan_by_id,
    get_scan_by_id_and_user,
    save_report,
)
from neurocraft_api.reports.csv_exporter import export_scan_as_csv
from neurocraft_api.reports.json_exporter import export_scan_as_json
from neurocraft_api.reports.pdf_builder import export_scan_as_pdf, generate_report_pdf

logger = get_logger("neurocraft.reports")


class ReportGenerator:
    """Consolidated audit report builder."""

    async def generate(self, req: ReportRequest, user_id: str | None = None) -> ReportResponse:
        """Synthesize multi-engine report based on requested artifact IDs."""
        report_id = f"rep-{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC)

        scan_data: dict[str, Any] | None = None
        recon_data: dict[str, Any] | None = None
        quantum_data: dict[str, Any] | None = None

        title = f"NeuroCraft {req.report_type.value.capitalize()} Security Assessment"
        summary_points: list[str] = []

        # 1. Fetch File Scan Data
        if req.scan_id:
            scan_rec = await get_scan_by_id_and_user(req.scan_id, user_id)
            if not scan_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Scan ID {req.scan_id} not found or access denied.",
                )
            scan_data = {
                "scan_id": scan_rec.scan_id,
                "filename": scan_rec.filename,
                "sha256": scan_rec.sha256,
                "file_type": scan_rec.file_type,
                "risk_score": scan_rec.risk_score,
                "risk_level": scan_rec.risk_level,
                "scanned_at": scan_rec.created_at.isoformat() if scan_rec.created_at else None,
            }
            try:
                raw_json = json.loads(scan_rec.raw_result_json)
                scan_data["findings"] = raw_json.get("findings", [])
                scan_data["capabilities"] = raw_json.get("capabilities", [])
                scan_data["signature_info"] = raw_json.get("signature_info")
            except Exception:
                scan_data["findings"] = []
                scan_data["capabilities"] = []

            summary_points.append(
                f"File '{scan_rec.filename}' analyzed: {scan_rec.risk_level} risk posture (score: {scan_rec.risk_score}/100)."
            )

        # 2. Fetch Recon Data
        if req.recon_id:
            recon_rec = await get_recon_scan_by_id(req.recon_id, user_id)
            if not recon_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Recon ID {req.recon_id} not found or access denied.",
                )
            recon_data = {
                "id": recon_rec.id,
                "target": recon_rec.target,
                "exposure_score": recon_rec.exposure_score,
                "exposure_level": recon_rec.exposure_level,
                "dns": json.loads(recon_rec.dns_json) if recon_rec.dns_json else [],
                "tls": json.loads(recon_rec.tls_json) if recon_rec.tls_json else {},
                "headers": json.loads(recon_rec.headers_json) if recon_rec.headers_json else {},
            }
            summary_points.append(
                f"Target '{recon_rec.target}' scanned: {recon_rec.exposure_level} exposure (score: {recon_rec.exposure_score}/100)."
            )

        # 3. Fetch Quantum Simulation Data
        if req.quantum_id:
            q_rec = await get_quantum_simulation_by_id(req.quantum_id, user_id)
            if not q_rec:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Quantum simulation ID {req.quantum_id} not found or access denied.",
                )
            quantum_data = {
                "id": q_rec.id,
                "scenario": q_rec.scenario,
                "environment_badge": "SIMULATED QUANTUM ENVIRONMENT",
                "deviation": q_rec.deviation,
                "threshold": q_rec.threshold,
                "verdict": q_rec.verdict,
                "explanation": q_rec.explanation,
                "expected_distribution": (
                    json.loads(q_rec.expected_distribution_json)
                    if q_rec.expected_distribution_json
                    else {}
                ),
                "observed_distribution": (
                    json.loads(q_rec.observed_distribution_json)
                    if q_rec.observed_distribution_json
                    else {}
                ),
            }
            summary_points.append(
                f"Quantum Trust Simulation [{q_rec.scenario}]: Verdict '{q_rec.verdict}' (deviation: {q_rec.deviation:.4f}, threshold: {q_rec.threshold:.4f})."
            )

        if not summary_points:
            summary = "Consolidated audit report with no specific scan entities specified."
        else:
            summary = " ".join(summary_points)

        # 4. Construct Content Sections (Mandatory Evidence/Inference/Simulation Separation)
        content: dict[str, Any] = {
            "meta": {
                "report_id": report_id,
                "generated_at": now.isoformat(),
                "report_type": req.report_type.value,
                "generator": "NeuroCraft Multi-Engine Evidence Synthesizer v0.1.0",
            },
            "executive_summary": summary,
            "observed_evidence": {
                "file_analysis": scan_data,
                "passive_reconnaissance": recon_data,
            },
            "analytical_inferences": {
                "capabilities": scan_data.get("capabilities", []) if scan_data else [],
                "signature_evaluation": scan_data.get("signature_info") if scan_data else None,
            },
            "quantum_simulation_audit": {
                "disclaimer": "The following results reflect a controlled mathematical simulation of an entangled quantum channel.",
                "data": quantum_data,
            },
            "recommendations": self._generate_recommendations(scan_data, recon_data, quantum_data),
            "methodology_and_disclaimers": {
                "zero_execution_mandate": "NeuroCraft never executes uploaded binary code or untrusted script payloads.",
                "evidence_separation": "Observed structural evidence is strictly distinguished from probabilistic inference.",
                "quantum_simulation_declaration": "Quantum Trust results are generated by reproducible statevector simulation, not quantum hardware.",
            },
        }

        report_response = ReportResponse(
            id=report_id,
            user_id=user_id,
            scan_id=req.scan_id,
            recon_id=req.recon_id,
            quantum_id=req.quantum_id,
            report_type=req.report_type,
            title=title,
            summary=summary,
            content=content,
            created_at=now,
        )

        # Persist to database
        await save_report(report_response, user_id=user_id)
        return report_response

    def _generate_recommendations(
        self,
        scan_data: dict[str, Any] | None,
        recon_data: dict[str, Any] | None,
        quantum_data: dict[str, Any] | None,
    ) -> list[str]:
        """Synthesize actionable remediation guidance."""
        recs: list[str] = []

        if scan_data:
            sig = scan_data.get("signature_info")
            if sig and not sig.get("is_signed"):
                recs.append("Sign software releases with a trusted code-signing certificate to establish non-repudiation.")
            elif sig and sig.get("status") == "SELF_SIGNED":
                recs.append("Replace self-signed Authenticode certificates with a commercial certificate authority.")

            if scan_data.get("risk_score", 0.0) > 40.0:
                recs.append("Quarantine this executable and conduct static disassembly review of suspicious API calls.")

        if recon_data:
            hdrs = recon_data.get("headers", {})
            if not hdrs.get("hsts"):
                recs.append("Deploy HTTP Strict Transport Security (HSTS) with max-age >= 31536000.")
            if not hdrs.get("csp"):
                recs.append("Configure a Content Security Policy (CSP) to prevent cross-site scripting.")

        if quantum_data:
            if quantum_data.get("verdict") == "ATTACK DETECTED":
                recs.append("Quantum channel integrity failure detected: Re-key the optical channel and check for eavesdropping.")

        if not recs:
            recs.append("Continue regular security monitoring and cryptographic key rotation.")

        return recs


__all__ = [
    "ReportGenerator",
    "export_scan_as_csv",
    "export_scan_as_json",
    "export_scan_as_pdf",
    "generate_report_pdf",
]
