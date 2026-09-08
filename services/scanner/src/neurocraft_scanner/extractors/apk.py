"""Safe static APK (Android Package) analysis extractor using zip inspection."""

import zipfile
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum


def extract_apk_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect APK archive without extracting payloads to disk.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {}

    try:
        if not zipfile.is_zipfile(file_path):
            return {"error": "Not a valid ZIP/APK archive"}, findings

        with zipfile.ZipFile(file_path, "r") as zf:
            namelist = zf.namelist()
            has_manifest = "AndroidManifest.xml" in namelist
            dex_files = [n for n in namelist if n.endswith(".dex")]
            native_libs = [n for n in namelist if n.startswith("lib/") and n.endswith(".so")]
            cert_files = [
                n
                for n in namelist
                if n.startswith("META-INF/") and n.endswith((".RSA", ".DSA", ".EC"))
            ]

            features["has_manifest"] = has_manifest
            features["dex_file_count"] = len(dex_files)
            features["native_library_count"] = len(native_libs)
            features["has_signing_certificate"] = bool(cert_files)
            features["cert_files"] = cert_files

            # Findings Generation
            if not has_manifest:
                findings.append(
                    Finding(
                        id="FIND-APK-001",
                        category="STRUCTURE",
                        title="Missing AndroidManifest.xml in APK",
                        description="APK package does not contain an AndroidManifest.xml, indicating a corrupt or non-standard package.",
                        severity=SeverityEnum.MEDIUM,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"has_manifest": False},
                        source_engine="apk_extractor",
                        recommendation="Verify APK build source.",
                    )
                )

            if len(dex_files) > 3:
                findings.append(
                    Finding(
                        id="FIND-APK-002",
                        category="PACKING",
                        title="Multiple Secondary DEX Files (Multi-DEX / Packer)",
                        description=f"APK contains {len(dex_files)} DEX files. Malware or commercial packers often hide secondary payloads in auxiliary DEX containers.",
                        severity=SeverityEnum.LOW,
                        confidence=ConfidenceEnum.MEDIUM,
                        evidence={"dex_files": dex_files},
                        source_engine="apk_extractor",
                        recommendation="Inspect secondary DEX files for dynamically loaded classes.",
                    )
                )

            if not cert_files:
                findings.append(
                    Finding(
                        id="FIND-APK-003",
                        category="AUTHENTICITY",
                        title="Unsigned Android Application Package",
                        description="APK lacks cryptographic release signatures in META-INF directory.",
                        severity=SeverityEnum.MEDIUM,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"cert_files": []},
                        source_engine="apk_extractor",
                        recommendation="Do not install unsigned Android packages on mobile devices.",
                    )
                )

    except Exception as err:
        findings.append(
            Finding(
                id="FIND-APK-ERR-001",
                category="MALFORMED_PACKAGE",
                title="Error Parsing APK Package Container",
                description=f"APK parsing error: {err}",
                severity=SeverityEnum.LOW,
                confidence=ConfidenceEnum.HIGH,
                evidence={"error": str(err)},
                source_engine="apk_extractor",
                recommendation="Inspect archive container integrity.",
            )
        )
        features["error"] = str(err)

    return features, findings
