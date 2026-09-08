# System Threat Model (STRIDE)

**Document**: `docs/architecture/threat-model.md`  
**Status**: Initial Threat Analysis (Phase 0)

---

## 1. Overview

NeuroCraft uses the STRIDE threat modeling framework to systematically assess vulnerabilities across all architectural tiers.

---

## 2. STRIDE Assessment Matrix

| STRIDE Category | Threat Description | Attacker Objective | NeuroCraft Countermeasure |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged digital signatures, spoofed certificate authorities, or fake scan reports. | Deceive analysts into believing malicious file is authentic or benign. | Full X.509 certificate chain validation against trusted roots, CRL verification, Merkle proof validation. |
| **Tampering** | Alteration of scan results, modification of YARA rules, or tampering with local ledger. | Erase traces of malware compromise or alter forensic findings. | Append-only hash chain, cryptographic Merkle trees, optional blockchain anchoring, file integrity checksums on rule files. |
| **Repudiation** | An analyst or system denies having scanned or reported a specific artifact. | Disclaim liability or bypass forensic accountability. | Cryptographically signed scan reports and immutable provenance records. |
| **Information Disclosure** | Leakage of sensitive source code, proprietary binaries, or API credentials in logs. | Exfiltrate victim IP or proprietary trade secrets. | Centralized redaction in logging library, ephemeral quarantine storage with automatic deletion, zero raw data on public ledgers. |
| **Denial of Service** | Decompression bombs (zip-bombs), infinite parsing loops, gigantic file uploads. | Exhaust server memory/CPU and crash analysis workers. | 100 MB upload ceiling, 10:1 decompression ratio limit, 250 MB max extraction ceiling, 30-second per-engine timeout. |
| **Elevation of Privilege** | Exploiting parser bugs (e.g. buffer overflow in C-based PE/ELF parser) to execute code. | Gain host execution and compromise the scanning infrastructure. | Zero-execution mandate, unprivileged non-root worker execution, memory-safe abstractions, container isolation. |
