# AGENTS.md — NeuroCraft AI & Developer Operating Principles

**Project**: NeuroCraft  
**Tagline**: *Detect. Verify. Prove.*  
**Status**: Phase 0 — Foundation & Standards  

This document defines non-negotiable architectural, security, engineering, and machine-learning constraints for all human developers and AI coding agents operating on the NeuroCraft codebase.

---

## 1. Security Mandates

1. **Zero Execution of Untrusted Files**:
   - **NEVER** execute uploaded files, downloaded samples, or archive contents as part of static scanning or triage.
   - Analysis must occur exclusively through safe, out-of-process static inspection (parsers, byte analysis, metadata extractors).
2. **Never Trust File Extensions**:
   - File extensions are purely user-supplied hints. Always determine file type using content inspection, magic byte signatures, and structured binary format headers.
3. **Strict Path Sanitization**:
   - Sanitize all file and archive entry names before writing or referencing on disk.
   - Strictly prevent directory traversal attacks (e.g., `../`, `..\\`, null bytes).
   - Prevent symlink and hardlink attacks. Never follow symlinks targeting paths outside the isolated analysis workspace.
4. **Enforce Boundary Limits**:
   - Enforce strict maximum file size limits on upload and ingestion.
   - Enforce archive expansion ratio limits (zip-bomb / decompression-bomb mitigation).
   - Enforce recursion depth limits for nested archives and container formats (default max depth: 2).
   - Enforce execution timeouts on every parser, extraction routine, and external tool call.
5. **Credential & Secret Hygiene**:
   - **NEVER** commit secrets, passwords, private keys, certificates, or real API tokens to version control.
   - **NEVER** expose secrets, tokens, or environment keys in logs, telemetry, error messages, or API responses.
6. **Data Retention & Privacy**:
   - **NEVER** store raw uploaded user files permanently unless the system has been explicitly configured with persistent opt-in storage.
   - Clean up temporary files in isolated scratch workspaces immediately following processing.
7. **Integrity & Blockchain Boundaries**:
   - **NEVER** write raw file bytes or personally identifiable information (PII) to an integrity ledger or blockchain.
   - Only cryptographic hashes, Merkle root proofs, and structured metadata attestations may be anchored.
   - Blockchain and provenance services **MUST** remain optional. The platform must be fully functional offline and without decentralized anchoring.
8. **Offline First-Class Operation**:
   - Offline scanning must operate cleanly without requiring internet access or active external network sockets.
   - External threat intelligence enrichments must remain strictly optional enhancements, never critical blockers.

---

## 2. AI / Machine Learning Principles

1. **Probabilistic vs. Deterministic Separation**:
   - Keep deterministic evidence (cryptographic hashes, digital signatures, valid YARA matches, known virus signatures) strictly separated from probabilistic machine learning inferences.
   - No single ML model output may be treated as absolute ground truth.
2. **Mandatory Confidence & Calibration**:
   - All ML inferences must output calibrated probabilities or confidence intervals alongside categorical labels.
   - `UNKNOWN` is a valid, first-class result when confidence falls below operational thresholds or when file structures are out-of-distribution.
3. **No Unsubstantiated Claims**:
   - Never claim 100% detection accuracy or zero false positives.
   - Explicitly document operational False Positive Rates (FPR) and False Negative Rates (FNR) at defined decision thresholds.
4. **Strict Model & Dataset Governance**:
   - Every model artifact must be explicitly versioned, timestamped, and linked to its feature schema.
   - Every dataset split must be versioned, immutable, and tracked by manifest hashes.
   - Prevent train/test data leakage.
   - Prefer temporal evaluation (training on historical timeframes, evaluating on subsequent chronological timeframes) over random K-fold splits to accurately assess malware concept drift.
5. **Responsible LLM Usage**:
   - Generative AI / Large Language Models may be used to explain machine-generated evidence and synthesize readable incident summaries.
   - LLMs **MUST NOT** invent, extrapolate, or hallucinate detection findings that lack underlying structural evidence.
   - Inferences and explanations must clearly cite the exact scanner evidence items supporting them.

---

## 3. Engineering & Architecture Standards

1. **Free-First & Student-Friendly Architecture**:
   - Core functionality must run locally using free, open-source software (FOSS).
   - Zero mandatory paid API keys or cloud service subscriptions are required to develop, build, test, or run NeuroCraft.
   - CPU execution must be prioritized for all ML models so that specialized GPU hardware is not a barrier for student developers. Heavy models must be optional and lazy-loaded.
   - Use PostgreSQL over proprietary cloud databases; use Redis over proprietary queues; use local ClamAV and YARA over commercial AV engines.
2. **Modular Monorepo Design**:
   - Maintain cleanly separated modules under `services/`, `packages/`, and `apps/` with clear public interfaces.
   - Do **NOT** introduce distributed-system microservice complexity in early phases. Services will initially execute as co-located modules or a small number of deployable units.
3. **Type Safety & Contracts**:
   - All shared data models, API payloads, and inter-service schemas must be strictly typed (e.g., Pydantic models in Python, TypeScript interfaces in UI/CLI).
4. **Configuration & Secrets**:
   - Manage configuration entirely through environment variables and strongly-typed config models (`packages/shared-config`).
   - Provide safe, commented `.env.example` templates.
5. **Testing & Quality Gates**:
   - Every security-sensitive function (path parsing, archive extraction, signature verification) must have comprehensive unit and edge-case tests.
   - Every API route requires contract and integration tests.
   - Do not write fake or dummy tests simply to pass CI.
   - Maintain reproducible builds and locked dependencies.

---

## 4. Git & Repository Hygiene

1. **No Live Malware**:
   - **NEVER** commit live executable malware samples into the repository.
   - Use safe test fixtures (e.g., benign test strings, structured mock headers, EICAR standard antivirus test files) located in `test-fixtures/`.
2. **No Large Binaries or Datasets**:
   - Do not commit large datasets (`datasets/raw/*`) or multi-gigabyte model weights directly to Git.
   - Use external artifact registries, Git LFS, or remote storage manifests for heavy binary assets.
3. **Clean Commits**:
   - Follow Conventional Commits format (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
   - Never commit `.env`, `.pem`, `.key`, or cache artifacts.

---

*By order of the NeuroCraft Architecture Review Board.*
