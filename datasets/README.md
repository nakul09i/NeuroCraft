# NeuroCraft Dataset Governance & Safety Policy

**Path**: `datasets/`  

---

## 1. Non-Negotiable Safety Mandate: ZERO LIVE MALWARE

> **CRITICAL REPOSITORY RULE**  
> **NEVER commit live executable malware samples, packed payloads, or active exploit binaries into this repository or any Git branch.**

All machine learning training and evaluation must rely strictly on:
* Disembodied numerical feature matrices (e.g. EMBER vectorized features).
* Extracted structural metadata (JSON/Parquet manifests of PE headers, section counts, byte entropy).
* Harmless benign fixture binaries and synthetic mocks.

---

## 2. Directory Structure & Lifecycle

```
datasets/
├── raw/            # Raw metadata/feature archives (gitignored; download on-demand)
├── normalized/     # Cleaned, deduplicated feature records
├── features/       # Extracted numerical feature tensors / tabular datasets
├── labels/         # Ground-truth verdict annotations (BENIGN, MALWARE, FAMILY)
├── splits/         # Manifests defining train/val/test splits (temporal partitions)
└── manifests/      # SHA-256 checksums and provenance metadata for every dataset
```

---

## 3. Approved Research Datasets

Future ML phases will leverage reputable, academically recognized cybersecurity benchmark datasets:

* **EMBER / EMBER2024** (Elastic Malware Benchmark for Empowering Researchers):
  - Standardized benchmark of PE files parsed into 2,381 feature dimensions.
  - Provided as extracted feature files, not live malware binaries.
  - License: Permissive open research license (Creative Commons / MIT).
* **SOREL-20M** (Sophos-ReversingLabs):
  - Large-scale feature and metadata dataset with disembodied features.
* **Malfease / Benign Corpora**:
  - Open-source benign software repositories (e.g., standard Windows/Linux system packages, PortableApps) for true negative calibration.

---

## 4. Licensing & Ethical Acquisition

Before any external dataset is utilized:
1. Verify license compliance (ensure non-restrictive, non-commercial/commercial compatibility).
2. Document provenance, author attribution, collection date, and version in `manifests/`.
3. Verify that zero proprietary or sensitive PII is included in feature extractions.

---

## 5. Temporal Partitioning Mandate

Malware evolves continuously over time. Traditional random k-fold cross-validation results in severe data leakage and produces artificially inflated accuracy metrics.

* All NeuroCraft datasets must be partitioned **temporally** (e.g., train on Q1-Q3 samples; validate on Q4 samples).
* The test split must strictly represent future chronological samples to validate real-world detection robustness.
