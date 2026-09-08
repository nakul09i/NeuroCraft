# NeuroCraft Shared Types & Contracts

**Package**: `packages/shared-types`  
**Namespace**: `neurocraft_types`  

---

## Responsibility

Defines the canonical, strongly typed data schemas and domain models used across all NeuroCraft services, clients, and pipelines. Built on Pydantic v2 to guarantee runtime validation, JSON Schema compatibility, and strict type safety.

---

## Exported Domain Models

* `VerdictEnum`: Categorical assessment outcomes (`CLEAN`, `SUSPICIOUS`, `MALICIOUS`, `UNKNOWN`).
* `HashDigest`: Multi-algorithm cryptographic hash container (MD5, SHA-1, SHA-256, SHA-512, SSDEEP).
* `EvidenceItem`: Normalized forensic observation from static scanners, rules, and parsers.
* `MLPrediction`: Machine learning probability, confidence interval, and feature importance.
* `RiskAssessment`: Aggregated risk score, verdict, confidence, and engine breakdown.
* `IntegrityProof`: Merkle inclusion proof and optional blockchain anchoring status.
* `ScanResult`: Unified comprehensive scan report.
