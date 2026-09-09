"""Transparent deterministic risk and confidence calculator for NeuroCraft."""

from neurocraft_types import (
    Capability,
    CapabilityStatusEnum,
    ConfidenceEnum,
    FileTypeInfo,
    Finding,
    ScanVerdict,
    SeverityEnum,
    VerdictLevel,
)

# Standard Risk Scoring Weights
SEVERITY_WEIGHTS: dict[SeverityEnum, float] = {
    SeverityEnum.CRITICAL: 35.0,
    SeverityEnum.HIGH: 20.0,
    SeverityEnum.MEDIUM: 10.0,
    SeverityEnum.LOW: 3.0,
    SeverityEnum.INFO: 0.0,
}

# Critical capability weights
CAPABILITY_WEIGHTS: dict[str, float] = {
    "process_injection_indicator": 20.0,
    "persistence": 10.0,
    "script_execution": 15.0,
    "credential_access_indicator": 20.0,
}

# Category contribution caps to avoid double-counting correlated indicators
CATEGORY_CAPS: dict[str, float] = {
    "EVASION": 30.0,
    "ENTROPY": 20.0,
    "NETWORK": 10.0,
    "FORMAT_INDICATOR": 5.0,
    "PARSER_FAULT": 5.0,
    "INTEGRITY": 15.0,
}


class DeterministicRiskEngine:
    """
    Computes a transparent, deterministic risk score and separate analytic confidence.
    Does NOT use random numbers, fake ML hallucinations, or ungrounded scores.
    """

    def calculate_verdict(
        self,
        findings: list[Finding],
        capabilities: list[Capability],
        file_type_info: FileTypeInfo | None = None,
    ) -> ScanVerdict:
        """
        Calculate overall score (0.0 to 100.0), categorical risk level, and separate confidence.
        """
        # 1. Correlated Score Accumulation
        category_points: dict[str, float] = {}
        static_points = 0.0
        evasion_points = 0.0
        capability_points = 0.0

        has_evasion_finding = False
        has_static_finding = False
        has_parser_fault = False

        for f in findings:
            weight = SEVERITY_WEIGHTS.get(f.severity, 0.0)
            f.weight = weight

            cat = f.category
            category_points[cat] = category_points.get(cat, 0.0) + weight

            if cat in ("EVASION", "PACKING", "SECURITY_MITIGATION"):
                evasion_points += weight
                has_evasion_finding = True
            else:
                static_points += weight
                has_static_finding = True

            if cat == "PARSER_FAULT":
                has_parser_fault = True

        # Apply category caps to prevent runaway scores from correlated sub-indicators
        raw_score = 0.0
        for cat, points in category_points.items():
            cap = CATEGORY_CAPS.get(cat)
            if cap is not None:
                raw_score += min(points, cap)
            else:
                raw_score += points

        # 2. Capability Contributions
        has_high_risk_capability = False
        for c in capabilities:
            if c.capability in CAPABILITY_WEIGHTS:
                if c.status in (CapabilityStatusEnum.DETECTED, CapabilityStatusEnum.LIKELY):
                    cap_weight = CAPABILITY_WEIGHTS[c.capability]
                    raw_score += cap_weight
                    capability_points += cap_weight
                    has_high_risk_capability = True

        # Bound overall score between 0.0 and 100.0 (strictly deterministic)
        overall_score = min(100.0, max(0.0, round(raw_score, 1)))

        # 3. Categorical Risk Level (Documented Standard Thresholds)
        # 0–19 SAFE, 20–39 LOW, 40–59 MEDIUM, 60–79 HIGH, 80–100 CRITICAL
        if overall_score >= 80.0:
            level = VerdictLevel.CRITICAL
        elif overall_score >= 60.0:
            level = VerdictLevel.HIGH
        elif overall_score >= 40.0:
            level = VerdictLevel.MEDIUM
        elif overall_score >= 20.0:
            level = VerdictLevel.LOW
        else:
            level = VerdictLevel.SAFE

        # 4. Separate Confidence Calculation (Separates Risk from Confidence)
        # Confidence reflects analyzer coverage, parser depth, and evidence completeness.
        base_confidence = 0.95

        if file_type_info is not None:
            if not file_type_info.is_supported:
                # Unsupported format: limited analysis -> low confidence
                base_confidence = 0.35
            elif file_type_info.type.value == "UNKNOWN":
                base_confidence = 0.25

        if has_parser_fault:
            base_confidence = min(base_confidence, 0.55)

        confidence_score = round(max(0.1, min(1.0, base_confidence)), 2)

        if confidence_score >= 0.80:
            confidence_level = ConfidenceEnum.HIGH
        elif confidence_score >= 0.50:
            confidence_level = ConfidenceEnum.MEDIUM
        else:
            confidence_level = ConfidenceEnum.LOW

        # 5. Assemble Genuine Category Scores
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
            confidence=confidence_level,
            confidence_score=confidence_score,
            category_scores=category_scores,
        )
