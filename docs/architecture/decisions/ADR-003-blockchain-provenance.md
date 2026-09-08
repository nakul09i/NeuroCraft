# ADR-003: Tamper-Evident Provenance & Optional Decentralized Anchoring

**Status**: Proposed / Planned Decision Document  
**Date**: 2026-09-08  
**Implementation Phase**: Planned for Phase 6  

---

## Context

Security scan records and forensic reports are often subject to dispute or tampering during post-incident investigations. While local append-only hash chains guarantee local tamper-detection, an external anchor provides public non-repudiation.

However, mandating blockchain infrastructure would violate NeuroCraft's **Free-First (FOSS)** and student-friendly ethos.

---

## Proposed Decision

1. The primary provenance mechanism is a **local, zero-cost, append-only Merkle-tree transparency log**.
2. **Blockchain anchoring is strictly OPTIONAL**.
3. When enabled, only aggregated batch Merkle roots (never individual file hashes, PII, or raw bytes) are anchored to a supported network (e.g. EVM-compatible chain or local Ganache/Anvil node).
4. The system remains 100% operational when blockchain features are disabled or offline.

---

## Consequences

* No gas fees, wallet keys, or cryptocurrency are required for normal operation.
* Enterprise or institutional users can optionally enable decentralized non-repudiation.
