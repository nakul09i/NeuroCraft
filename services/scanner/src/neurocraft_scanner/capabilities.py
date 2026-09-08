"""Behavioral capability mapping from static analysis indicators for NeuroCraft."""

from typing import Any

from neurocraft_types import (
    Capability,
    CapabilityStatusEnum,
    ConfidenceEnum,
    FileTypeEnum,
    FileTypeInfo,
)

# The 13 required standard capabilities
ALL_CAPABILITIES = [
    "execution",
    "process_creation",
    "file_read",
    "file_write",
    "process_injection_indicator",
    "registry_modification",
    "persistence",
    "network_communication",
    "credential_access_indicator",
    "privilege_escalation_indicator",
    "script_execution",
    "embedded_content",
    "archive_content",
]


def map_capabilities(
    file_type: FileTypeInfo,
    generic_features: dict[str, Any],
    specific_features: dict[str, Any],
) -> list[Capability]:
    """
    Synthesize static observations into standardized capability indicators.
    CRITICAL MANDATE: Static indicators denote *capability*, NOT proof of dynamic execution.
    """
    capabilities: list[Capability] = []

    # 1. Execution
    is_exec_type = file_type.type in (
        FileTypeEnum.PE,
        FileTypeEnum.ELF,
        FileTypeEnum.MACH_O,
        FileTypeEnum.APK,
    )
    if is_exec_type:
        capabilities.append(
            Capability(
                capability="execution",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=[f"Executable binary container: {file_type.type.value}"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="execution",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["Non-executable static container"],
            )
        )

    # 2. Process Creation
    suspicious_apis = specific_features.get("suspicious_apis", {})
    proc_creation_apis = suspicious_apis.get("PROCESS_CREATION", [])
    susp_strings = generic_features.get("suspicious_string_indicators", [])
    proc_strings = [
        s
        for s in susp_strings
        if s.lower() in ("cmd.exe", "powershell.exe", "powershell", "wscript.exe")
    ]

    if proc_creation_apis:
        capabilities.append(
            Capability(
                capability="process_creation",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=[f"Imports process creation APIs: {', '.join(proc_creation_apis)}"],
            )
        )
    elif proc_strings:
        capabilities.append(
            Capability(
                capability="process_creation",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=[
                    f"Contains shell/interpreter string indicators: {', '.join(proc_strings)}"
                ],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="process_creation",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["No process creation APIs or shell strings detected"],
            )
        )

    # 3. File Read
    # Static import or indicator presence
    imported_dlls = [d.lower() for d in specific_features.get("imported_dlls", [])]
    if "kernel32.dll" in imported_dlls or file_type.type == FileTypeEnum.PE:
        capabilities.append(
            Capability(
                capability="file_read",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["Executable contains standard runtime file I/O capabilities"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="file_read",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.LOW,
                evidence=["No explicit static file read indicators"],
            )
        )

    # 4. File Write
    if "kernel32.dll" in imported_dlls or file_type.type == FileTypeEnum.PE:
        capabilities.append(
            Capability(
                capability="file_write",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["Executable has access to filesystem write interfaces"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="file_write",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.LOW,
                evidence=["No explicit static file write indicators"],
            )
        )

    # 5. Process Injection Indicator
    inj_apis = suspicious_apis.get("PROCESS_INJECTION", [])
    has_rwx = specific_features.get("has_rwx_segment", False) or any(
        s.get("is_executable") and s.get("is_writable")
        for s in specific_features.get("sections", [])
    )
    if inj_apis:
        capabilities.append(
            Capability(
                capability="process_injection_indicator",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=[
                    f"Imports memory allocation/thread injection APIs: {', '.join(inj_apis)}"
                ],
            )
        )
    elif has_rwx:
        capabilities.append(
            Capability(
                capability="process_injection_indicator",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["Contains writable and executable memory segments (W^X violation)"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="process_injection_indicator",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["No cross-process memory manipulation APIs or RWX sections observed"],
            )
        )

    # 6. Registry Modification
    reg_apis = [a for a in suspicious_apis.get("PERSISTENCE", []) if "Reg" in a]
    reg_strings = [s for s in susp_strings if "reg" in s.lower()]
    if reg_apis:
        capabilities.append(
            Capability(
                capability="registry_modification",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=[f"Imports Windows registry APIs: {', '.join(reg_apis)}"],
            )
        )
    elif reg_strings:
        capabilities.append(
            Capability(
                capability="registry_modification",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=[
                    f"Embedded strings reference registry command utilities: {', '.join(reg_strings)}"
                ],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="registry_modification",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["No registry APIs or command strings observed"],
            )
        )

    # 7. Persistence
    persist_apis = suspicious_apis.get("PERSISTENCE", [])
    if persist_apis:
        capabilities.append(
            Capability(
                capability="persistence",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=[
                    f"Imports persistence APIs (Services / Registry keys): {', '.join(persist_apis)}"
                ],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="persistence",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["No automated persistence mechanisms detected"],
            )
        )

    # 8. Network Communication
    net_apis = suspicious_apis.get("NETWORK", [])
    urls = generic_features.get("embedded_urls", [])
    has_net_dll = any(
        d in imported_dlls for d in ("ws2_32.dll", "wininet.dll", "winhttp.dll", "urlmon.dll")
    )

    if net_apis or urls:
        ev: list[str] = []
        if net_apis:
            ev.append(f"Imports network socket/download APIs: {', '.join(net_apis)}")
        if urls:
            ev.append(f"Contains {len(urls)} embedded HTTP/HTTPS endpoints")
        capabilities.append(
            Capability(
                capability="network_communication",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=ev,
            )
        )
    elif has_net_dll:
        capabilities.append(
            Capability(
                capability="network_communication",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["Links network communication libraries (Winsock / WinINet)"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="network_communication",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["No network libraries, APIs, or URLs detected"],
            )
        )

    # 9. Credential Access Indicator
    cred_apis = suspicious_apis.get("CREDENTIAL_ACCESS", [])
    if cred_apis:
        capabilities.append(
            Capability(
                capability="credential_access_indicator",
                status=CapabilityStatusEnum.LIKELY,
                confidence=ConfidenceEnum.HIGH,
                evidence=[
                    f"Imports keystroke capture or credential DPAPI functions: {', '.join(cred_apis)}"
                ],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="credential_access_indicator",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["No credential access or keylogger APIs observed"],
            )
        )

    # 10. Privilege Escalation Indicator
    priv_strings = [s for s in susp_strings if s.lower() in ("whoami", "net user", "vssadmin")]
    if priv_strings:
        capabilities.append(
            Capability(
                capability="privilege_escalation_indicator",
                status=CapabilityStatusEnum.POSSIBLE,
                confidence=ConfidenceEnum.LOW,
                evidence=[
                    f"Embedded reconnaissance and privilege strings: {', '.join(priv_strings)}"
                ],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="privilege_escalation_indicator",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.MEDIUM,
                evidence=["No privilege escalation indicators detected"],
            )
        )

    # 11. Script Execution
    has_js = specific_features.get("has_javascript", False)
    has_macros = specific_features.get("has_macros", False)
    if has_js:
        capabilities.append(
            Capability(
                capability="script_execution",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["PDF document embeds executable JavaScript objects"],
            )
        )
    elif has_macros:
        capabilities.append(
            Capability(
                capability="script_execution",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["Office document contains active VBA macro code"],
            )
        )
    elif file_type.type == FileTypeEnum.TEXT and any(
        s.startswith("#!") or "powershell" in s for s in generic_features.get("sample_strings", [])
    ):
        capabilities.append(
            Capability(
                capability="script_execution",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["Plain text file is a shell or automation script"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="script_execution",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["No embedded script interpreters or macros found"],
            )
        )

    # 12. Embedded Content
    has_embedded_pdf = specific_features.get("has_embedded_files", False)
    has_ole_objects = specific_features.get("embedded_objects_count", 0) > 0
    has_overlay = specific_features.get("has_overlay", False)

    if has_embedded_pdf or has_ole_objects or has_overlay:
        ev = []
        if has_embedded_pdf:
            ev.append("PDF contains embedded secondary file streams")
        if has_ole_objects:
            ev.append(
                f"Document contains {specific_features['embedded_objects_count']} embedded OLE objects"
            )
        if has_overlay:
            ev.append(
                f"PE binary contains {specific_features['overlay_size_bytes']} bytes in file overlay"
            )
        capabilities.append(
            Capability(
                capability="embedded_content",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=ev,
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="embedded_content",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["No hidden embedded streams or overlays detected"],
            )
        )

    # 13. Archive Content
    is_archive = file_type.type in (FileTypeEnum.ZIP, FileTypeEnum.APK)
    if is_archive:
        capabilities.append(
            Capability(
                capability="archive_content",
                status=CapabilityStatusEnum.DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=[f"Container format is a compressed archive: {file_type.type.value}"],
            )
        )
    else:
        capabilities.append(
            Capability(
                capability="archive_content",
                status=CapabilityStatusEnum.NOT_DETECTED,
                confidence=ConfidenceEnum.HIGH,
                evidence=["Standalone file, not an archive container"],
            )
        )

    return capabilities
