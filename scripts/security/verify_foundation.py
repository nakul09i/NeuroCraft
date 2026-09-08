"""Verification script for NeuroCraft Phase 0 Foundation."""

import sys
from pathlib import Path

REQUIRED_FILES = [
    "AGENTS.md",
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "LICENSE",
    ".gitignore",
    ".env.example",
    "docker-compose.yml",
    "Makefile",
    "pyproject.toml",
    "apps/web/README.md",
    "apps/desktop/README.md",
    "apps/cli/README.md",
    "services/api/README.md",
    "services/scanner/README.md",
    "services/ml-engine/README.md",
    "services/risk-engine/README.md",
    "services/explanation-engine/README.md",
    "services/integrity-service/README.md",
    "services/provenance-service/README.md",
    "services/worker/README.md",
    "packages/shared-types/README.md",
    "packages/shared-config/README.md",
    "packages/shared-security/README.md",
    "packages/shared-logging/README.md",
    "packages/api-client/README.md",
    "yara-rules/README.md",
    "signatures/README.md",
    "datasets/README.md",
    "test-fixtures/README.md",
    "docs/architecture/system-overview.md",
    "docs/architecture/security-architecture.md",
    "docs/architecture/data-flow.md",
    "docs/architecture/threat-model.md",
    "docs/architecture/decisions/ADR-001-monorepo.md",
    "docs/architecture/decisions/ADR-002-risk-engine.md",
    "docs/architecture/decisions/ADR-003-blockchain-provenance.md",
    "docs/architecture/decisions/ADR-004-offline-mode.md",
    "docs/architecture/decisions/ADR-005-ml-model-versioning.md",
    "docs/api/openapi.yaml",
    "docs/ml/dataset.md",
    "docs/ml/features.md",
    "docs/ml/training.md",
    "docs/ml/evaluation.md",
    "docs/ml/model-registry.md",
    "docs/ml/inference-contract.md",
    "docs/security/file-analysis-security.md",
    "docs/security/upload-security.md",
    "docs/security/model-security.md",
    "docs/deployment/local.md",
    "docs/deployment/docker.md",
    "docs/development/git-workflow.md",
    ".github/workflows/ci.yml",
]


def verify_foundation() -> bool:
    root = Path(__file__).resolve().parent.parent.parent
    all_ok = True
    print(f"[NeuroCraft] Verifying Phase 0 Foundation at: {root}")

    # 1. Check required files
    missing = []
    empty_files = []
    for rel_path in REQUIRED_FILES:
        full_path = root / rel_path
        if not full_path.exists():
            missing.append(rel_path)
        elif full_path.stat().st_size == 0:
            empty_files.append(rel_path)

    if missing:
        print(f"[FAIL] Missing {len(missing)} required foundation files:")
        for m in missing:
            print(f"  - {m}")
        all_ok = False
    else:
        print(f"[PASS] All {len(REQUIRED_FILES)} required foundation files exist.")

    if empty_files:
        print(f"[FAIL] Found {len(empty_files)} empty files:")
        for e in empty_files:
            print(f"  - {e}")
        all_ok = False
    else:
        print("[PASS] No foundation files are empty.")

    # 2. Check gitignore contains .env
    gitignore_path = root / ".gitignore"
    if gitignore_path.exists():
        content = gitignore_path.read_text(encoding="utf-8")
        if ".env" in content:
            print("[PASS] .gitignore correctly ignores .env files.")
        else:
            print("[FAIL] .gitignore does not ignore .env.")
            all_ok = False

    # 3. Check no live malware or unexpected binaries
    forbidden_extensions = {".exe", ".dll", ".so", ".dylib", ".bin", ".malware", ".virus"}
    ignored_dirs = {".venv", ".git", "scratch", "build", "dist", "__pycache__"}
    bad_binaries = []
    for p in root.rglob("*"):
        if any(part in ignored_dirs for part in p.parts):
            continue
        if p.is_file() and p.suffix.lower() in forbidden_extensions:
            # Check if it's not a source file or doc
            bad_binaries.append(str(p.relative_to(root)))

    if bad_binaries:
        print(f"[FAIL] Forbidden binaries detected in repository: {bad_binaries}")
        all_ok = False
    else:
        print("[PASS] Zero live malware or unexpected compiled binaries in repository.")

    # 4. Check package importability
    sys.path.insert(0, str(root / "packages" / "shared-types" / "src"))
    sys.path.insert(0, str(root / "packages" / "shared-security" / "src"))
    sys.path.insert(0, str(root / "packages" / "shared-config" / "src"))
    sys.path.insert(0, str(root / "packages" / "shared-logging" / "src"))
    try:
        from neurocraft_config import get_config
        from neurocraft_security import sanitize_filename

        cfg = get_config()
        assert cfg.app_name == "NeuroCraft"
        sanitized = sanitize_filename("../../malicious_test.exe")
        assert "/" not in sanitized and "\\" not in sanitized
        print("[PASS] Core shared packages imported and validated successfully.")
    except Exception as exc:
        print(f"[FAIL] Error validating shared packages: {exc}")
        all_ok = False

    return all_ok


if __name__ == "__main__":
    success = verify_foundation()
    sys.exit(0 if success else 1)
