# NeuroCraft ML Engine Service

**Module**: `services/ml-engine`  
**Package**: `src/neurocraft_ml`  

---

## 1. Responsibility

The **ML Engine** provides lightweight, CPU-optimized machine learning inference over extracted static file features. It:
* Transforms raw structural features (PE header attributes, section entropy, byte histograms, imported API calls) into normalized numerical vectors.
* Runs calibrated classification models (LightGBM, compact neural nets) packaged as ONNX runtime models.
* Computes continuous risk probabilities alongside calibrated confidence intervals.
* Produces an explicit `UNKNOWN` label whenever inputs are out-of-distribution or confidence falls below operational thresholds.
* Generates feature contribution vectors (TreeSHAP / attribution values) to support the Explainable AI layer.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `FeatureVector`: Dict/array of extracted numerical and categorical features from `services/scanner`.
  - `model_id`: Identifier and version of the model to execute (e.g., `pe_static_v1`).
* **Outputs**:
  - `MLPrediction`: Calibrated probability `[0.0, 1.0]`, uncertainty margin, classification label (`BENIGN`, `SUSPICIOUS`, `MALICIOUS`, `UNKNOWN`), and top contributing features.

---

## 3. Future Dependencies

* `onnxruntime`: High-performance cross-platform inference engine optimized for CPU execution.
* `numpy`: Fast vectorized numerical operations.
* `lightgbm`: Gradient boosting decision tree runtime.
* `scikit-learn`: Feature scaling and calibration routines.

---

## 4. Security & Free-First Considerations

* **NO PICKLE FILES**: Machine learning artifacts must strictly use `ONNX` or `SafeTensors` formats to eliminate arbitrary code execution vulnerabilities.
* **CPU Optimization**: All baseline models must execute efficiently on standard multi-core consumer CPUs without requiring CUDA or dedicated GPUs.
* **Model Integrity Verification**: The engine verifies the SHA-256 digest of model files against a signed manifest before loading them into memory.
* **Separation of Concerns**: ML inferences are treated as probabilistic indicators, never as absolute ground truth.

---

## 5. Planned Interfaces

```python
class BaseMLEngine(ABC):
    """Abstract interface for machine learning model inference."""
    @abstractmethod
    def predict(self, features: dict[str, Any]) -> MLPrediction:
        """Evaluate features and return a calibrated prediction with confidence."""
        pass

class ModelRegistry:
    """Manages loaded model versions and metadata manifests."""
    def get_model(self, model_id: str) -> BaseMLEngine:
        pass
```
