# NeuroCraft Explanation Engine Service

**Module**: `services/explanation-engine`  
**Package**: `src/neurocraft_explain`  

---

## 1. Responsibility

The **Explanation Engine** bridges machine-generated forensic telemetry and human comprehension. It translates technical indicators (e.g. `UPX-packed binary`, `WMI persistence strings`, `high .rsrc entropy`) into structured, human-readable security narratives:
* **Grounded Narrative Generation**: Synthesizes a coherent threat summary anchored strictly in verified evidence items.
* **Evidence Citation**: Maps every assertion in the explanation directly to an identifiable forensic finding (`evidence_id`).
* **Analyst Action Recommendations**: Offers actionable mitigation guidance (e.g. isolate host, block hash, inspect outbound DNS).
* **Zero Hallucination Guarantee**: If an LLM is enabled, strict constrained prompts and schemas prevent the model from fabricating or exaggerating findings.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `RiskAssessment`: The aggregated score and verdict from `services/risk-engine`.
  - `RawEvidenceCollection`: The full set of verified indicators from `services/scanner`.
* **Outputs**:
  - `ExplanationReport`:
    - `summary`: High-level plain English threat summary.
    - `key_findings`: List of critical indicators and their forensic significance.
    - `recommended_actions`: Contextual containment and remediation steps.
    - `cited_evidence_ids`: Explicit citations ensuring zero hallucination.

---

## 3. Future Dependencies

* Local Open-Source LLMs via `Ollama` or `llama.cpp` (e.g., Mistral-7B, Phi-3, Llama-3-8B) for local/offline environments.
* Fallback deterministic template generator when LLM inference is disabled or offline.
* `jinja2`: Template engine for deterministic report rendering.

---

## 4. Security & Free-First Considerations

* **No Paid Dependency**: The system functions completely without paid commercial LLM APIs.
* **Prompt Injection Defense**: Untrusted strings extracted from analyzed files (such as embedded binary strings or metadata tags) are sanitized and isolated in structured JSON delimiters to prevent prompt injection.
* **Non-Authoritative Explanations**: The explanation layer cannot alter or override the underlying risk score or evidence records.

---

## 5. Planned Interfaces

```python
class ExplanationEngine(ABC):
    """Generates explainable narrative reports grounded in forensic evidence."""
    @abstractmethod
    async def generate_explanation(
        self,
        risk_assessment: RiskAssessment,
        evidence: RawEvidenceCollection,
    ) -> ExplanationReport:
        pass
```
