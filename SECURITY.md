# Security Policy & Architecture

**Project**: NeuroCraft  
**Tagline**: *Detect. Verify. Prove.*  

Security is the cornerstone of NeuroCraft. As a platform designed to inspect potentially malicious, malformed, and hostile files, NeuroCraft itself must operate under an adversarial threat model.

---

## 1. Non-Negotiable Core Mandate: Zero Execution

> **CRITICAL SECURITY MANDATE**  
> **NeuroCraft MUST NEVER execute untrusted files, archive payloads, or embedded scripts as part of normal static scanning or triage.**
>
> All analysis operations must be strictly passive and static: extracting byte sequences, parsing structured headers (e.g., PE, ELF, PDF), computing cryptographic hashes, evaluating pattern rules (YARA), running offline signature heuristics (ClamAV), and feeding numerical feature vectors into machine learning models.

---

## 2. Threat Model Overview

NeuroCraft assumes that any input provided to the system could be actively hostile and crafted to compromise the scanner itself. We specifically guard against:

| Threat Category | Potential Attack Vector | NeuroCraft Mitigation |
| :--- | :--- | :--- |
| **Parser Exploits** | Corrupt PE/ELF/PDF headers crafted to trigger buffer overflows or memory corruption | Safe parsers, memory-safe abstractions, bounded reads, process isolation. |
| **Resource Exhaustion (DoS)** | Zip-bombs, nested archives, recursive structures | Decompression ratio caps, recursion depth limits, hard execution timeouts. |
| **Filesystem Traversal** | Malicious archive entry paths (`../../etc/passwd`, null bytes) | Canonical path validation, symlink rejection, randomized isolated staging dirs. |
| **Adversarial ML Attacks** | Byte perturbations and feature spoofing to bypass classification | Ensemble architectures, calibrated uncertainty thresholds, deterministic overrides. |
| **Data & Secret Leaking** | Extraction of API keys or PII through log files or error traces | Centralized redaction filter (`packages/shared-logging`), no persistent raw file storage. |

---

## 3. Untrusted File Handling & Upload Security

1. **Streaming Ingestion & Quarantine**:
   - Uploaded files are streamed directly into an ephemeral quarantine directory with strictly restricted file permissions (e.g., read-only for worker, no execution bit set).
2. **Size Limitations**:
   - Enforce hard limits on raw file sizes (e.g., maximum 100 MB per file in default configuration). Files exceeding this threshold are rejected before consumption.
3. **Magic Byte Verification**:
   - The file extension provided by the user or client is treated strictly as an untrusted string.
   - True file types are determined solely by magic byte signatures and structural inspection.
4. **Filename Sanitization**:
   - Filenames are normalized, stripped of non-printable or dangerous characters, and assigned an internal UUID for all filesystem references.

---

## 4. Archive Security & Decompression Controls

To protect against archive expansion bombs and malicious directory traversal:

1. **Expansion Ratio Limit**: A maximum expansion ratio of 10:1 is enforced. If uncompressed bytes exceed 10x the compressed archive size, extraction aborts immediately.
2. **Max Decompressed Ceiling**: An absolute ceiling (default: 250 MB total uncompressed volume) is enforced across the entire archive.
3. **Recursion Depth**: Nested archives are evaluated to a maximum depth of 2 levels.
4. **Safe Extraction Pathing**: Every extracted entry path is resolved and verified to ensure it strictly resides within the target staging directory. Any entry containing relative path components (`..`) or absolute references is discarded and flagged.

---

## 5. Static Analysis Isolation

All parsing and external engine executions (such as YARA and ClamAV) must run within bounded execution environments:

* Execution timeouts (e.g., maximum 30 seconds per engine).
* Memory usage caps.
* Subprocess execution with lowest privilege (non-root / restricted user).
* In future containerized deployments, scanner workers run in unprivileged containers with read-only root filesystems and no outbound internet access.

---

## 6. Secrets Management

* **Zero Hardcoded Secrets**: No credentials, private signing keys, or tokens may exist in the repository.
* **Environment Configuration**: All secrets are loaded via environment variables (`.env` or container secrets) and validated through strongly typed Pydantic models.
* **Verification Audits**: Continuous scanning (`scripts/security/check_secrets.py`) prevents accidental commits of secrets.

---

## 7. Logging Policy & Privacy

* **Strict Redaction**: The shared logging library (`packages/shared-logging`) automatically scrubs authorization tokens, credentials, API keys, and sensitive environment variables from logs.
* **No Raw File Retention**: Temporary files in quarantine staging are deleted immediately upon completion of the analysis pipeline.
* **Metadata Minimization**: Telemetry and logs preserve cryptographic hashes (SHA-256) and analysis findings, never raw file contents or confidential document data.

---

## 8. Model Security & Supply Chain

1. **Model Format Safety**:
   - Neural network and machine learning models are stored exclusively in safe serialization formats (ONNX, SafeTensors).
   - **NEVER** use standard Python `pickle` files for model deployment due to arbitrary code execution risks.
2. **Model Integrity**:
   - All model weights and metadata are verified against cryptographic SHA-256 hashes prior to loading into the inference engine.
3. **Adversarial Robustness**:
   - Classifiers undergo adversarial testing against evasion perturbations (e.g., header padding, benign section injection).

---

## 9. Dependency & Supply Chain Security

* All direct and transitive dependencies must specify pinned versions or strict semantic ranges in `pyproject.toml` and lockfiles.
* Automated vulnerability auditing (e.g., `pip-audit`, Dependabot) is integrated into CI.
* Third-party libraries are reviewed for permissive open-source licenses and active maintenance.

---

## 10. Future Dynamic Sandbox Architecture

In a planned future phase, dynamic execution analysis (behavioral monitoring, API hooking, network capture) may be introduced.

* When implemented, dynamic analysis will be strictly isolated in dedicated, short-lived micro-VMs (e.g., Firecracker / QEMU) on dedicated sandbox hosts.
* **The static scanner core will always remain decoupled from dynamic sandbox runners.**

---

## 11. Reporting Security Vulnerabilities

If you discover a security vulnerability in NeuroCraft, please do not open a public issue. Email security reports to `security@neurocraft.local` or follow the responsible disclosure process in our GitHub repository.
