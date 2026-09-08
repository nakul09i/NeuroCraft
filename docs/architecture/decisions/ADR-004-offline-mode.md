# ADR-004: First-Class Offline & Air-Gapped Mode

**Status**: Proposed / Planned Decision Document  
**Date**: 2026-09-08  
**Implementation Phase**: Planned for Phase 1–5  

---

## Context

Security teams often operate in air-gapped environments, military enclaves, or isolated forensic networks where outbound internet access is strictly prohibited. Additionally, student developers may have intermittent internet connectivity.

---

## Proposed Decision

1. **Offline mode is a first-class citizen** across all layers of NeuroCraft:
   - Static parsers must never make network calls.
   - YARA rules and ClamAV signatures must be locally loaded from disk.
   - ML inference must execute locally via CPU (ONNX Runtime) using bundled weights.
   - Evidence explanation must use local language models (Ollama/llama.cpp) or deterministic fallback templates.
2. External threat intelligence and public blockchain anchoring must fail gracefully or be omitted when running in offline mode.

---

## Consequences

* Enables deployment in high-security, classified, or zero-connectivity environments.
* Guarantees student developers can work completely offline without cloud API blockers.
