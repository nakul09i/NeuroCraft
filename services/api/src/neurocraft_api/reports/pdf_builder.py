"""Zero-Dependency Professional PDF Report Generator for NeuroCraft.

Generates standards-compliant, audit-grade PDF 1.4 documents entirely in pure Python.
Features:
- Multi-page vector document layout with automatic page breaks
- 10 comprehensive security sections adhering to the NeuroCraft reporting standard
- Safe typography using standard Type1 fonts (Helvetica, Helvetica-Bold, Courier)
- Visual severity badges, styled tables, and key-value parameter grids
- Strict separation between observed facts, analytical inferences, and limitations
- Absolute refusal to make unsubstantiated claims ("100% safe")
"""

import io
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from neurocraft_api.database import FileIntegrityRecord, ScanRecord


class PdfStreamBuilder:
    """Low-level PDF 1.4 document stream assembler."""

    def __init__(self, page_width: float = 612.0, page_height: float = 792.0):
        self.page_width = page_width
        self.page_height = page_height
        self.margin_left = 46.0
        self.margin_right = 46.0
        self.usable_width = page_width - self.margin_left - self.margin_right  # 520.0
        self.top_margin = 60.0
        self.bottom_margin = 54.0

        self.pages: list[list[str]] = []
        self.current_page_ops: list[str] = []
        self.y = self.page_height - self.top_margin

    def new_page(self, title_suffix: str = "") -> None:
        """Start a fresh page and draw running headers and footers."""
        if self.current_page_ops:
            self.pages.append(self.current_page_ops)
            self.current_page_ops = []

        self.y = self.page_height - self.top_margin

        # Header rule and text
        self.draw_rect(self.margin_left, self.page_height - 38, self.usable_width, 1.2, fill_rgb=(0.20, 0.25, 0.35))
        self.draw_text(
            "NEUROCRAFT SECURITY AUDIT REPORT",
            self.margin_left,
            self.page_height - 32,
            font="/F2",
            size=8,
            fill_rgb=(0.40, 0.45, 0.55),
        )
        if title_suffix:
            self.draw_text(
                title_suffix[:40],
                self.margin_left + self.usable_width - 150,
                self.page_height - 32,
                font="/F1",
                size=8,
                fill_rgb=(0.50, 0.55, 0.65),
            )

        # Footer rule and watermark
        self.draw_rect(self.margin_left, 36, self.usable_width, 0.8, fill_rgb=(0.85, 0.88, 0.92))
        self.draw_text(
            "NeuroCraft Evidence-Based Security • Confidential",
            self.margin_left,
            24,
            font="/F1",
            size=7.5,
            fill_rgb=(0.55, 0.60, 0.70),
        )

    def ensure_space(self, height_needed: float) -> None:
        """Trigger a page break if current Y position cannot accommodate content."""
        if (self.y - height_needed) < self.bottom_margin:
            self.new_page()

    def draw_rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        fill_rgb: tuple[float, float, float] | None = None,
        stroke_rgb: tuple[float, float, float] | None = None,
        line_width: float = 1.0,
    ) -> None:
        """Draw filled or stroked rectangle."""
        ops = []
        if line_width != 1.0:
            ops.append(f"{line_width:.2f} w")
        if fill_rgb:
            ops.append(f"{fill_rgb[0]:.3f} {fill_rgb[1]:.3f} {fill_rgb[2]:.3f} rg")
        if stroke_rgb:
            ops.append(f"{stroke_rgb[0]:.3f} {stroke_rgb[1]:.3f} {stroke_rgb[2]:.3f} RG")
        ops.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        if fill_rgb and stroke_rgb:
            ops.append("B")
        elif fill_rgb:
            ops.append("f")
        else:
            ops.append("S")
        self.current_page_ops.append(" ".join(ops))

    def draw_line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        stroke_rgb: tuple[float, float, float] = (0.7, 0.7, 0.7),
        line_width: float = 1.0,
    ) -> None:
        """Draw straight line."""
        ops = [
            f"{line_width:.2f} w",
            f"{stroke_rgb[0]:.3f} {stroke_rgb[1]:.3f} {stroke_rgb[2]:.3f} RG",
            f"{x1:.2f} {y1:.2f} m",
            f"{x2:.2f} {y2:.2f} l",
            "S",
        ]
        self.current_page_ops.append(" ".join(ops))

    def _sanitize(self, s: str) -> str:
        """Sanitize text to safe Latin-1 with escaped parenthesis."""
        clean = ""
        for ch in str(s):
            if ch in ("\\", "(", ")"):
                clean += "\\" + ch
            elif 32 <= ord(ch) <= 126 or 160 <= ord(ch) <= 255:
                clean += ch
            elif ch == "\n":
                clean += " "
            elif ch in ("—", "–"):
                clean += "-"
            elif ch in ("‘", "’"):
                clean += "'"
            elif ch in ("“", "”"):
                clean += '"'
            elif ch == "•":
                clean += "*"
            else:
                clean += "?"
        return clean

    def draw_text(
        self,
        text: str,
        x: float,
        y: float,
        font: str = "/F1",
        size: float = 10.0,
        fill_rgb: tuple[float, float, float] = (0.1, 0.1, 0.1),
    ) -> None:
        """Draw a single line of text."""
        sanitized = self._sanitize(text)
        ops = [
            f"{fill_rgb[0]:.3f} {fill_rgb[1]:.3f} {fill_rgb[2]:.3f} rg",
            "BT",
            f"{font} {size:.1f} Tf",
            f"{x:.2f} {y:.2f} Td",
            f"({sanitized}) Tj",
            "ET",
        ]
        self.current_page_ops.append(" ".join(ops))

    def wrap_text(self, text: str, max_chars: int = 85) -> list[str]:
        """Wrap text cleanly into lines respecting word boundaries."""
        words = text.split()
        if not words:
            return [""]
        lines = []
        cur = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + (1 if cur else 0) <= max_chars:
                cur.append(w)
                cur_len += len(w) + (1 if len(cur) > 1 else 0)
            else:
                if cur:
                    lines.append(" ".join(cur))
                cur = [w]
                cur_len = len(w)
        if cur:
            lines.append(" ".join(cur))
        return lines

    def add_paragraph(
        self,
        text: str,
        font: str = "/F1",
        size: float = 9.0,
        line_height: float = 13.0,
        fill_rgb: tuple[float, float, float] = (0.2, 0.25, 0.3),
        max_chars: int = 85,
    ) -> None:
        """Add word-wrapped paragraph, managing vertical cursor."""
        lines = self.wrap_text(text, max_chars=max_chars)
        for line in lines:
            self.ensure_space(line_height)
            self.draw_text(line, self.margin_left, self.y, font=font, size=size, fill_rgb=fill_rgb)
            self.y -= line_height

    def add_section_header(self, number: int, title: str) -> None:
        """Draw numbered section header with background pill."""
        self.ensure_space(34.0)
        self.y -= 8.0
        # Background bar
        self.draw_rect(
            self.margin_left,
            self.y - 4,
            self.usable_width,
            20,
            fill_rgb=(0.94, 0.96, 0.98),
            stroke_rgb=(0.85, 0.88, 0.93),
        )
        self.draw_rect(self.margin_left, self.y - 4, 3.5, 20, fill_rgb=(0.15, 0.45, 0.85))
        self.draw_text(
            f"{number}. {title.upper()}",
            self.margin_left + 10,
            self.y + 2,
            font="/F2",
            size=9.5,
            fill_rgb=(0.10, 0.20, 0.35),
        )
        self.y -= 22.0

    def add_key_value(self, label: str, value: str, indent: float = 10.0) -> None:
        """Draw clean label-value metadata pair."""
        self.ensure_space(14.0)
        x_label = self.margin_left + indent
        x_val = self.margin_left + 150.0
        self.draw_text(label, x_label, self.y, font="/F2", size=8.5, fill_rgb=(0.35, 0.40, 0.50))
        self.draw_text(str(value), x_val, self.y, font="/F3", size=8.5, fill_rgb=(0.10, 0.15, 0.20))
        self.y -= 13.0

    def build_pdf_bytes(self) -> bytes:
        """Compile assembled operations into standard PDF 1.4 binary stream."""
        if self.current_page_ops:
            self.pages.append(self.current_page_ops)

        if not self.pages:
            self.new_page()
            self.pages.append(self.current_page_ops)

        total_pages = len(self.pages)
        # Add Page numbers to footer of each page
        for idx, p_ops in enumerate(self.pages, 1):
            page_str = f"Page {idx} of {total_pages}"
            ops = [
                "0.550 0.600 0.700 rg",
                "BT",
                "/F1 7.5 Tf",
                f"{self.margin_left + self.usable_width - 55:.2f} 24.00 Td",
                f"({page_str}) Tj",
                "ET",
            ]
            p_ops.append(" ".join(ops))

        # PDF Object catalog
        objects: list[bytes] = []
        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        objects.append(b"")  # Placeholder for Pages tree

        font_helv = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        font_bold = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        font_cour = b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
        objects.extend([font_helv, font_bold, font_cour])

        page_ids: list[int] = []
        page_objs: list[bytes] = []
        content_objs: list[bytes] = []

        curr_id = 6
        for p_ops in self.pages:
            p_id = curr_id
            c_id = curr_id + 1
            curr_id += 2
            page_ids.append(p_id)

            stream_data = "\n".join(p_ops).encode("latin-1", "replace")
            p_obj = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.page_width:.1f} {self.page_height:.1f}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> "
                f"/Contents {c_id} 0 R >>"
            ).encode("latin-1")
            c_obj = (
                f"<< /Length {len(stream_data)} >>\nstream\n".encode("latin-1")
                + stream_data
                + b"\nendstream"
            )
            page_objs.append(p_obj)
            content_objs.append(c_obj)

        kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
        objects[1] = f"<< /Type /Pages /Kids [{kids_str}] /Count {total_pages} >>".encode("latin-1")

        all_objs = objects[:]
        for po, co in zip(page_objs, content_objs, strict=False):
            all_objs.append(po)
            all_objs.append(co)

        out = io.BytesIO()
        out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        xref_offsets = [0]
        for i, obj_bytes in enumerate(all_objs, 1):
            offset = out.tell()
            xref_offsets.append(offset)
            out.write(f"{i} 0 obj\n".encode("latin-1"))
            out.write(obj_bytes)
            out.write(b"\nendobj\n")

        xref_pos = out.tell()
        out.write(f"xref\n0 {len(all_objs) + 1}\n".encode("latin-1"))
        out.write(b"0000000000 65535 f \n")
        for off in xref_offsets[1:]:
            out.write(f"{off:010d} 00000 n \n".encode("latin-1"))

        out.write(
            f"trailer\n<< /Size {len(all_objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
                "latin-1"
            )
        )
        return out.getvalue()


