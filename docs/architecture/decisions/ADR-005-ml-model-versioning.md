# ADR-005: Machine Learning Model & Feature Schema Versioning

**Status**: Proposed / Planned Decision Document  
**Date**: 2026-09-08  
**Implementation Phase**: Planned for Phase 3  

---

## Context

Machine learning models deployed in cybersecurity suffer from concept drift as malware authors adopt new evasion techniques. Without strict versioning and feature parity tracking, inference results become non-reproducible and unexplainable.

---

## Proposed Decision

1. Every model deployed into `services/ml-engine/` must have:
   - A semantic model version (e.g. `pe_classifier_v1.2.0`).
   - A linked feature schema version defining the exact vector ordering and normalization rules.
   - An immutable cryptographic hash (SHA-256) recorded in a signed model registry manifest.
   - Documented evaluation metrics (False Positive Rate at 99% Recall) on temporal benchmark splits.
2. Incompatible feature extractions must be rejected at inference time rather than processed silently.

---

## Consequences

* Guarantees complete auditability and reproducibility of forensic ML scores.
* Prevents silent performance degradation caused by mismatched feature extractors.
