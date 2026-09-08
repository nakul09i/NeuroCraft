"""Unit tests for NeuroCraft Phase 0 foundation, shared types, and security controls."""

import sys
from contextlib import contextmanager
from pathlib import Path

try:
    import pytest
except ImportError:
    pytest = None  # type: ignore[assignment]


@contextmanager
def assert_raises(exc_type):
    """Fallback context manager when pytest is not installed."""
    try:
        yield
    except exc_type:
        return
    except Exception as e:
        raise AssertionError(f"Expected {exc_type.__name__}, got {type(e).__name__}: {e}")
    raise AssertionError(f"Expected {exc_type.__name__} was not raised")


def raises_context(exc_type):
    if pytest is not None:
        return pytest.raises(exc_type)
    return assert_raises(exc_type)


# Ensure packages are importable
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "packages" / "shared-types" / "src"))
sys.path.insert(0, str(ROOT / "packages" / "shared-security" / "src"))
sys.path.insert(0, str(ROOT / "packages" / "shared-config" / "src"))
sys.path.insert(0, str(ROOT / "packages" / "shared-logging" / "src"))

from neurocraft_config import get_config
from neurocraft_logging import redact_sensitive_dict
from neurocraft_security import (
    SecurityValidationError,
    check_archive_limits,
    sanitize_filename,
    validate_safe_path,
)
from neurocraft_types import (
    ConfidenceEnum,
    FileTypeEnum,
    FileTypeInfo,
    Finding,
    HashDigest,
    RiskAssessment,
    ScanResult,
    ScanVerdict,
    SeverityEnum,
    VerdictEnum,
    VerdictLevel,
)


def test_shared_types_schema_validation() -> None:
    """Test that canonical domain contracts validate schema correctly."""
    hashes = HashDigest(
        md5="d41d8cd98f00b204e9800998ecf8427e",
        sha1="da39a3ee5e6b4b0d3255bfef95601890afd80709",
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    risk = RiskAssessment(
        overall_score=15.5,
        verdict=VerdictEnum.CLEAN,
        confidence=0.95,
        deterministic_override=False,
    )
    evidence = Finding(
        id="FIND-PE-001",
        category="STRUCTURE",
        title="Standard PE Header",
        description="Standard PE header found",
        severity=SeverityEnum.INFO,
        confidence=ConfidenceEnum.HIGH,
        source_engine="pe_extractor",
    )
    ft_info = FileTypeInfo(
        type=FileTypeEnum.PE,
        mime="application/x-dosexec",
        description="Windows PE",
        is_supported=True,
    )
    scan_verdict = ScanVerdict(
        level=VerdictLevel.SAFE,
        score=15.5,
    )
    result = ScanResult(
        scan_id="test-scan-001",
        filename="benign.exe",
        file_size_bytes=1024,
        mime_type="application/x-dosexec",
        magic_bytes="4D5A",
        file_type=ft_info,
        hashes=hashes,
        evidence=[evidence],
        findings=[evidence],
        risk_verdict=scan_verdict,
        risk_assessment=risk,
    )

    assert result.scan_id == "test-scan-001"
    assert result.risk_verdict.level == VerdictLevel.SAFE
    assert result.hashes.sha256.startswith("e3b0")


def test_sanitize_filename() -> None:
    """Test that path traversal characters and illegal symbols are stripped."""
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\calc.exe") == "calc.exe"
    assert sanitize_filename("safe_file.pdf") == "safe_file.pdf"
    assert sanitize_filename("malicious\x00file.exe") == "maliciousfile.exe"


def test_validate_safe_path_traversal() -> None:
    """Test that directory traversal raises SecurityValidationError."""
    base = Path("/safe/base/directory")
    with raises_context(SecurityValidationError):
        validate_safe_path(base, Path("../../escaped/path"))


def test_archive_limits() -> None:
    """Test that zip-bombs and decompression attacks are detected."""
    # 100 bytes compressed expanding to 2000 bytes is 20:1 ratio (exceeds 10:1 limit)
    with raises_context(SecurityValidationError):
        check_archive_limits(compressed_size=100, uncompressed_size=2000, max_ratio=10.0)

    # Within limits: 1000 compressed expanding to 5000 is 5:1 (safe)
    check_archive_limits(compressed_size=1000, uncompressed_size=5000, max_ratio=10.0)


def test_config_free_first_defaults() -> None:
    """Test that default configuration adheres to free-first local execution."""
    cfg = get_config()
    assert cfg.app_name == "NeuroCraft"
    assert cfg.threat_intel_enabled is False
    assert cfg.blockchain_enabled is False
    assert cfg.ml_execution_provider == "CPUExecutionProvider"


def test_logger_secret_redaction() -> None:
    """Test that sensitive tokens are redacted in log records."""
    data = {
        "user": "analyst_1",
        "api_key": "super-secret-token-12345",
        "private_key": "my-secret-key",
        "nested": {
            "password": "secret_password_value",
            "safe_metric": 42,
        },
    }
    redacted = redact_sensitive_dict(data)
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["private_key"] == "[REDACTED]"
    assert redacted["nested"]["password"] == "[REDACTED]"
    assert redacted["nested"]["safe_metric"] == 42
    assert redacted["user"] == "analyst_1"


if __name__ == "__main__":
    print("[RUNNING] Running test_foundation.py standalone...")
    test_shared_types_schema_validation()
    test_sanitize_filename()
    # Test validate_safe_path using Path.cwd()
    try:
        validate_safe_path(Path.cwd(), Path("../../outside_attempt"))
        print("[FAIL] Traversal check failed to raise exception")
        sys.exit(1)
    except SecurityValidationError:
        pass
    try:
        check_archive_limits(compressed_size=100, uncompressed_size=2000, max_ratio=10.0)
        print("[FAIL] Archive limit failed to raise exception")
        sys.exit(1)
    except SecurityValidationError:
        pass
    test_config_free_first_defaults()
    test_logger_secret_redaction()
    print("[PASS] All foundation unit tests passed successfully.")
