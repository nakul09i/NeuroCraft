# NeuroCraft Web Application (Placeholder)

**Path**: `apps/web`  
**Future Technology**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.

---

## Planned Responsibilities

1. **Analysis Dashboard**: Interactive interface for dragging and dropping suspicious files into quarantine staging.
2. **Multi-Engine Evidence Viewer**: Visual breakdown of forensic indicators:
   - File hashes (MD5, SHA-1, SHA-256, SSDEEP).
   - Magic byte validation and header anomalies.
   - YARA rule match inspection with matching byte offsets.
   - ClamAV heuristic results.
   - Digital signature hierarchy and certificate validity tree.
   - ML model confidence gauge with calibrated uncertainty metrics.
3. **Risk Score Breakdown**: Visual radar/bar charts showing risk contribution by individual engines.
4. **Explainable AI Insights**: Human-readable narrative summarizing detected threats and forensic significance without AI hallucination.
5. **Integrity & Provenance Verifier**: Interactive Merkle-tree visualizer allowing users to inspect cryptographic proofs and anchor status.
6. **Offline Indicator**: Clear visual badges denoting whether the client is in air-gapped/offline mode or connected to external enrichment.

---

## Phase 0 Status

* Scaffolded only. No client build dependencies installed in Phase 0.
* Full UI development will commence in Phase 5 after core backend engines are established.
