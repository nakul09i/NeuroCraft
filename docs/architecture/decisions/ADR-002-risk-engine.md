# ADR-002: Multi-Engine Risk Synthesis & Deterministic Overrides

**Status**: Proposed / Planned Decision Document  
**Date**: 2026-09-08  
**Implementation Phase**: Planned for Phase 4  

---

## Context

Malware detection tools often fail when they rely exclusively on one paradigm:
* Signatures (YARA, ClamAV) fail against polymorphic or zero-day malware.
* Machine learning classifiers produce false positives on benign edge cases (e.g., packers, uncommon compilers) and are susceptible to adversarial evasion.

---

## Proposed Decision

We propose a multi-layered Risk Engine architecture combining:
1. **Deterministic Overrides**: If a verified cryptographic signature belongs to a known-trusted vendor (e.g., Microsoft WHQL, Google) and no YARA rule matches, risk is capped. Conversely, if a definitive malware signature (ClamAV/YARA) is matched, the file is immediately classified as `MALICIOUS` regardless of ML output.
2. **Weighted Ensemble**: Combines static structural entropy, import anomalies, and ML probabilities into a continuous 0–100 score.
3. **Calibrated Uncertainty**: If confidence drops below threshold $\tau$, output `UNKNOWN`.

---

## Consequences

* Provides transparent, audit-ready verdicts.
* Prevents ML false positives from overriding hard cryptographic and signature realities.
* Detailed weighting parameters will be finalized and validated in Phase 4.
