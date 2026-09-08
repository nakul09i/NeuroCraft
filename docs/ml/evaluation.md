# Machine Learning Evaluation & Metrics Protocol

**Document**: `docs/ml/evaluation.md`  
**Status**: Evaluation Standards (Phase 0)

---

## 1. Core Metrics & Constraints

In cybersecurity, False Positives are catastrophic — blocking a critical business executable or system driver degrades operations. Therefore, NeuroCraft measures performance at strictly bounded operational thresholds:

* **FPR Ceiling**: Primary benchmark metric is **True Positive Rate (TPR / Recall) at 0.1% (0.001) and 1.0% (0.01) False Positive Rate (FPR)**.
* **ROC-AUC**: Overall discrimination capability across all thresholds.
* **Expected Calibration Error (ECE)**: Assesses whether predicted probabilities align with observed empirical frequencies.
* **Inference Latency**: Single-file CPU inference latency must remain $< 150\text{ ms}$ on a standard 4-core consumer CPU.

---

## 2. Temporal Drift Testing

* Models must be evaluated across multi-month temporal gaps (e.g., trained on January–June data, evaluated on July–December data) to document performance degradation due to threat landscape evolution.

---

## 3. Adversarial Robustness Benchmarking

Models must be tested against simulated evasive modifications:
* Appending benign overlays to PE binaries.
* Manipulating section names or timestamp headers.
* Padding zero bytes or high-entropy data chunks.
