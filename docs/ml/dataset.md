# Machine Learning Datasets & Ingestion Strategy

**Document**: `docs/ml/dataset.md`  
**Status**: Strategy Specification (Phase 0)

---

## 1. Safety & Data Hygiene Policy

NeuroCraft mandates that **no live malware executables** be permanently stored or committed to the repository.

All machine learning feature extraction is designed to run in isolated staging environments. For model development and benchmarking, we utilize vectorized tabular feature sets:
* **EMBER (Elastic Malware Benchmark for Empowering Researchers)**: Feature vectors extracted from 1M+ PE files (benign and malicious).
* **SOREL-20M**: Pre-extracted feature vectors and metadata from 20 million files.
* **Curated Benign Datasets**: Clean Windows system binaries, open-source utilities, and harmless fixtures to prevent false positive skew.

---

## 2. Dataset Pipeline Stages

1. **Acquisition & Verification**:
   - Verify SHA-256 integrity against publisher manifests.
   - Validate permissible research/commercial licensing.
2. **Deduplication**:
   - Deduplicate files based on SHA-256 and fuzzy hashing (SSDEEP) to prevent identical samples from polluting train and test splits.
3. **Temporal Partitioning**:
   - Group samples by chronological first-seen timestamps (e.g. 2023 vs 2024).
   - Ensure the test split is purely forward-looking in time.
4. **Manifest Cataloging**:
   - Record split statistics, class distributions, and manifest digests in `datasets/manifests/`.
