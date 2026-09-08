# Data Flow Architecture

**Document**: `docs/architecture/data-flow.md`  
**Status**: Architecture Baseline (Phase 0)

---

## 1. End-to-End Scan Lifecycle

The complete lifecycle of a file scanned by NeuroCraft follows a strict sequential pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as User / Analyst
    participant API as API Gateway (/services/api)
    participant Storage as Quarantine Staging
    participant Worker as Task Worker (/services/worker)
    participant Scanner as Scanner Orchestrator (/services/scanner)
    participant ML as ML Engine (/services/ml-engine)
    participant Risk as Risk Engine (/services/risk-engine)
    participant Explain as Explanation Engine (/services/explanation-engine)
    participant Integrity as Integrity & Provenance (/services/integrity-service)
    participant DB as PostgreSQL & Ledger

    Analyst->>API: Upload suspicious file (multipart/form-data)
    API->>API: Validate size <= 100MB, sanitize filename
    API->>Storage: Stream file into isolated quarantine (UUID.bin)
    API->>Worker: Enqueue ScanTask(UUID)
    API-->>Analyst: Return 202 Accepted (task_id)

    Worker->>Scanner: Dispatch analysis job
    Scanner->>Scanner: Compute cryptographic hashes (SHA-256, etc.)
    Scanner->>Scanner: Extract magic bytes & structural headers
    Scanner->>Scanner: Evaluate YARA rules & ClamAV signatures
    Scanner->>Scanner: Validate Authenticode digital signatures
    Scanner->>ML: Pass extracted numerical features
    ML-->>Scanner: Return MLPrediction (probability, confidence, UNKNOWN flag)
    Scanner-->>Worker: Return RawEvidenceCollection

    Worker->>Risk: Synthesize evidence & ML prediction
    Risk-->>Worker: Return RiskAssessment (score, verdict, breakdown)

    Worker->>Explain: Generate human-readable narrative
    Explain-->>Worker: Return ExplanationReport (grounded citations)

    Worker->>Integrity: Build Merkle tree & construct provenance record
    Integrity-->>Worker: Return MerkleProof & ProvenanceRecord

    Worker->>DB: Store complete ScanResult JSON & append to ledger
    Worker->>Storage: UNCONDITIONALLY DELETE quarantine file
    Worker-->>API: Notify task completion

    Analyst->>API: Query /api/v1/scan/{task_id}
    API->>DB: Fetch ScanResult
    API-->>Analyst: Return structured report with evidence & proofs
```

---

## 2. Retention Policy

* **Raw File Artifacts**: Deleted immediately after step 14.
* **Evidence & Hash Manifests**: Retained in PostgreSQL and local append-only ledger for historical auditability and threat correlation.
