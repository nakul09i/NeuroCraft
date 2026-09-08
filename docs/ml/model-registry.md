# Model Registry & Artifact Management

**Document**: `docs/ml/model-registry.md`  
**Status**: Artifact Specification (Phase 0)

---

## 1. Registry Architecture

NeuroCraft manages trained machine learning artifacts through a declarative manifest system. Every production model binary is tracked alongside an immutable metadata card.

---

## 2. Model Metadata Card Schema

```json
{
  "model_id": "pe_static_lightgbm",
  "version": "1.0.0",
  "artifact_format": "ONNX",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "feature_schema_version": "ember_v2",
  "target_format": "PE32/PE32+",
  "training_date": "2026-09-08",
  "training_dataset_id": "ember2024_temporal_h1",
  "metrics": {
    "auc_roc": 0.985,
    "recall_at_0_1_fpr": 0.912,
    "ece": 0.024
  },
  "operational_threshold": 0.75,
  "uncertainty_band": [0.40, 0.65],
  "author": "NeuroCraft ML Team",
  "license": "Apache-2.0"
}
```

---

## 3. Storage & Integrity Verification

1. Model files are stored outside of Git (via Git LFS or external object storage).
2. The runtime engine (`services/ml-engine`) verifies the SHA-256 digest of the `.onnx` file against its registry card before loading it into memory.
3. Unsigned or corrupted model files fail closed with an explicit audit error.
