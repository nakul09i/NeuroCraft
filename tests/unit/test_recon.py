"""Unit tests for the Defensive Passive Reconnaissance Engine."""

import pytest
from neurocraft_recon.analyzer import ReconEngine
from neurocraft_types import ConfidenceEnum, ReconFinding, SeverityEnum, VerdictLevel


@pytest.fixture
def recon_engine() -> ReconEngine:
    return ReconEngine(timeout_seconds=1.0)


def test_normalize_target(recon_engine: ReconEngine):
    assert recon_engine._normalize_target("https://example.com/path/to/page") == "example.com"
    assert recon_engine._normalize_target("http://api.subdomain.org:8443/v1") == "api.subdomain.org"
    assert recon_engine._normalize_target("TARGET.DOMAIN.COM") == "target.domain.com"
    assert recon_engine._normalize_target("   sub.example.com/   ") == "sub.example.com"


def test_exposure_score_calculation(recon_engine: ReconEngine):
    # Empty findings -> 0 score -> SAFE
    score, level = recon_engine._calculate_exposure_score([])
    assert score == 0.0
    assert level == VerdictLevel.SAFE

    # Low findings
    findings = [
        ReconFinding(
            id="TEST-1",
            category="DNS",
            title="Low Issue",
            severity=SeverityEnum.LOW,
            confidence=ConfidenceEnum.HIGH,
            recommendation="Configure DNS properly.",
        ),
        ReconFinding(
            id="TEST-2",
            category="HEADERS",
            title="Medium Issue",
            severity=SeverityEnum.MEDIUM,
            confidence=ConfidenceEnum.HIGH,
            recommendation="Set security headers.",
        ),
    ]
    # LOW(6.0) + MEDIUM(12.0) = 18.0 -> SAFE (< 20.0)
    score, level = recon_engine._calculate_exposure_score(findings)
    assert score == 18.0
    assert level == VerdictLevel.SAFE

    # Add Critical -> 18 + 35 = 53 -> MEDIUM
    findings.append(
        ReconFinding(
            id="TEST-3",
            category="VULN",
            title="Critical Issue",
            severity=SeverityEnum.CRITICAL,
            confidence=ConfidenceEnum.HIGH,
            recommendation="Patch critical vulnerability.",
        )
    )
    score, level = recon_engine._calculate_exposure_score(findings)
    assert score == 53.0
    assert level == VerdictLevel.MEDIUM


@pytest.mark.anyio
async def test_scan_target_nonexistent_graceful(recon_engine: ReconEngine):
    # Testing a non-resolvable dummy domain ensures graceful handling without unhandled exceptions
    target = "nonexistent-test-domain-1234567890.invalid"
    res = await recon_engine.scan_target(target, user_id="user-123")

    assert res.target == target
    assert res.user_id == "user-123"
    assert res.status == "COMPLETED"
    assert isinstance(res.exposure_score, float)
    assert res.exposure_level in VerdictLevel
    assert isinstance(res.findings, list)
