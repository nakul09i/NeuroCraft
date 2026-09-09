"""Safe static archive extractor for NeuroCraft.

Inspects ZIP container manifests out-of-process without uncompressing payloads to disk.
"""

import zipfile
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

SUSPICIOUS_ARCHIVE_EXTS = {".exe", ".dll", ".scr", ".bat", ".cmd", ".vbs", ".js", ".ps1", ".hta"}


def extract_archive_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect ZIP archive structure without extraction to disk.
    Detects directory traversal entries, zip bombs, and packaged executable payloads.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {
        "file_count": 0,
        "total_uncompressed_size": 0,
        "compression_ratio": 1.0,
        "is_encrypted": False,
        "contained_executables": [],
    }

    try:
        if not zipfile.is_zipfile(file_path):
            return features, findings

        with zipfile.ZipFile(file_path, "r") as zf:
            infolist = zf.infolist()
            features["file_count"] = len(infolist)

            total_compressed = 0
            total_uncompressed = 0
            traversal_files = []
            executables = []
            has_encrypted = False

            for info in infolist:
                total_compressed += info.compress_size
                total_uncompressed += info.file_size

                # Check encryption flag
                if info.flag_bits & 0x1:
                    has_encrypted = True

                # Check path traversal
                name = info.filename
                if ".." in name or name.startswith(("/", "\\")) or ":" in name:
                    traversal_files.append(name)

                # Check contained executable files
                ext = Path(name).suffix.lower()
                if ext in SUSPICIOUS_ARCHIVE_EXTS:
                    executables.append(name)

            features["total_uncompressed_size"] = total_uncompressed
            features["is_encrypted"] = has_encrypted
            features["contained_executables"] = executables[:10]

            # 1. Directory Traversal Entry Detection
            if traversal_files:
                findings.append(
                    Finding(
                        id="FIND-ZIP-001",
                        category="PATH_TRAVERSAL",
                        title="Archive Member Contains Relative Path Traversal",
                        description=(
                            f"Archive contains {len(traversal_files)} file entries with path traversal sequences "
                            f"(e.g. '../'), which could overwrite critical system files upon extraction."
                        ),
                        severity=SeverityEnum.HIGH,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"examples": traversal_files[:5]},
                        source_engine="archive_extractor",
                        recommendation="Do not extract this archive without strict sanitization.",
                    )
                )

            # 2. Decompression Bomb Check
            if total_compressed > 0 and total_uncompressed > 50 * 1024 * 1024:
                ratio = total_uncompressed / total_compressed
                features["compression_ratio"] = round(ratio, 2)
                if ratio > 100.0:
                    findings.append(
                        Finding(
                            id="FIND-ZIP-002",
                            category="DECOMPRESSION_BOMB",
                            title="Abnormal Archive Compression Ratio (Zip Bomb Suspect)",
                            description=(
                                f"Archive expands from {total_compressed} to {total_uncompressed} bytes "
                                f"({ratio:.1f}x expansion ratio), indicating a potential denial-of-service attack."
                            ),
                            severity=SeverityEnum.HIGH,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"compressed_bytes": total_compressed, "uncompressed_bytes": total_uncompressed, "ratio": ratio},
                            source_engine="archive_extractor",
                            recommendation="Avoid automatic decompression of high-ratio archive files.",
                        )
                    )

            # 3. Contained Executables in Archive (Informational/Low indicator)
            if executables:
                findings.append(
                    Finding(
                        id="FIND-ZIP-003",
                        category="CONTAINED_EXECUTABLE",
                        title="Executable Binaries or Scripts Found Inside Archive",
                        description=f"Archive contains {len(executables)} executable files or scripts.",
                        severity=SeverityEnum.LOW,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"executables": executables[:5]},
                        source_engine="archive_extractor",
                        recommendation="Verify the legitimacy of executable payloads within the archive.",
                    )
                )

    except Exception as exc:
        features["archive_error"] = str(exc)
        findings.append(
            Finding(
                id="FIND-ZIP-ERR-001",
                category="PARSER_FAULT",
                title="Archive Header Warning",
                description=f"Passive archive parsing encountered an error: {exc}",
                severity=SeverityEnum.INFO,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"error": str(exc)},
                source_engine="archive_extractor",
            )
        )

    return features, findings
