"""Audits repository files to ensure no hardcoded secrets or API tokens exist."""

import re
import sys
from pathlib import Path

SECRET_PATTERNS = [
    (r"(?i)api[_-]?key\s*=\s*['\"][a-zA-Z0-9_\-]{16,}['\"]", "High-entropy API key assignment"),
    (r"(?i)secret[_-]?key\s*=\s*['\"][a-zA-Z0-9_\-]{16,}['\"]", "High-entropy secret key assignment"),
    (r"-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----", "Private cryptographic key"),
    (r"(?i)ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
    (r"(?i)aws_access_key_id\s*=\s*['\"][A-Z0-9]{20}['\"]", "AWS Access Key"),
]

IGNORED_FILES = {".env.example"}
IGNORED_EXTENSIONS = {".git", ".pyc", ".png", ".jpg", ".ico"}


def scan_for_secrets(root_dir: Path) -> list[str]:
    findings: list[str] = []
    for file_path in root_dir.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.name in IGNORED_FILES:
            continue
        if any(part.startswith(".") for part in file_path.parts if part != "."):
            if not file_path.name.endswith(".yml") and not file_path.name.endswith(".yaml"):
                continue
        if file_path.suffix in IGNORED_EXTENSIONS:
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            for pattern, desc in SECRET_PATTERNS:
                matches = re.findall(pattern, content)
                if matches:
                    findings.append(f"[{desc}] detected in {file_path.relative_to(root_dir)}")
        except Exception as e:
            findings.append(f"Could not read {file_path}: {e}")

    return findings


def main() -> int:
    root = Path(__file__).resolve().parent.parent.parent
    findings = scan_for_secrets(root)
    if findings:
        print("[FAIL] Secrets or credentials detected:")
        for f in findings:
            print(f"  - {f}")
        return 1
    print("[PASS] No hardcoded secrets or private keys detected in repository.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
