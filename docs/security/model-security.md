# Machine Learning Model Security

**Document**: `docs/security/model-security.md`  
**Status**: Security Guidelines (Phase 0)

---

## 1. Threat Landscape for Cybersecurity ML

1. **Pickle Insecurity**: Python's native `pickle` serializer allows arbitrary code execution upon deserialization (`__reduce__` exploit).
2. **Adversarial Perturbations**: Attackers append benign bytes to packed malware to lower entropy or alter feature histograms.
3. **Model Poisoning**: Tampering with training sets to create targeted blindspots.

---

## 2. Hardening Measures

* **Safe Serialization Only**: ONNX and SafeTensors formats are strictly enforced. Python `.pkl` and `.joblib` model binaries are prohibited.
* **Cryptographic Signatures & Checksums**: Model weights are checked against SHA-256 digests in signed manifests.
* **Deterministic Fallback Overrides**: ML is never the sole arbiter of threat status. YARA rule matches and ClamAV signatures override ML benign classifications.
* **Uncertainty Rejection**: Low-confidence or out-of-distribution inputs yield `UNKNOWN`, prompting manual triage rather than silent false negatives.
