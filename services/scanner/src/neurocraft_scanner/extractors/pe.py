"""Safe static PE (Portable Executable) analysis extractor using pefile."""

from pathlib import Path
from typing import Any

import pefile
from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

# Suspicious API sets mapped to capability categories
SUSPICIOUS_APIS: dict[str, str] = {
    # Process Injection
    "VirtualAlloc": "PROCESS_INJECTION",
    "VirtualAllocEx": "PROCESS_INJECTION",
    "WriteProcessMemory": "PROCESS_INJECTION",
    "CreateRemoteThread": "PROCESS_INJECTION",
    "SetThreadContext": "PROCESS_INJECTION",
    "QueueUserAPC": "PROCESS_INJECTION",
    "NtCreateSection": "PROCESS_INJECTION",
    "NtMapViewOfSection": "PROCESS_INJECTION",
    # Process Creation
    "CreateProcessA": "PROCESS_CREATION",
    "CreateProcessW": "PROCESS_CREATION",
    "ShellExecuteA": "PROCESS_CREATION",
    "ShellExecuteW": "PROCESS_CREATION",
    "WinExec": "PROCESS_CREATION",
    # Persistence
    "RegSetValueExA": "PERSISTENCE",
    "RegSetValueExW": "PERSISTENCE",
    "CreateServiceA": "PERSISTENCE",
    "CreateServiceW": "PERSISTENCE",
    "SetWindowsHookExA": "PERSISTENCE",
    "SetWindowsHookExW": "PERSISTENCE",
    # Network
    "InternetOpenA": "NETWORK",
    "InternetOpenW": "NETWORK",
    "InternetOpenUrlA": "NETWORK",
    "URLDownloadToFileA": "NETWORK",
    "URLDownloadToFileW": "NETWORK",
    "WSAStartup": "NETWORK",
    "HttpSendRequestA": "NETWORK",
    "HttpSendRequestW": "NETWORK",
    # Credential Access & Keystroke
    "GetAsyncKeyState": "CREDENTIAL_ACCESS",
    "GetKeyboardState": "CREDENTIAL_ACCESS",
    "CryptUnprotectData": "CREDENTIAL_ACCESS",
    "LsaRetrievePrivateData": "CREDENTIAL_ACCESS",
}

KNOWN_PACKER_SECTIONS = {
    ".upx0",
    ".upx1",
    ".aspack",
    ".mpress",
    ".fsg",
    ".themida",
    ".vmp",
    ".petite",
}


