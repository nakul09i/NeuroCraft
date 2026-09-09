"""Safe static image feature extraction and polyglot detection for NeuroCraft.

Inspects PNG, JPEG, GIF, and BMP structures out-of-process without executing or rendering bytes.
"""

import struct
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
PNG_IEND_CHUNK = b"IEND"
JPEG_SOI = b"\xff\xd8"
JPEG_EOI = b"\xff\xd9"
GIF87A = b"GIF87a"
GIF89A = b"GIF89a"
GIF_TRAILER = b"\x3b"
BMP_SIGNATURE = b"BM"

EXE_SIGNATURES = [
    (b"MZ", "Windows PE Executable"),
    (b"\x7fELF", "Linux ELF Executable"),
    (b"PK\x03\x04", "ZIP Archive / APK Container"),
    (b"<script", "Embedded Script Tag"),
    (b"<?php", "PHP Web Shell"),
]


def extract_image_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect image format headers, dimensions, and detect appended payloads (polyglots).
    Never executes, renders, or uses dynamically loaded graphical modules on untrusted files.
    """
    features: dict[str, Any] = {
        "format": "UNKNOWN",
        "dimensions": None,
        "trailing_payload_bytes": 0,
        "is_polyglot": False,
    }
    findings: list[Finding] = []

    try:
        data = file_path.read_bytes()
        file_len = len(data)

        # 1. PNG Inspection
        if data.startswith(PNG_SIGNATURE):
            features["format"] = "PNG"
            if len(data) >= 24:
                # IHDR width and height are at offset 16 and 20 (big-endian 32-bit uint)
                width, height = struct.unpack(">II", data[16:24])
                features["dimensions"] = {"width": width, "height": height}
                if len(data) >= 25:
                    features["bit_depth"] = data[24]
                if len(data) >= 26:
                    features["color_type"] = data[25]

            iend_pos = data.rfind(PNG_IEND_CHUNK)
            if iend_pos != -1:
                # IEND chunk has 4 bytes tag + 4 bytes CRC = 8 bytes
                expected_end = iend_pos + 4 + 4
                trailing_len = file_len - expected_end
                if trailing_len > 0:
                    features["trailing_payload_bytes"] = trailing_len
                    trailing_data = data[expected_end:]
                    for sig, desc in EXE_SIGNATURES:
                        if sig in trailing_data:
                            features["is_polyglot"] = True
                            findings.append(
                                Finding(
                                    id="FIND-IMG-001",
                                    category="POLYGLOT_PAYLOAD",
                                    title=f"Suspicious Appended Payload After PNG End ({desc})",
                                    description=(
                                        f"File contains {trailing_len} bytes appended after the legitimate "
                                        f"PNG IEND chunk matching signature: {desc}."
                                    ),
                                    severity=SeverityEnum.HIGH,
                                    confidence=ConfidenceEnum.HIGH,
                                    evidence={
                                        "format": "PNG",
                                        "trailing_bytes": trailing_len,
                                        "matched_signature": desc,
                                    },
                                    source_engine="image_extractor",
                                    recommendation="Inspect and strip hidden trailing payload before opening.",
                                )
                            )
                            break

        # 2. JPEG Inspection
        elif data.startswith(JPEG_SOI):
            features["format"] = "JPEG"
            eoi_pos = data.rfind(JPEG_EOI)
            if eoi_pos != -1:
                expected_end = eoi_pos + 2
                trailing_len = file_len - expected_end
                if trailing_len > 64:
                    features["trailing_payload_bytes"] = trailing_len
                    trailing_data = data[expected_end:]
                    for sig, desc in EXE_SIGNATURES:
                        if sig in trailing_data:
                            features["is_polyglot"] = True
                            findings.append(
                                Finding(
                                    id="FIND-IMG-002",
                                    category="POLYGLOT_PAYLOAD",
                                    title=f"Suspicious Appended Payload After JPEG EOI ({desc})",
                                    description=(
                                        f"File contains {trailing_len} bytes appended after the JPEG End-of-Image "
                                        f"marker matching signature: {desc}."
                                    ),
                                    severity=SeverityEnum.HIGH,
                                    confidence=ConfidenceEnum.HIGH,
                                    evidence={
                                        "format": "JPEG",
                                        "trailing_bytes": trailing_len,
                                        "matched_signature": desc,
                                    },
                                    source_engine="image_extractor",
                                    recommendation="Investigate embedded non-image payload in trailing space.",
                                )
                            )
                            break

        # 3. GIF Inspection
        elif data.startswith((GIF87A, GIF89A)):
            features["format"] = "GIF"
            if len(data) >= 10:
                width, height = struct.unpack("<HH", data[6:10])
                features["dimensions"] = {"width": width, "height": height}

        # 4. BMP Inspection
        elif data.startswith(BMP_SIGNATURE):
            features["format"] = "BMP"
            if len(data) >= 26:
                # DIB header starts at offset 14; width at 18, height at 22
                width, height = struct.unpack("<ii", data[18:26])
                features["dimensions"] = {"width": abs(width), "height": abs(height)}

    except Exception as exc:
        features["extractor_error"] = str(exc)
        findings.append(
            Finding(
                id="FIND-IMG-ERR-001",
                category="PARSER_FAULT",
                title="Image Header Parse Warning",
                description=f"Static image header inspection encountered a warning: {exc}",
                severity=SeverityEnum.LOW,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"error": str(exc)},
                source_engine="image_extractor",
            )
        )

    return features, findings
