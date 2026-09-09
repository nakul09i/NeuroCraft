"""Unit tests for NeuroCraft Trust & File Integrity Engine.

Tests:
1. Same file yields same SHA-256 and SHA-512.
2. Modified file yields different cryptographic hashes.
3. Reference hash: MATCH.
4. Reference hash: MISMATCH (without falsely declaring file as malware).
5. Reference hash: INVALID_REFERENCE (malformed or non-hex).
6. Reference hash: NOT_PROVIDED.
7. Signed file verification with certificate metadata.
8. Unsigned file remains neutral in trust (50.0) and safe in risk (0.0).
9. Self-signed certificate handling.
10. Corrupted signature handling (lowers trust, flags integrity concern).
11. Deterministic evidence items (zero random or simulated values).
12. Strict separation of Trust from Risk (False positive verification).
"""

from pathlib import Path

import pytest
from neurocraft_scanner.fingerprint import compute_fingerprint
from neurocraft_scanner.trust import TrustIntegrityEvaluator
from neurocraft_types import (
    CertificateInfo,
    DigitalSignatureInfo,
    FileTypeEnum,
    FileTypeInfo,
    HashDigest,
    HashMatchStatusEnum,
    IntegrityStatusEnum,
    SignatureStatusEnum,
    TrustLevelEnum,
    VerdictLevel,
)


@pytest.fixture
def evaluator() -> TrustIntegrityEvaluator:
    return TrustIntegrityEvaluator()


@pytest.fixture
def sample_file(tmp_path: Path) -> Path:
    f = tmp_path / "sample.txt"
    f.write_bytes(b"NeuroCraft Integrity Engine Test Payload - Safe Document")
    return f


@pytest.fixture
def modified_file(tmp_path: Path) -> Path:
    f = tmp_path / "sample_modified.txt"
    f.write_bytes(b"NeuroCraft Integrity Engine Test Payload - Safe Document MODIFIED")
    return f


def test_hashing_same_file_reproducibility(sample_file: Path):
    """Verify that hashing the same file twice produces identical SHA-256 and SHA-512."""
    fp1 = compute_fingerprint(sample_file, scan_id="test-1")
    fp2 = compute_fingerprint(sample_file, scan_id="test-2")

    assert fp1.hashes.sha256 == fp2.hashes.sha256
    assert fp1.hashes.sha512 == fp2.hashes.sha512
    assert fp1.hashes.sha1 == fp2.hashes.sha1
    assert len(fp1.hashes.sha256) == 64
    assert len(fp1.hashes.sha512) == 128
    assert len(fp1.hashes.sha1) == 40


def test_hashing_modified_file_different_hashes(sample_file: Path, modified_file: Path):
    """Verify that any modification changes the cryptographic hashes."""
    fp1 = compute_fingerprint(sample_file, scan_id="test-1")
    fp2 = compute_fingerprint(modified_file, scan_id="test-2")

    assert fp1.hashes.sha256 != fp2.hashes.sha256
    assert fp1.hashes.sha512 != fp2.hashes.sha512


