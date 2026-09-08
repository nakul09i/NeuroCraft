# NeuroCraft Risk Engine Service

**Module**: `services/risk-engine`  
**Package**: `src/neurocraft_risk`  

---

## 1. Responsibility

The **Risk Engine** acts as the synthesis and decision layer of NeuroCraft. Rather than relying blindly on a single heuristic or ML classifier, the Risk Engine combines disparate evidence streams into a unified, transparent risk assessment:
* **Deterministic Overrides**: A valid digital signature from a trusted vendor or a definitive ClamAV signature match provides strong deterministic boundaries.
* **Multi-Engine Weighting**: Synthesizes scores from YARA rule matches, structural anomalies (e.g. high section entropy, suspicious imports), and ML model predictions.
* **Confidence Scoring**: Evaluates the consistency across engines to output an overall confidence metric alongside the numerical risk score.
* **Verifiable Evidence Ledger**: Compiles an immutable evidence breakdown detailing why a verdict was reached.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `RawEvidenceCollection`: Structural and signature evidence from `services/scanner`.
  - `MLPrediction`: Probabilities and confidence from `services/ml-engine`.
  - `SignatureStatus`: Cryptographic validation outcome from Authenticode/PKCS#7.
* **Outputs**:
  - `RiskAssessment`:
    - `overall_score`: Continuous risk score `[0.0, 100.0]`.
    - `verdict`: Categorical outcome (`CLEAN`, `SUSPICIOUS`, `MALICIOUS`, `UNKNOWN`).
    - `confidence`: Confidence score `[0.0, 1.0]`.
    - `breakdown`: Component-by-component risk attribution table.

---

## 3. Future Dependencies

* `packages/shared-types`: Standard schemas for Evidence and Risk.
* `numpy`: Fast weighted mathematical matrix aggregation.

---

## 4. Security Considerations

* **Explainable Determinism**: Security analysts must be able to audit exactly how the score was calculated. Black-box arithmetic is prohibited.
* **Anti-Evasion Hardening**: An attacker manipulating one dimension (e.g. padding zeroes to lower entropy) cannot override definitive indicators detected in other dimensions (e.g. YARA rule matches).

---

## 5. Planned Interfaces

```python
class RiskEngine:
    """Combines deterministic findings and probabilistic ML scores into a defensible verdict."""
    def calculate_risk(
        self,
        evidence: RawEvidenceCollection,
        ml_prediction: Optional[MLPrediction],
        signature_status: SignatureVerificationResult,
    ) -> RiskAssessment:
        pass
```
