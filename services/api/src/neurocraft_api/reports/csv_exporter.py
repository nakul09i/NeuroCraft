"""CSV Report Exporter for NeuroCraft Scans.

Produces clean, spreadsheet-compatible CSV summaries of security findings and integrity metrics.
"""

import csv
import io
import json
from typing import Any

from neurocraft_api.database import FileIntegrityRecord, ScanRecord


def _val(obj: Any, key: str, default: Any = None) -> Any:
    """Safely extract field from an ORM record, dict, or namespace."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def export_scan_as_csv(
    scan: ScanRecord | dict[str, Any],
    integrity: FileIntegrityRecord | dict[str, Any] | None = None,
) -> str:
    """Generate RFC 4180 compliant CSV content for a scan record."""
    if integrity is None and isinstance(scan, dict) and "integrity" in scan:
        integrity = scan["integrity"]

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Standard column headers
    headers = [
        "Scan ID",
        "File Name",
        "SHA-256",
        "Risk Level",
        "Risk Score",
        "Confidence",
        "Finding ID",
        "Category",
        "Severity",
        "Title",
        "Description",
        "Integrity Status",
        "Signature Status",
    ]
    writer.writerow(headers)

    scan_id = _val(scan, "scan_id", "N/A")
    filename = _val(scan, "filename", "unnamed_file")
    sha256 = _val(scan, "sha256", "N/A")
    risk_level = str(_val(scan, "risk_level", "SAFE")).upper()
    try:
        risk_score = float(_val(scan, "risk_score", 0.0) or 0.0)
    except (TypeError, ValueError):
        risk_score = 0.0
    confidence = str(_val(scan, "confidence", "HIGH")).upper()

    integrity_status = _val(integrity, "integrity_status", "UNKNOWN")
    signature_status = _val(integrity, "signature_status", "UNSIGNED")

    # Parse findings from scan
    findings: list[dict] = []
    raw_res = _val(scan, "raw_result_json")
    if raw_res:
        try:
            raw = json.loads(raw_res)
            findings = raw.get("findings", [])
        except Exception:
            findings = []
    elif isinstance(_val(scan, "findings"), list):
        findings = _val(scan, "findings")

    if not findings:
        # Grounded default when zero findings were detected
        writer.writerow(
            [
                scan_id,
                filename,
                sha256,
                risk_level,
                f"{risk_score:.1f}",
                confidence,
                "NO-FINDINGS",
                "NONE",
                "INFORMATIONAL",
                "No Significant Findings",
                "No significant security findings were detected by the implemented analysis.",
                integrity_status,
                signature_status,
            ]
        )
    else:
        for idx, f in enumerate(findings, 1):
            finding_id = f.get("id") or f.get("finding_id") or f"FIND-{idx:03d}"
            cat = f.get("category", "GENERAL")
            sev = str(f.get("severity", "LOW")).upper()
            title = f.get("title", "")
            desc = f.get("description", "")
            writer.writerow(
                [
                    scan_id,
                    filename,
                    sha256,
                    risk_level,
                    f"{risk_score:.1f}",
                    confidence,
                    finding_id,
                    cat,
                    sev,
                    title,
                    desc,
                    integrity_status,
                    signature_status,
                ]
            )

    return output.getvalue()
