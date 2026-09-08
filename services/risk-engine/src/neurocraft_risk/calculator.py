"""Transparent deterministic risk calculator for NeuroCraft."""

from neurocraft_types import (
    Capability,
    CapabilityStatusEnum,
    Finding,
    ScanVerdict,
    SeverityEnum,
    VerdictLevel,
)

# Standard Risk Scoring Weights
SEVERITY_WEIGHTS = {
    SeverityEnum.CRITICAL: 35.0,
    SeverityEnum.HIGH: 20.0,
    SeverityEnum.MEDIUM: 10.0,
    SeverityEnum.LOW: 3.0,
    SeverityEnum.INFO: 0.0,
}

# Critical capability weights
CAPABILITY_WEIGHTS = {
    "process_injection_indicator": 20.0,
    "persistence": 10.0,
    "script_execution": 15.0,
    "credential_access_indicator": 20.0,
}


class DeterministicRiskEngine:
    """
    Computes a transparent, deterministic risk score from normalized findings and capabilities.
    Does NOT use random numbers or simulate fake ML inference.
    """

    def calculate_verdict(
        self,
        findings: list[Finding],
        capabilities: list[Capability],
    ) -> ScanVerdict:
        """
        Calculate overall score (0.0 to 100.0), risk level, and real category scores.
        """
        raw_score = 0.0

        # Category score accumulators
        static_points = 0.0
        evasion_points = 0.0
        capability_points = 0.0

        has_evasion_finding = False
        has_static_finding = False

        for f in findings:
            weight = SEVERITY_WEIGHTS.get(f.severity, 0.0)
            raw_score += weight

            if f.category in ("EVASION", "PACKING", "SECURITY_MITIGATION"):
                evasion_points += weight
                has_evasion_finding = True
            else:
                static_points += weight
                has_static_finding = True

        # Capability contributions
        has_high_risk_capability = False
        for c in capabilities:
            if c.capability in CAPABILITY_WEIGHTS:
                if c.status in (CapabilityStatusEnum.DETECTED, CapabilityStatusEnum.LIKELY):
                    cap_weight = CAPABILITY_WEIGHTS[c.capability]
                    raw_score += cap_weight
                    capability_points += cap_weight
                    has_high_risk_capability = True

        # Bound overall score between 0.0 and 100.0
        overall_score = min(100.0, max(0.0, round(raw_score, 1)))

        # Determine categorical risk level
        if overall_score >= 90.0:
            level = VerdictLevel.CRITICAL
        elif overall_score >= 70.0:
            level = VerdictLevel.HIGH
        elif overall_score >= 40.0:
            level = VerdictLevel.MEDIUM
        elif overall_score >= 20.0:
            level = VerdictLevel.LOW
        else:
            level = VerdictLevel.SAFE

        # Assemble genuine category scores (None if no findings in that category)
        category_scores: dict[str, float | None] = {
            "static_analysis_score": min(100.0, round(static_points, 1))
            if has_static_finding
            else 0.0,
            "evasion_score": min(100.0, round(evasion_points, 1)) if has_evasion_finding else 0.0,
            "capability_score": min(100.0, round(capability_points, 1))
            if has_high_risk_capability
            else 0.0,
            # Engines that have not run return None (NOT_ANALYZED)
            "yara_score": None,
            "clamav_score": None,
            "ml_score": None,
        }

        return ScanVerdict(
            level=level,
            score=overall_score,
            category_scores=category_scores,
        )
