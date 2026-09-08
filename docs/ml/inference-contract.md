# Machine Learning Inference Contract

**Document**: `docs/ml/inference-contract.md`  
**Status**: Interface Specification (Phase 1)

---

## 1. Overview

NeuroCraft's scanner core uses a decoupled interface (`MLAnalysisEngine`) so that future machine learning models can be plugged in without refactoring the ingestion, feature extraction, or reporting pipelines.

In Phase 1, the scanner operates fully without ML models, reporting:
```json
"engines": {
  "ml": "NOT_CONFIGURED"
}
```

---

## 2. The `MLAnalysisEngine` Interface

Future models must implement the abstract contract defined in `services/ml-engine/src/neurocraft_ml/interface.py`:

```python
class MLAnalysisEngine(ABC):
    @abstractmethod
    def predict(self, features: dict[str, Any]) -> MLPrediction:
        """Run inference over extracted static features."""
        pass

    @abstractmethod
    def get_status(self) -> EngineStatusEnum:
        """Return operational status of ML engine."""
        pass
```

---

## 3. Required Output Schema

Every ML inference result returns a normalized `MLPrediction`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `model_name` | `str` | Model identifier (e.g. `pe_lightgbm_v1`). |
| `model_version` | `str` | Semantic release version (e.g. `1.0.0`). |
| `prediction` | `str` | Predicted category (`BENIGN`, `SUSPICIOUS`, `MALICIOUS`, `UNKNOWN`). |
| `probability` | `float` | Continuous calibrated risk probability ($0.0 \le p \le 1.0$). |
| `confidence` | `float` | Model confidence interval ($0.0 \le c \le 1.0$). |
| `features_used` | `list[str]` | Top feature names contributing to this inference. |
| `inference_time_ms`| `float` | Single-sample CPU latency in milliseconds ($< 150\text{ ms}$). |
| `status` | `EngineStatusEnum`| `COMPLETED`, `NOT_CONFIGURED`, or `FAILED`. |

---

## 4. Integration into the Scanner Orchestrator

The Scanner Orchestrator calls the ML engine after static feature extraction:

1. **Extractor Phase**: `extract_generic_features()` and format-specific extractors (e.g. `extract_pe_features()`) assemble the raw feature dictionary.
2. **ML Handoff**: `ml_engine.predict(features)` transforms features into a tensor or tabular array, checks model integrity, and computes inference.
3. **Synthesis**: The `MLPrediction` is passed to `DeterministicRiskEngine`, which incorporates the score with appropriate weighting.
4. **Fallback Handling**: If model weights are missing or corrupted, the engine logs an error, transitions to `status = EngineStatusEnum.NOT_CONFIGURED` or `FAILED`, and the rest of the scan finishes cleanly.
