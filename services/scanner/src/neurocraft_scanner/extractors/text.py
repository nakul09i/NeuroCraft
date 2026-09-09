"""Safe static text and script analysis extractor for NeuroCraft.

Performs purely passive static inspection on text, script, and config files without execution.
"""

import re
from pathlib import Path
from typing import Any

from neurocraft_types import ConfidenceEnum, Finding, SeverityEnum

# Weaponized script execution indicators (distinguishes malicious patterns from ordinary text)
POWERSHELL_OBFUSCATED_PATTERN = re.compile(
    r"(powershell(\.exe)?\s+.*(-enc|-encodedcommand|-e\s+[a-zA-Z0-9+/=]{10,})|"
    r"powershell(\.exe)?\s+.*-nop.*-w\s+hidden|"
    r"powershell(\.exe)?\s+.*-executionpolicy\s+bypass)",
    re.IGNORECASE,
)

DOWNLOAD_CRADLE_PATTERN = re.compile(
    r"(iex\s*\(\s*(new-object|iwr|curl|wget).*download(string|file)|"
    r"invoke-expression\s*\(?.*net\.webclient.*download|"
    r"bitsadmin(\.exe)?\s+/transfer\s+.*http)",
    re.IGNORECASE,
)

DESTRUCTIVE_RANSOM_PATTERN = re.compile(
    r"(vssadmin(\.exe)?\s+delete\s+shadows|"
    r"bcdedit(\.exe)?\s+/set.*recoveryenabled\s+no|"
    r"wbadmin(\.exe)?\s+delete\s+catalog)",
    re.IGNORECASE,
)

REVERSE_SHELL_PATTERN = re.compile(
    r"(/bin/(ba)?sh\s+-i\s+>&?\s*/dev/tcp/|"
    r"nc(\.traditional)?\s+-[el]{1,2}\s+.*-e\s+/bin/(ba)?sh|"
    r"0<&\d+;\s*exec\s+\d+<>/dev/tcp/)",
    re.IGNORECASE,
)


def extract_text_features(file_path: Path) -> tuple[dict[str, Any], list[Finding]]:
    """
    Safely inspect plain text, scripts, and configuration files for weaponized payloads.
    Never interprets or executes the text.
    """
    findings: list[Finding] = []
    features: dict[str, Any] = {
        "line_count": 0,
        "is_plain_text": True,
        "script_threats_detected": [],
    }

    try:
        # Read with permissive decoding to prevent crash on non-UTF8 bytes
        content = file_path.read_text(encoding="utf-8", errors="replace")
        lines = content.splitlines()
        features["line_count"] = len(lines)

        # 1. PowerShell Encoded / Stealth Execution
        ps_matches = POWERSHELL_OBFUSCATED_PATTERN.findall(content)
        if ps_matches:
            features["script_threats_detected"].append("powershell_obfuscated_cradle")
            findings.append(
                Finding(
                    id="FIND-TXT-001",
                    category="OBFUSCATED_EXECUTION",
                    title="Obfuscated or Hidden PowerShell Execution Command",
                    description=(
                        "Script contains stealth command invocations such as base64-encoded payloads "
                        "or execution policy bypass switches typically used to evade logging."
                    ),
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"snippet": ps_matches[0][0][:100]},
                    source_engine="text_extractor",
                    recommendation="Inspect decoded payload before allowing execution in an operational environment.",
                )
            )

        # 2. Automated Download Cradle
        dl_matches = DOWNLOAD_CRADLE_PATTERN.findall(content)
        if dl_matches:
            features["script_threats_detected"].append("automated_download_cradle")
            findings.append(
                Finding(
                    id="FIND-TXT-002",
                    category="REMOTE_PAYLOAD",
                    title="Weaponized In-Memory Download-and-Execute Cradle",
                    description=(
                        "Script contains dynamic download-and-execute instructions (e.g. IEX WebClient) "
                        "designed to fetch and run remote staging code directly."
                    ),
                    severity=SeverityEnum.HIGH,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"snippet": dl_matches[0][0][:100]},
                    source_engine="text_extractor",
                    recommendation="Check the remote endpoint against known threat intelligence indicators.",
                )
            )

        # 3. Ransomware Shadow Copy / Recovery Deletion
        destr_matches = DESTRUCTIVE_RANSOM_PATTERN.findall(content)
        if destr_matches:
            features["script_threats_detected"].append("ransomware_shadow_deletion")
            findings.append(
                Finding(
                    id="FIND-TXT-003",
                    category="DESTRUCTIVE_ACTION",
                    title="Destructive Backup/Shadow Copy Deletion Routine",
                    description=(
                        "Script commands attempt to delete Volume Shadow Copies or disable Windows recovery, "
                        "a hallmark behavior of ransomware precursors."
                    ),
                    severity=SeverityEnum.CRITICAL,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"snippet": destr_matches[0][0][:100]},
                    source_engine="text_extractor",
                    recommendation="Quarantine file immediately and check parent systems for ransomware staging.",
                )
            )

        # 4. Interactive Reverse Shell
        rev_matches = REVERSE_SHELL_PATTERN.findall(content)
        if rev_matches:
            features["script_threats_detected"].append("interactive_reverse_shell")
            findings.append(
                Finding(
                    id="FIND-TXT-004",
                    category="C2_COMMUNICATION",
                    title="Interactive TCP Reverse Shell One-Liner Detected",
                    description="Script contains a raw network socket redirection creating an interactive remote command shell.",
                    severity=SeverityEnum.CRITICAL,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"snippet": rev_matches[0][0][:100]},
                    source_engine="text_extractor",
                    recommendation="Isolate script and check internal networks for unauthorized inbound connections.",
                )
            )

    except Exception as exc:
        features["text_error"] = str(exc)
        findings.append(
            Finding(
                id="FIND-TXT-ERR-001",
                category="PARSER_FAULT",
                title="Text Parser Warning",
                description=f"Passive text parsing encountered an error: {exc}",
                severity=SeverityEnum.INFO,
                confidence=ConfidenceEnum.MEDIUM,
                evidence={"error": str(exc)},
                source_engine="text_extractor",
            )
        )

    return features, findings
