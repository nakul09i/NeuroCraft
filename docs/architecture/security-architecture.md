# Security Architecture & Trust Boundaries

**Document**: `docs/architecture/security-architecture.md`  
**Status**: Architecture Baseline (Phase 0)

---

## 1. Security Philosophy

NeuroCraft operates under a zero-trust model regarding all processed files. Analyzed files must be assumed to be actively adversarial, designed to crash parsers, exhaust memory, exploit buffer overflows, or evade detection.

---

## 2. Trust Boundaries

```
[Untrusted Client / Web Browser]
       │
═══════╪═══════════════════════════════════════════════════════════════════ [Boundary 1: Ingress & TLS]
       ▼
[API Gateway (FastAPI)]
       │  • Enforces Max File Size (100MB)
       │  • Sanitizes File Names
       │  • Writes to Ephemeral Quarantine (Mode 0600)
═══════╪═══════════════════════════════════════════════════════════════════ [Boundary 2: Worker Quarantine]
       ▼
[Task Queue (Redis) & Worker Pool]
       │  • Drops Privileges (Non-root)
       │  • Enforces Timeout (30s per engine)
       │  • Memory bounds
       ▼
[Static Analysis Sub-Engines]
  ├── [PE / ELF / PDF Parsers] (Passive Header Inspection)
  ├── [YARA Engine] (Safe Pattern Matching)
  ├── [ClamAV Daemon] (Isolated Socket Interface)
  └── [ML Engine] (ONNX Runtime, SafeTensors, CPU-only)
═══════╪═══════════════════════════════════════════════════════════════════ [Boundary 3: Storage & Audit]
       ▼
[Evidence Synthesis & Integrity Ledger]
  ├── Hashes, Signatures & Merkle Proofs Only
  └── Ephemeral Quarantine Files Unconditionally DELETED
```

---

## 3. Core Defense Mechanisms

1. **Zero Execution Policy**: No execution subsystem or script engine is invoked during static analysis. Files are parsed strictly as passive binary data buffers.
2. **Decompression Bomb Defense**: Nested archives are restricted to a 10:1 uncompressed-to-compressed ratio, a 250 MB total ceiling, and a maximum recursion depth of 2.
3. **Safe Deserialization**: Python `pickle` is prohibited throughout the entire codebase. Machine learning models must be packaged as ONNX or SafeTensors.
4. **Secret Scrubbing**: The structured logging module sanitizes sensitive key-value pairs before writing to stdout or log files.