def extract_pe_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect a Windows PE binary using pefile.
    NEVER executes the binary.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {}

    try:
        pe = pefile.PE(str(file_path), fast_load=False)
    except Exception as err:
        findings.append(
            Finding(
                id="FIND-PE-ERR-001",
                category="MALFORMED_HEADER",
                title="Malformed or Corrupted PE Header",
                description=f"PE parser encountered an error reading executable headers: {err}",
                severity=SeverityEnum.MEDIUM,
                confidence=ConfidenceEnum.HIGH,
                evidence={"error": str(err)},
                source_engine="pe_extractor",
                recommendation="Investigate whether this file is intentionally malformed to evade static inspection.",
            )
        )
        return {"error": str(err)}, findings

    try:
        # 1. Basic Architecture & Header
        machine_code = pe.FILE_HEADER.Machine
        arch_map = {0x14C: "x86 (32-bit)", 0x8664: "x86_64 (64-bit)", 0x1C0: "ARM", 0xAA64: "ARM64"}
        arch = arch_map.get(machine_code, f"Unknown (0x{machine_code:04X})")

        features["architecture"] = arch
        features["entry_point"] = hex(pe.OPTIONAL_HEADER.AddressOfEntryPoint)
        features["image_base"] = hex(pe.OPTIONAL_HEADER.ImageBase)
        features["number_of_sections"] = pe.FILE_HEADER.NumberOfSections
        features["timestamp"] = pe.FILE_HEADER.TimeDateStamp

        # 2. Sections Inspection
        sections_data: list[dict[str, Any]] = []
        has_packer_section = False
        has_high_entropy_section = False
        has_writable_executable_section = False

        for sec in pe.sections:
            try:
                name = sec.Name.decode("utf-8", errors="ignore").strip("\x00")
            except Exception:
                name = "unknown"

            raw_size = sec.SizeOfRawData
            virt_size = sec.Misc_VirtualSize
            entropy = sec.get_entropy()
            is_exec = bool(sec.Characteristics & 0x20000000)  # IMAGE_SCN_MEM_EXECUTE
            is_write = bool(sec.Characteristics & 0x80000000)  # IMAGE_SCN_MEM_WRITE

            if name.lower() in KNOWN_PACKER_SECTIONS:
                has_packer_section = True
            if entropy > 7.1 and raw_size > 4096:
                has_high_entropy_section = True
            if is_exec and is_write:
                has_writable_executable_section = True

            sections_data.append(
                {
                    "name": name,
                    "raw_size": raw_size,
                    "virtual_size": virt_size,
                    "entropy": round(entropy, 4),
                    "is_executable": is_exec,
                    "is_writable": is_write,
                }
            )

        features["sections"] = sections_data

        # 3. Imports & Suspicious APIs
        imported_dlls: list[str] = []
        imported_functions: list[str] = []
        matched_suspicious_apis: dict[str, list[str]] = {}

        if hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                try:
                    dll_name = entry.dll.decode("utf-8", errors="ignore").lower()
                    imported_dlls.append(dll_name)
                    for imp in entry.imports:
                        if imp.name:
                            func_name = imp.name.decode("utf-8", errors="ignore")
                            imported_functions.append(func_name)
                            if func_name in SUSPICIOUS_APIS:
                                cat = SUSPICIOUS_APIS[func_name]
                                matched_suspicious_apis.setdefault(cat, []).append(func_name)
                except Exception:
                    pass

        features["imported_dlls"] = imported_dlls
        features["imported_function_count"] = len(imported_functions)
        features["suspicious_apis"] = matched_suspicious_apis

        # 4. Exports
        exports: list[str] = []
        if hasattr(pe, "DIRECTORY_ENTRY_EXPORT"):
            for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
                if exp.name:
                    exports.append(exp.name.decode("utf-8", errors="ignore"))
        features["exports"] = exports

        # 5. Digital Signature Presence
        security_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[
            pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_SECURITY"]
        ]
        has_signature = security_dir.VirtualAddress > 0 and security_dir.Size > 0
        features["has_digital_signature"] = has_signature

        # 6. Overlay Detection
        overlay_offset = pe.get_overlay_data_offset()
        overlay_size = len(pe.get_overlay() or b"")
        has_overlay = overlay_size > 0
        features["has_overlay"] = has_overlay
        features["overlay_size_bytes"] = overlay_size

        # ----------------------------------------------------------------------
        # Finding Generation for PE
        # ----------------------------------------------------------------------

        if has_packer_section:
            findings.append(
                Finding(
                    id="FIND-PE-001",
                    category="PACKING",
                    title="Known Binary Packer Section Name Detected",
                    description="PE section names match signatures of runtime packers (e.g. UPX, ASPack, MPRESS).",
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={
                        "sections": [
                            s["name"]
                            for s in sections_data
                            if s["name"].lower() in KNOWN_PACKER_SECTIONS
                        ]
                    },
                    source_engine="pe_extractor",
                    recommendation="Unpack binary before performing in-depth code disassembly or review.",
                )
            )

        if has_high_entropy_section:
            findings.append(
                Finding(
                    id="FIND-PE-002",
                    category="ENTROPY",
                    title="High Section Entropy (Packed or Encrypted Code/Data)",
                    description="One or more sections contain entropy >= 7.1, indicating compressed or encrypted code blocks.",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.MEDIUM,
                    evidence={
                        "sections": [s["name"] for s in sections_data if s["entropy"] >= 7.1]
                    },
                    source_engine="pe_extractor",
                    recommendation="Analyze high-entropy sections for embedded configuration or second-stage payloads.",
                )
            )

        if has_writable_executable_section:
            findings.append(
                Finding(
                    id="FIND-PE-003",
                    category="SECURITY_MITIGATION",
                    title="Writable and Executable Section (W^X Violation)",
                    description="A section has both MEM_EXECUTE and MEM_WRITE flags enabled. This facilitates self-modifying code or shellcode injection.",
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={
                        "sections": [
                            s["name"]
                            for s in sections_data
                            if s["is_executable"] and s["is_writable"]
                        ]
                    },
                    source_engine="pe_extractor",
                    recommendation="Review memory protection flags; legitimate modern binaries rarely require writable code sections.",
                )
            )

        if "PROCESS_INJECTION" in matched_suspicious_apis:
            findings.append(
                Finding(
                    id="FIND-PE-004",
                    category="SUSPICIOUS_API",
                    title="Process Injection / Memory Modification APIs Imported",
                    description="Executable imports Windows APIs typically used for cross-process memory allocation and remote thread injection.",
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.MEDIUM,
                    evidence={"apis": matched_suspicious_apis["PROCESS_INJECTION"]},
                    source_engine="pe_extractor",
                    recommendation="Check for process hollowing, DLL injection, or shellcode execution routines.",
                )
            )

        if "PERSISTENCE" in matched_suspicious_apis:
            findings.append(
                Finding(
                    id="FIND-PE-005",
                    category="SUSPICIOUS_API",
                    title="System Persistence APIs Imported",
                    description="Imports registry or Windows Service installation APIs indicative of persistence mechanisms.",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.MEDIUM,
                    evidence={"apis": matched_suspicious_apis["PERSISTENCE"]},
                    source_engine="pe_extractor",
                    recommendation="Inspect registry keys or services created by this executable.",
                )
            )

        if has_overlay:
            findings.append(
                Finding(
                    id="FIND-PE-006",
                    category="STRUCTURE",
                    title="File Overlay Detected Beyond PE Section Boundaries",
                    description=f"Found {overlay_size} bytes appended after the final PE section. Malware frequently appends encrypted payloads or config blocks in overlays.",
                    severity=SeverityEnum.LOW if overlay_size < 10000 else SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"overlay_size": overlay_size, "offset": overlay_offset},
                    source_engine="pe_extractor",
                    recommendation="Extract and inspect overlay bytes for embedded configurations.",
                )
            )

        if not has_signature:
            findings.append(
                Finding(
                    id="FIND-PE-007",
                    category="AUTHENTICODE",
                    title="Unsigned Executable Binary (No Digital Signature)",
                    description="Binary lacks a digital signature directory table. Trusted software from verified vendors is typically Authenticode-signed.",
                    severity=SeverityEnum.LOW,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"has_digital_signature": False},
                    source_engine="pe_extractor",
                    recommendation="Verify origin of unsigned binary prior to deployment or execution.",
                )
            )

    finally:
        try:
            pe.close()
        except Exception:
            pass

    return features, findings
