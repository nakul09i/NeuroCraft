"""Generic static feature extraction: entropy, strings, and suspicious indicators."""

import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, FileTypeInfo, Finding, SeverityEnum

# Regex patterns for static string indicators
URL_PATTERN = re.compile(rb"https?://[a-zA-Z0-9_\-\./:\?=%&+#]+", re.IGNORECASE)
SUSPICIOUS_STRINGS_PATTERN = re.compile(
    rb"(cmd\.exe|powershell(?:\.exe)?|wscript(?:\.exe)?|cscript(?:\.exe)?|rundll32(?:\.exe)?|"
    rb"reg(?:\.exe)?\s+add|schtasks(?:\.exe)?|net(?:\.exe)?\s+user|whoami|vssadmin(?:\.exe)?|"
    rb"certutil(?:\.exe)?|bitsadmin(?:\.exe)?|curl(?:\.exe)?|wget(?:\.exe)?)",
    re.IGNORECASE,
)
IP_PATTERN = re.compile(rb"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b")


def calculate_entropy(file_path: Path, chunk_size: int = 64 * 1024) -> float:
    """
    Calculate Shannon entropy over the file bytes using streaming chunks.
    Output: 0.0 (completely uniform/zeroes) to 8.0 (completely random/compressed/encrypted).
    """
    counts = Counter[int]()
    total_bytes = 0

    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            counts.update(chunk)

    if total_bytes == 0:
        return 0.0

    entropy = 0.0
    for count in counts.values():
        p_x = count / total_bytes
        if p_x > 0:
            entropy -= p_x * math.log2(p_x)

    return round(entropy, 4)


def extract_strings(
    file_path: Path,
    min_length: int = 4,
    max_strings: int = 5000,
    chunk_size: int = 64 * 1024,
) -> tuple[int, list[str], list[str], list[str]]:
    """
    Extract printable ASCII strings from file.
    Returns: (total_string_count, sample_strings, suspicious_matches, urls)
    """
    printable_chars = set(
        b"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ "
    )
    current_chars: list[int] = []
    all_strings: list[str] = []
    suspicious: list[str] = []
    urls: list[str] = []
    total_count = 0

    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            # Search URLs and suspicious strings on the raw chunk
            for url in URL_PATTERN.findall(chunk):
                try:
                    urls.append(url.decode("ascii", errors="ignore"))
                except Exception:
                    pass

            for susp in SUSPICIOUS_STRINGS_PATTERN.findall(chunk):
                try:
                    suspicious.append(susp.decode("ascii", errors="ignore"))
                except Exception:
                    pass

            # Extract printable ASCII sequences
            for byte in chunk:
                if byte in printable_chars:
                    current_chars.append(byte)
                else:
                    if len(current_chars) >= min_length:
                        total_count += 1
                        if len(all_strings) < max_strings:
                            try:
                                s = bytes(current_chars).decode("ascii", errors="ignore")
                                all_strings.append(s)
                            except Exception:
                                pass
                    current_chars.clear()

    # Flush final string if any
    if len(current_chars) >= min_length:
        total_count += 1
        if len(all_strings) < max_strings:
            try:
                s = bytes(current_chars).decode("ascii", errors="ignore")
                all_strings.append(s)
            except Exception:
                pass

    # Deduplicate indicators
    unique_suspicious = sorted(set(suspicious))
    unique_urls = sorted(set(urls))[:50]  # Cap URL reporting

    return total_count, all_strings[:100], unique_suspicious, unique_urls


def extract_generic_features(
    file_path: Path, file_type: FileTypeInfo
) -> tuple[dict[str, Any], list[Finding]]:
    """
    Extract generic static features and generate baseline structural findings.
    """
    size = file_path.stat().st_size
    entropy = calculate_entropy(file_path)
    string_count, sample_strings, suspicious_strings, urls = extract_strings(file_path)

    features: dict[str, Any] = {
        "file_size": size,
        "entropy": entropy,
        "printable_string_count": string_count,
        "suspicious_string_indicators": suspicious_strings,
        "embedded_urls": urls,
        "sample_strings": sample_strings[:20],
    }

    findings: list[Finding] = []

    # 1. Extension Mismatch Finding
    if file_type.extension_mismatch:
        findings.append(
            Finding(
                id="FIND-GEN-001",
                category="EVASION",
                title="File Extension Mismatch Detected",
                description=(
                    f"File extension does not match true content type. "
                    f"Detected format is {file_type.type.value} ({file_type.mime})."
                ),
                severity=SeverityEnum.HIGH,
                confidence=ConfidenceEnum.HIGH,
                evidence={
                    "detected_type": file_type.type.value,
                    "mime_type": file_type.mime,
                },
                source_engine="generic_extractor",
                recommendation="Investigate why the file masquerades as a different document type.",
            )
        )

    # 2. High Entropy Finding
    if entropy >= 7.2:
        findings.append(
            Finding(
                id="FIND-GEN-002",
                category="ENTROPY",
                title="High Overall Entropy (Possible Packing or Encryption)",
                description=(
                    f"Overall file Shannon entropy is {entropy:.2f} (out of 8.0). "
                    "Values exceeding 7.2 typically indicate packed or encrypted payloads."
                ),
                severity=SeverityEnum.MEDIUM if entropy < 7.8 else SeverityEnum.HIGH,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"entropy": entropy},
                source_engine="generic_extractor",
                recommendation="Inspect file for binary packers, compressors, or encrypted payloads.",
            )
        )

    # 3. Suspicious Command Strings Finding
    if suspicious_strings:
        findings.append(
            Finding(
                id="FIND-GEN-003",
                category="COMMAND_EXECUTION",
                title="Suspicious System Commands & Shell Indicators Present",
                description="Embedded strings reference system command execution utilities or administrative tools.",
                severity=SeverityEnum.MEDIUM,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"indicators": suspicious_strings},
                source_engine="generic_extractor",
                recommendation="Verify whether execution of embedded administrative commands is expected.",
            )
        )

    # 4. Embedded URL Finding
    if urls:
        findings.append(
            Finding(
                id="FIND-GEN-004",
                category="NETWORK",
                title="Embedded Network URLs Detected",
                description=f"Found {len(urls)} embedded HTTP/HTTPS URLs in file contents.",
                severity=SeverityEnum.LOW,
                confidence=ConfidenceEnum.HIGH,
                evidence={"urls": urls[:10]},
                source_engine="generic_extractor",
                recommendation="Review embedded endpoints against known threat intelligence or blocklists.",
            )
        )

    return features, findings