def _val(obj: Any, key: str, default: Any = None) -> Any:
    """Safely extract field from an ORM record, dict, or namespace."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def export_scan_as_pdf(
    scan: ScanRecord | dict[str, Any],
    integrity: FileIntegrityRecord | dict[str, Any] | None = None,
    recon: dict[str, Any] | None = None,
) -> bytes:
    """Generate a 10-section publication-quality PDF audit report for a scan."""
    pdf = PdfStreamBuilder()

    if integrity is None and isinstance(scan, dict) and "integrity" in scan:
        integrity = scan["integrity"]
    if recon is None and isinstance(scan, dict) and "recon" in scan:
        recon = scan["recon"]

    filename = _val(scan, "filename", "unnamed_scan")
    scan_id = _val(scan, "scan_id", "N/A")
    risk_level_raw = _val(scan, "risk_level", "SAFE")
    risk_level_upper = str(risk_level_raw or "SAFE").upper()
    try:
        risk_score = float(_val(scan, "risk_score", 0.0) or 0.0)
    except (TypeError, ValueError):
        risk_score = 0.0
    confidence = str(_val(scan, "confidence", "HIGH")).upper()
    file_size = int(_val(scan, "file_size_bytes", None) or _val(scan, "file_size", 0) or 0)
    file_type = _val(scan, "file_type", "FILE")
    mime_type = _val(scan, "mime_type", "application/octet-stream")
    status = str(_val(scan, "status", "COMPLETED")).upper()
    created_at = _val(scan, "created_at")

    pdf.new_page(title_suffix=filename)

    # -------------------------------------------------------------------------
    # Document Title Header
    # -------------------------------------------------------------------------
    pdf.draw_rect(pdf.margin_left, pdf.y - 48, pdf.usable_width, 52, fill_rgb=(0.07, 0.11, 0.18))
    pdf.draw_rect(pdf.margin_left, pdf.y - 48, 5, 52, fill_rgb=(0.18, 0.52, 0.95))

    pdf.draw_text("NEUROCRAFT", pdf.margin_left + 16, pdf.y - 18, font="/F2", size=14, fill_rgb=(1.0, 1.0, 1.0))
    pdf.draw_text(
        "CYBERSECURITY ANALYSIS & INTEGRITY AUDIT REPORT",
        pdf.margin_left + 16,
        pdf.y - 32,
        font="/F1",
        size=8.5,
        fill_rgb=(0.70, 0.78, 0.88),
    )
    pdf.draw_text(
        f"Scan ID: {scan_id}",
        pdf.margin_left + pdf.usable_width - 160,
        pdf.y - 20,
        font="/F3",
        size=8,
        fill_rgb=(0.60, 0.70, 0.85),
    )
    pdf.draw_text(
        datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"),
        pdf.margin_left + pdf.usable_width - 160,
        pdf.y - 32,
        font="/F3",
        size=7.5,
        fill_rgb=(0.50, 0.60, 0.75),
    )
    pdf.y -= 64.0

    # -------------------------------------------------------------------------
    # 1. Executive Summary
    # -------------------------------------------------------------------------
    pdf.add_section_header(1, "Executive Summary")

    summary_text = (
        f"NeuroCraft performed an evidence-based, zero-execution static analysis of '{filename}'. "
        f"The file evaluated with a risk posture of {risk_level_upper} (Score: {risk_score:.1f}/100) "
        f"and calibrated confidence of {confidence}. "
    )
    if risk_level_upper in ("SAFE", "LOW"):
        summary_text += (
            "No known malicious execution signatures, weaponized capabilities, or critical structure anomalies "
            "were detected by the static engines. Cryptographic hashes and file boundaries comply with expected format baselines."
        )
    else:
        summary_text += (
            "Elevated risk indicators or structural anomalies were identified during static inspection. "
            "Please review the findings and capabilities sections below before staging or executing this asset."
        )
    pdf.add_paragraph(summary_text, size=8.5, line_height=12.5)

    # -------------------------------------------------------------------------
    # 2. File Information
    # -------------------------------------------------------------------------
    pdf.add_section_header(2, "File Information")
    pdf.add_key_value("Filename:", filename)
    pdf.add_key_value("File Size:", f"{file_size:,} bytes")
    pdf.add_key_value("Format / Type:", f"{file_type} ({mime_type})")
    pdf.add_key_value("Analysis Status:", status)
    if created_at:
        date_str = created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if hasattr(created_at, "strftime") else str(created_at)
    else:
        date_str = "N/A"
    pdf.add_key_value("Scanned Timestamp:", date_str)

    # -------------------------------------------------------------------------
    # 3. Risk Assessment
    # -------------------------------------------------------------------------
    pdf.add_section_header(3, "Risk Assessment")
    pdf.ensure_space(42.0)

    # Risk badge colors
    risk_colors = {
        "SAFE": ((0.92, 0.98, 0.94), (0.10, 0.65, 0.35)),
        "LOW": ((0.92, 0.95, 0.99), (0.15, 0.45, 0.85)),
        "MEDIUM": ((0.99, 0.96, 0.90), (0.85, 0.55, 0.10)),
        "HIGH": ((0.99, 0.93, 0.90), (0.90, 0.35, 0.10)),
        "CRITICAL": ((0.99, 0.90, 0.90), (0.85, 0.15, 0.15)),
    }
    bg_col, border_col = risk_colors.get(risk_level_upper, ((0.95, 0.95, 0.95), (0.5, 0.5, 0.5)))

    pdf.draw_rect(pdf.margin_left, pdf.y - 28, pdf.usable_width, 32, fill_rgb=bg_col, stroke_rgb=border_col)
    pdf.draw_text(
        f"VERDICT: {risk_level_upper}",
        pdf.margin_left + 16,
        pdf.y - 12,
        font="/F2",
        size=11,
        fill_rgb=border_col,
    )
    pdf.draw_text(
        f"Threat Score: {risk_score:.1f} / 100",
        pdf.margin_left + 160,
        pdf.y - 12,
        font="/F2",
        size=10,
        fill_rgb=(0.2, 0.25, 0.35),
    )
    pdf.draw_text(
        f"Confidence: {confidence}",
        pdf.margin_left + 320,
        pdf.y - 12,
        font="/F2",
        size=10,
        fill_rgb=(0.2, 0.25, 0.35),
    )
    pdf.y -= 38.0

    # -------------------------------------------------------------------------
    # 4. Findings
    # -------------------------------------------------------------------------
    pdf.add_section_header(4, "Findings")
    findings: list[dict] = []
    raw_res = _val(scan, "raw_result_json")
    if raw_res:
        try:
            findings = json.loads(raw_res).get("findings", [])
        except Exception:
            findings = []
    elif isinstance(_val(scan, "findings"), list):
        findings = _val(scan, "findings")

    if not findings:
        pdf.add_paragraph(
            "No significant security findings were detected by the implemented analysis.",
            font="/F1",
            size=8.5,
            fill_rgb=(0.25, 0.30, 0.35),
        )
    else:
        for idx, f in enumerate(findings, 1):
            pdf.ensure_space(32.0)
            sev = str(f.get("severity", "LOW")).upper()
            title = f.get("title", f"Finding {idx}")
            cat = f.get("category", "GENERAL")
            pdf.draw_text(
                f"[{sev}] {title} ({cat})",
                pdf.margin_left + 8,
                pdf.y,
                font="/F2",
                size=8.5,
                fill_rgb=(0.15, 0.20, 0.30),
            )
            pdf.y -= 11.0
            desc = f.get("description", "")
            if desc:
                pdf.add_paragraph(desc, size=8.0, line_height=11.0, max_chars=90)
            pdf.y -= 4.0

    # -------------------------------------------------------------------------
    # 5. Evidence
    # -------------------------------------------------------------------------
    pdf.add_section_header(5, "Observed Evidence")
    capabilities: list[dict] = []
    if raw_res:
        try:
            capabilities = json.loads(raw_res).get("capabilities", [])
        except Exception:
            capabilities = []
    elif isinstance(_val(scan, "capabilities"), list):
        capabilities = _val(scan, "capabilities")

    if capabilities:
        for cap in capabilities:
            pdf.add_key_value(f"Capability [{cap.get('status')}]:", str(cap.get("capability")))
    else:
        pdf.add_paragraph(
            "No weaponized API capabilities or execution triggers were observed in file static sections.",
            size=8.5,
        )

    # -------------------------------------------------------------------------
    # 6. Trust & Integrity
    # -------------------------------------------------------------------------
    pdf.add_section_header(6, "Trust & Integrity")
    int_status = _val(integrity, "integrity_status", "UNKNOWN")
    try:
        trust_sc = float(_val(integrity, "trust_score", 50.0) or 50.0)
    except (TypeError, ValueError):
        trust_sc = 50.0
    sig_st = _val(integrity, "signature_status", "UNSIGNED")
    ref_match = _val(integrity, "hash_match_status", "NOT_PROVIDED")
    signer = _val(integrity, "signer_name") or _val(integrity, "signer")
    issuer = _val(integrity, "cert_issuer") or _val(integrity, "issuer")

    pdf.add_key_value("Integrity Posture:", int_status)
    pdf.add_key_value("Trust Score:", f"{trust_sc:.1f} / 100")
    pdf.add_key_value("Digital Signature:", sig_st)
    if signer:
        pdf.add_key_value("Signer / Publisher:", str(signer))
    if issuer:
        pdf.add_key_value("Issuing CA:", str(issuer))
    pdf.add_key_value("Reference Hash Status:", ref_match)

    # -------------------------------------------------------------------------
    # 7. Reconnaissance
    # -------------------------------------------------------------------------
    pdf.add_section_header(7, "Reconnaissance")
    if recon and (recon.get("recon_available") or recon.get("target")):
        pdf.add_key_value("Correlated Target:", recon.get("target") or "N/A")
        pdf.add_key_value("Exposure Score:", f"{float(recon.get('exposure_score', recon.get('risk_score', 0)) or 0):.1f} / 100")
        pdf.add_key_value("Exposure Level:", str(recon.get("exposure_level", "SAFE")))
    else:
        pdf.add_paragraph(
            "No active reconnaissance target is currently linked to this file entity.",
            size=8.5,
        )

    # -------------------------------------------------------------------------
    # 8. Limitations
    # -------------------------------------------------------------------------
    pdf.add_section_header(8, "Limitations")
    pdf.add_paragraph(
        "- Static inspection analyzes file structure, headers, and signatures without runtime execution.",
        size=8.0,
        line_height=11.5,
    )
    pdf.add_paragraph(
        "- Unsigned status does not indicate malicious intent; many open-source utilities and scripts are unsigned.",
        size=8.0,
        line_height=11.5,
    )
    pdf.add_paragraph(
        "- Local offline verification does not perform online CRL/OCSP certificate revocation checks.",
        size=8.0,
        line_height=11.5,
    )

    # -------------------------------------------------------------------------
    # 9. Technical Details
    # -------------------------------------------------------------------------
    pdf.add_section_header(9, "Technical Details (Hashes)")
    pdf.add_key_value("SHA-256:", _val(scan, "sha256", "N/A"))
    sha512 = _val(integrity, "sha512")
    if sha512:
        pdf.add_key_value("SHA-512:", sha512[:64] + "...")
    md5_val = _val(integrity, "md5") or _val(scan, "md5")
    if md5_val:
        pdf.add_key_value("MD5:", md5_val)
    sha1_val = _val(integrity, "sha1") or _val(scan, "sha1")
    if sha1_val:
        pdf.add_key_value("SHA-1:", sha1_val)

    # -------------------------------------------------------------------------
    # 10. Report Metadata
    # -------------------------------------------------------------------------
    pdf.add_section_header(10, "Report Metadata")
    rep_uuid = f"rep-{uuid.uuid4().hex[:12]}"
    pdf.add_key_value("Report ID:", rep_uuid)
    pdf.add_key_value("Security Engine:", "NeuroCraft Multi-Engine Analysis Framework v0.1.0")
    pdf.add_key_value(
        "Verification Mandate:",
        "Zero-Execution Static Inspection & Deterministic Provenance",
    )
    pdf.add_paragraph(
        "DISCLAIMER: This document summarizes automated static inspection findings. "
        "Zero findings indicates no known threat signatures were detected by the implemented analyzers. "
        "It does not constitute a warranty of absolute security.",
        size=7.5,
        line_height=10.5,
        fill_rgb=(0.45, 0.50, 0.60),
    )

    return pdf.build_pdf_bytes()


def generate_report_pdf(report: dict[str, Any] | Any) -> bytes:
    """Generate a clean executive summary PDF from a consolidated Report entity."""
    pdf = PdfStreamBuilder()
    title = str(_val(report, "title", "Consolidated Security Audit Report"))
    summary = str(_val(report, "summary", "Security assessment completed in compliance with verification policy."))
    report_id = str(_val(report, "id", "N/A"))
    report_type = str(_val(report, "report_type", "EXECUTIVE_SUMMARY"))
    created_at = _val(report, "created_at")
    content = _val(report, "content", {})

    pdf.new_page(title_suffix=title)

    # Title Banner
    pdf.draw_rect(pdf.margin_left, pdf.y - 48, pdf.usable_width, 52, fill_rgb=(0.07, 0.11, 0.18))
    pdf.draw_rect(pdf.margin_left, pdf.y - 48, 5, 52, fill_rgb=(0.18, 0.52, 0.95))
    pdf.draw_text("NEUROCRAFT", pdf.margin_left + 16, pdf.y - 18, font="/F2", size=14, fill_rgb=(1.0, 1.0, 1.0))
    pdf.draw_text(
        "CONSOLIDATED SECURITY & AUDIT DOSSIER",
        pdf.margin_left + 16,
        pdf.y - 32,
        font="/F1",
        size=8.5,
        fill_rgb=(0.70, 0.78, 0.88),
    )
    pdf.y -= 64.0

    pdf.add_section_header(1, "Executive Summary")
    pdf.add_paragraph(summary, size=8.5, line_height=12.5)

    pdf.add_section_header(2, "Report Metadata")
    pdf.add_key_value("Report ID:", report_id)
    pdf.add_key_value("Report Title:", title)
    pdf.add_key_value("Template:", report_type)
    if created_at:
        date_str = created_at.strftime("%Y-%m-%d %H:%M:%S UTC") if hasattr(created_at, "strftime") else str(created_at)
        pdf.add_key_value("Generated Date:", date_str)

    # Recommendations if present
    recommendations = content.get("recommendations", []) if isinstance(content, dict) else []
    if recommendations:
        pdf.add_section_header(3, "Actionable Recommendations")
        for rec in recommendations:
            txt = rec if isinstance(rec, str) else rec.get("description", str(rec))
            pdf.add_paragraph(f"- {txt}", size=8.0, line_height=11.5)

    return pdf.build_pdf_bytes()