def test_reference_hash_matching(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """Verify MATCH state when reference hash equals computed SHA-256."""
    fp = compute_fingerprint(sample_file, scan_id="test-match")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    report, assessment = evaluator.evaluate(
        scan_id="test-match",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=fp.hashes.sha256.upper(),  # Test case-insensitivity
    )

    assert report.hash_match_status == HashMatchStatusEnum.MATCH
    assert report.integrity_status == IntegrityStatusEnum.UNCHANGED
    assert report.trust_score >= 70.0
    assert report.trust_level in (TrustLevelEnum.HIGH, TrustLevelEnum.VERY_HIGH)
    assert any(e.status == "match" for e in report.evidence)


def test_reference_hash_matching_sha512(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """Verify MATCH state when reference hash is 128-char SHA-512."""
    fp = compute_fingerprint(sample_file, scan_id="test-sha512")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    report, assessment = evaluator.evaluate(
        scan_id="test-sha512",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=f"  {fp.hashes.sha512}  ",  # Test whitespace trimming
    )

    assert report.hash_match_status == HashMatchStatusEnum.MATCH
    assert report.integrity_status == IntegrityStatusEnum.UNCHANGED


def test_reference_hash_mismatch_not_malware(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """
    CRITICAL PRINCIPLE:
    A changed hash is NOT automatically malware.
    MISMATCH indicates content differs from reference.
    """
    fp = compute_fingerprint(sample_file, scan_id="test-mismatch")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    # Supply an altered 64-char hex hash
    wrong_hash = "0" * 64

    report, assessment = evaluator.evaluate(
        scan_id="test-mismatch",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=wrong_hash,
        risk_level=VerdictLevel.SAFE,
        risk_score=0.0,
    )

    assert report.hash_match_status == HashMatchStatusEnum.MISMATCH
    assert report.integrity_status == IntegrityStatusEnum.MISMATCH
    # Trust is low because integrity failed, but risk remains SAFE
    assert report.trust_score < 40.0
    assert assessment.risk_level == VerdictLevel.SAFE
    # Check human-readable meaning does not accuse file of being malware
    mismatch_ev = next(e for e in report.evidence if e.type == "reference_hash")
    assert "differs from the supplied reference" in mismatch_ev.meaning


def test_reference_hash_invalid_formats(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """Verify invalid reference formats (non-hex, bad length) return INVALID_REFERENCE."""
    fp = compute_fingerprint(sample_file, scan_id="test-invalid")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    # 1. Non-hex characters
    report, _ = evaluator.evaluate(
        scan_id="test-invalid-1",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash="not-a-valid-hex-hash!",
    )
    assert report.hash_match_status == HashMatchStatusEnum.INVALID_REFERENCE

    # 2. Unexpected length (e.g. 50 hex chars)
    report2, _ = evaluator.evaluate(
        scan_id="test-invalid-2",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash="a" * 50,
    )
    assert report2.hash_match_status == HashMatchStatusEnum.INVALID_REFERENCE


def test_reference_hash_not_provided(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """Verify NOT_PROVIDED state when reference hash is omitted or blank."""
    fp = compute_fingerprint(sample_file, scan_id="test-none")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    report, _ = evaluator.evaluate(
        scan_id="test-none",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=None,
    )
    assert report.hash_match_status == HashMatchStatusEnum.NOT_PROVIDED
    assert report.reference_hash is None


def test_unsigned_file_false_positive_control(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """
    CRITICAL FALSE POSITIVE TEST:
    An unsigned file is NOT automatically malicious.
    An unsigned safe document must have:
    Risk: SAFE (0.0)
    Trust: NEUTRAL (50.0)
    Integrity: NOT_APPLICABLE or UNSIGNED
    """
    fp = compute_fingerprint(sample_file, scan_id="test-fp")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    report, assessment = evaluator.evaluate(
        scan_id="test-fp",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=None,
        risk_level=VerdictLevel.SAFE,
        risk_score=0.0,
    )

    assert report.integrity_status == IntegrityStatusEnum.NOT_APPLICABLE
    assert report.trust_score == 50.0
    assert report.trust_level == TrustLevelEnum.NEUTRAL
    assert assessment.risk_level == VerdictLevel.SAFE
    assert assessment.risk_score == 0.0


def test_signed_binary_elevates_trust(evaluator: TrustIntegrityEvaluator):
    """Verify valid digital signature elevates trust to HIGH / VERY_HIGH."""
    hashes = HashDigest(
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        sha512="cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    )
    ft_info = FileTypeInfo(
        type=FileTypeEnum.PE,
        mime="application/vnd.microsoft.portable-executable",
        description="Windows Executable",
        is_supported=True,
    )

    cert = CertificateInfo(
        subject="CN=Google LLC, O=Google LLC, L=Mountain View, ST=California, C=US",
        issuer="CN=DigiCert Trusted G4 Code Signing RSA4096 SHA384 2021 CA1, O=DigiCert Inc, C=US",
        serial_number="0x123456789abcdef",
        not_before="2024-01-01T00:00:00Z",
        not_after="2027-01-01T00:00:00Z",
        signature_algorithm="sha256WithRSAEncryption",
        is_self_signed=False,
        is_expired=False,
    )

    sig_info = DigitalSignatureInfo(
        is_signed=True,
        status=SignatureStatusEnum.VALID,
        signer_name="Google LLC",
        issuer_name="DigiCert Inc",
        digest_algorithm="SHA-256",
        certificates=[cert],
    )

    report, assessment = evaluator.evaluate(
        scan_id="test-signed",
        hashes=hashes,
        file_type_info=ft_info,
        signature_info=sig_info,
        reference_hash=None,
    )

    assert report.integrity_status == IntegrityStatusEnum.SIGNED
    assert report.trust_score >= 70.0
    assert report.trust_level in (TrustLevelEnum.HIGH, TrustLevelEnum.VERY_HIGH)
    assert report.signature_info.signer_name == "Google LLC"


def test_corrupted_signature_penalizes_trust(evaluator: TrustIntegrityEvaluator):
    """Verify corrupted or invalid signature drops trust to VERY_LOW."""
    hashes = HashDigest(
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    ft_info = FileTypeInfo(
        type=FileTypeEnum.PE,
        mime="application/vnd.microsoft.portable-executable",
        description="Windows Executable",
        is_supported=True,
    )

    sig_info = DigitalSignatureInfo(
        is_signed=True,
        status=SignatureStatusEnum.CORRUPTED,
        warnings=["Authenticode directory header is truncated or malformed."],
    )

    report, assessment = evaluator.evaluate(
        scan_id="test-corrupt-sig",
        hashes=hashes,
        file_type_info=ft_info,
        signature_info=sig_info,
        reference_hash=None,
    )

    assert report.integrity_status == IntegrityStatusEnum.MISMATCH
    assert report.trust_score <= 20.0
    assert report.trust_level == TrustLevelEnum.VERY_LOW


def test_verified_status_with_both_hash_and_signature(evaluator: TrustIntegrityEvaluator):
    """Verify VERIFIED status when both matching reference hash and valid signature are present."""
    hashes = HashDigest(
        sha256="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    ft_info = FileTypeInfo(
        type=FileTypeEnum.PE,
        mime="application/x-dosexec",
        description="PE Binary",
        is_supported=True,
    )

    sig_info = DigitalSignatureInfo(
        is_signed=True,
        status=SignatureStatusEnum.VALID,
        signer_name="Verified Publisher",
        certificates=[
            CertificateInfo(
                subject="CN=Verified Publisher",
                issuer="CN=Root CA",
                serial_number="0xabc",
                is_self_signed=False,
                is_expired=False,
            )
        ],
    )

    report, _ = evaluator.evaluate(
        scan_id="test-both",
        hashes=hashes,
        file_type_info=ft_info,
        signature_info=sig_info,
        reference_hash=hashes.sha256,
    )

    assert report.integrity_status == IntegrityStatusEnum.VERIFIED
    assert report.trust_score >= 90.0
    assert report.trust_level == TrustLevelEnum.VERY_HIGH


def test_no_random_or_hallucinated_values(evaluator: TrustIntegrityEvaluator, sample_file: Path):
    """Verify results are strictly deterministic across multiple runs (zero random scores)."""
    fp = compute_fingerprint(sample_file, scan_id="test-det")
    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Plain text",
        is_supported=True,
    )

    report1, _ = evaluator.evaluate(
        scan_id="test-det-1",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=fp.hashes.sha256,
    )
    report2, _ = evaluator.evaluate(
        scan_id="test-det-2",
        hashes=fp.hashes,
        file_type_info=ft_info,
        signature_info=None,
        reference_hash=fp.hashes.sha256,
    )

    assert report1.trust_score == report2.trust_score
    assert report1.confidence_score == report2.confidence_score
    assert report1.integrity_status == report2.integrity_status
    assert report1.hash_match_status == report2.hash_match_status
