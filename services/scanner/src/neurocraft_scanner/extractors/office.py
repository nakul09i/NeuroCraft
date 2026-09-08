"""Safe static Office document analysis extractor (OOXML & OLE)."""

import zipfile
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

VBA_OOXML_PATTERNS = [
    "vbaProject.bin",
    "word/vbaProject.bin",
    "xl/vbaProject.bin",
    "ppt/vbaProject.bin",
]
OLE_MACRO_INDICATORS = [
    b"_VBA_PROJECT",
    b"VBA",
    b"Attribut",
    b"AutoOpen",
    b"Document_Open",
    b"AutoExec",
]


def extract_office_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect Microsoft Office documents for VBA macros and external OLE relationships.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {}

    has_macros = False
    has_external_links = False
    embedded_objects: list[str] = []

    # Case A: Modern OpenXML (ZIP-based .docx, .docm, .xlsx, .xlsm)
    if zipfile.is_zipfile(file_path):
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                namelist = zf.namelist()
                for vba_target in VBA_OOXML_PATTERNS:
                    if vba_target in namelist:
                        has_macros = True
                        break

                for name in namelist:
                    if "embeddings/" in name or "oleObject" in name:
                        embedded_objects.append(name)
                    if name.endswith(".rels"):
                        try:
                            data = zf.read(name)
                            if b'TargetMode="External"' in data:
                                has_external_links = True
                        except Exception:
                            pass
        except Exception as e:
            features["zip_error"] = str(e)

    # Case B: Legacy OLE Compound Document (.doc, .xls, .ppt)
    else:
        try:
            content = file_path.read_bytes()
            if any(ind in content for ind in OLE_MACRO_INDICATORS):
                has_macros = True
            if b'TargetMode="External"' in content or b"mhtml:" in content:
                has_external_links = True
        except Exception as e:
            features["ole_error"] = str(e)

    features["has_macros"] = has_macros
    features["has_external_links"] = has_external_links
    features["embedded_objects_count"] = len(embedded_objects)

    # Findings Generation
    if has_macros:
        findings.append(
            Finding(
                id="FIND-OFFICE-001",
                category="ACTIVE_CONTENT",
                title="VBA Macro Code Detected in Office Document",
                description="Document contains Visual Basic for Applications (VBA) macro streams. Malicious documents commonly use macros as delivery droppers.",
                severity=SeverityEnum.HIGH,
                confidence=ConfidenceEnum.HIGH,
                evidence={"has_macros": True},
                source_engine="office_extractor",
                recommendation="Do not enable macros or bypass Office protected view for this document.",
            )
        )

    if has_external_links:
        findings.append(
            Finding(
                id="FIND-OFFICE-002",
                category="EXTERNAL_REFERENCE",
                title="External Template Injection / Remote Target Relationship",
                description="Document relationships include external target links, a technique frequently used in remote template injection attacks.",
                severity=SeverityEnum.MEDIUM,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"has_external_links": True},
                source_engine="office_extractor",
                recommendation="Verify whether external relationship templates are authorized.",
            )
        )

    if embedded_objects:
        findings.append(
            Finding(
                id="FIND-OFFICE-003",
                category="EMBEDDED_OBJECT",
                title="Embedded OLE Objects Inside Office Document",
                description=f"Document contains {len(embedded_objects)} embedded OLE objects or binary packages.",
                severity=SeverityEnum.MEDIUM,
                confidence=ConfidenceEnum.HIGH,
                evidence={"embedded_objects": embedded_objects[:10]},
                source_engine="office_extractor",
                recommendation="Extract and scan embedded package streams independently.",
            )
        )

    return features, findings
