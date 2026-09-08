"""Unit tests for deterministic risk scoring and category scores."""

from neurocraft_risk.calculator import DeterministicRiskEngine
from neurocraft_types import (
    Capability,
    CapabilityStatusEnum,
    ConfidenceEnum,
    Finding,
    SeverityEnum,
    VerdictLevel,
)


def test_risk_zero_for_clean_file():
    engine = DeterministicRiskEngine()
    verdict = engine.calculate_verdict(findings=[], capabilities=[])

    assert verdict.score == 0.0
    assert verdict.level == VerdictLevel.SAFE
    assert verdict.category_scores["yara_score"] is None
    assert verdict.category_scores["clamav_score"] is None
    assert verdict.category_scores["ml_score"] is None


def test_risk_accumulates_findings_and_capabilities():
    engine = DeterministicRiskEngine()

    critical_finding = Finding(
        id="F-01",
        category="STRUCTURE",
        title="Critical finding",
        description="test",
        severity=SeverityEnum.CRITICAL,
        confidence=ConfidenceEnum.HIGH,
        evidence={},
        source_engine="test",
    )
    high_finding = Finding(
        id="F-02",
        category="EVASION",
        title="High evasion finding",
        description="test",
        severity=SeverityEnum.HIGH,
        confidence=ConfidenceEnum.HIGH,
        evidence={},
        source_engine="test",
    )
    injection_cap = Capability(
        capability="process_injection_indicator",
        status=CapabilityStatusEnum.LIKELY,
        confidence=ConfidenceEnum.HIGH,
        evidence=["Imports VirtualAllocEx"],
    )

    verdict = engine.calculate_verdict(
        findings=[critical_finding, high_finding],
        capabilities=[injection_cap],
    )

    # 35 (critical) + 20 (high) + 20 (injection) = 75.0 (HIGH)
    assert verdict.score == 75.0
    assert verdict.level == VerdictLevel.HIGH
    assert verdict.category_scores["evasion_score"] == 20.0
    assert verdict.category_scores["capability_score"] == 20.0


def test_risk_score_capped_at_100():
    engine = DeterministicRiskEngine()

    many_criticals = [
        Finding(
            id=f"F-{i}",
            category="STRUCTURE",
            title=f"Crit {i}",
            description="desc",
            severity=SeverityEnum.CRITICAL,
            confidence=ConfidenceEnum.HIGH,
            evidence={},
            source_engine="test",
        )
        for i in range(10)
    ]

    verdict = engine.calculate_verdict(findings=many_criticals, capabilities=[])
    assert verdict.score == 100.0
    assert verdict.level == VerdictLevel.CRITICAL
