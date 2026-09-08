"""Safe static PDF feature extraction and indicator analysis."""

import re
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

# PDF Structural and Behavioral Patterns
OBJ_PATTERN = re.compile(rb"\d+\s+\d+\s+obj")
STREAM_PATTERN = re.compile(rb"\bstream\b")
JS_PATTERNS = [re.compile(rb"/JavaScript", re.IGNORECASE), re.compile(rb"/JS\b", re.IGNORECASE)]
ACTION_PATTERNS = [
    re.compile(rb"/Launch\b", re.IGNORECASE),
    re.compile(rb"/OpenAction\b", re.IGNORECASE),
    re.compile(rb"/AA\b"),
]
EMBEDDED_PATTERNS = [
    re.compile(rb"/EmbeddedFiles\b", re.IGNORECASE),
    re.compile(rb"/Filespec\b", re.IGNORECASE),
]
URI_PATTERN = re.compile(rb"/URI\s*\(([^)]+)\)", re.IGNORECASE)
ENCRYPT_PATTERN = re.compile(rb"/Encrypt\b")


def extract_pdf_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect a PDF file for structural anomalies, embedded objects, and active scripts.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {}

    try:
        content = file_path.read_bytes()

        obj_count = len(OBJ_PATTERN.findall(content))
        stream_count = len(STREAM_PATTERN.findall(content))
        has_js = any(p.search(content) for p in JS_PATTERNS)
        has_launch = any(p.search(content) for p in ACTION_PATTERNS)
        has_embedded = any(p.search(content) for p in EMBEDDED_PATTERNS)
        has_encrypt = bool(ENCRYPT_PATTERN.search(content))
        uris = [m.decode("latin-1", errors="ignore") for m in URI_PATTERN.findall(content)]

        features["object_count"] = obj_count
        features["stream_count"] = stream_count
        features["has_javascript"] = has_js
        features["has_launch_or_open_action"] = has_launch
        features["has_embedded_files"] = has_embedded
        features["is_encrypted"] = has_encrypt
        features["extracted_uris"] = uris[:20]

        # Findings Generation
        if has_js:
            findings.append(
                Finding(
                    id="FIND-PDF-001",
                    category="ACTIVE_CONTENT",
                    title="Embedded JavaScript in PDF Document",
                    description="PDF contains /JavaScript or /JS objects. Malicious PDFs frequently use JavaScript to exploit PDF reader vulnerabilities.",
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"has_javascript": True},
                    source_engine="pdf_extractor",
                    recommendation="Do not open PDF in reader applications with active scripting enabled.",
                )
            )

        if has_launch:
            findings.append(
                Finding(
                    id="FIND-PDF-002",
                    category="EXECUTION",
                    title="Automatic Action or Launch Tag in PDF",
                    description="PDF specifies an /OpenAction, /Launch, or /AA directive to trigger actions or external programs upon document opening.",
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"has_launch_or_open_action": True},
                    source_engine="pdf_extractor",
                    recommendation="Inspect triggered action target before opening document.",
                )
            )

        if has_embedded:
            findings.append(
                Finding(
                    id="FIND-PDF-003",
                    category="EMBEDDED_PAYLOAD",
                    title="Embedded Files or Payloads Inside PDF",
                    description="PDF contains /EmbeddedFiles or /Filespec streams containing packaged secondary files.",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"has_embedded_files": True},
                    source_engine="pdf_extractor",
                    recommendation="Extract and scan embedded file streams independently.",
                )
            )

    except Exception as err:
        findings.append(
            Finding(
                id="FIND-PDF-ERR-001",
                category="MALFORMED_DOCUMENT",
                title="Error Parsing PDF Document Structure",
                description=f"PDF parsing error: {err}",
                severity=SeverityEnum.LOW,
                confidence=ConfidenceEnum.HIGH,
                evidence={"error": str(err)},
                source_engine="pdf_extractor",
                recommendation="Verify document integrity.",
            )
        )
        features["error"] = str(err)

    return features, findings
