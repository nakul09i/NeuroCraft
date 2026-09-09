# NeuroCraft — Step 6: Scan History & Report Generation Engine

## 1. Overview

NeuroCraft Step 6 establishes an evidence-based, audit-ready **Scan History and Consolidated Reporting Engine**. Every analyzed file, passive reconnaissance engagement, and digital integrity check is automatically indexed into a persistent, searchable, and retrievable investigation record in local SQLite.

Users can seamlessly:
1. Inspect past analyses with fast substring searching (`filename`, `SHA-256`), multi-attribute filtering (`risk_level`, `status`), deterministic sorting (`newest`, `oldest`, `highest_risk`, `lowest_risk`), and pagination (`limit`, `offset`).
2. Explore scan results via progressive disclosure:
   - **Executive Summary & Verdict Callout**
   - **File Identification & Cryptographic Fingerprints**
   - **Risk Assessment & Confidence Calibration**
   - **Detailed Security Findings & Categorized Evidence**
   - **Trust & Digital Signature Integrity** (Certificates, Signers, Authenticode, CMS)
   - **Correlated Passive Reconnaissance** (DNS, TLS, exposure metrics for embedded network IOCs)
   - **Operational Limitations & Anti-Hallucination Disclaimers**
   - **Technical Details & Reference Attestations**
3. Export comprehensive audit dossiers directly in **PDF**, **RFC 4180 CSV**, and **Sanitized JSON** formats with zero external cloud dependencies.

---

## 2. Core Architecture

```
                               ┌─────────────────────────┐
                               │  NeuroCraft Frontend    │
                               │  (React 19 + Vite + TS) │
                               └────────────┬────────────┘
                                            │ HTTP / REST
                                            ▼
                               ┌─────────────────────────┐
                               │   FastAPI Backend API   │
                               │   (/api/v1/scans &      │
                               │    /api/v1/reports)     │
                               └────────────┬────────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               ▼                            ▼                           ▼
     ┌───────────────────┐        ┌───────────────────┐       ┌───────────────────┐
     │ Scan Repository   │        │ Report Generator  │       │ Report Exporters  │
     │ (Filtered queries,│        │ (Multi-artifact   │       │ - Pure Python PDF │
     │  recon link,      │        │  synthesizer &    │       │ - RFC 4180 CSV    │
     │  eager integrity) │        │  recommendations) │       │ - Sanitized JSON  │
     └─────────┬─────────┘        └─────────┬─────────┘       └───────────────────┘
               │                            │
               └──────────────┬─────────────┘
                              ▼
               ┌─────────────────────────────┐
               │    Local SQLite Engine      │
               │ (Indexed scans, integrity,  │
               │  recon, quantum, reports)   │
               └─────────────────────────────┘
```

---

## 3. Database Schema & Migration 006

Migration `006_history_and_reports` adds compound performance indexes to support real-time querying without table scans:

```sql
CREATE INDEX IF NOT EXISTS ix_scans_user_created ON scans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_scans_user_risk ON scans (user_id, risk_level);
CREATE INDEX IF NOT EXISTS ix_scans_user_status ON scans (user_id, status);
CREATE INDEX IF NOT EXISTS ix_scans_filename ON scans (filename);
CREATE INDEX IF NOT EXISTS ix_scans_sha256 ON scans (sha256);
```

### Supported Query Parameters (`GET /api/v1/scans`):
- `limit` (int, default: 50, max: 100): Page window size.
- `offset` (int, default: 0): Pagination offset.
- `q` (str, optional): Case-insensitive substring match against `filename` or prefix match against `sha256`.
- `risk_level` (str, optional): `SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `status` (str, optional): `completed`, `failed`, `pending`.
- `sort_by` (str, default: `newest`): `newest`, `oldest`, `highest_risk`, `lowest_risk`.

### Response Headers for Pagination:
- `X-Total-Count`: Total matching records.
- `X-Limit`: Current page size.
- `X-Offset`: Current offset.

---

## 4. Zero-Dependency PDF Generation Engine

To maintain NeuroCraft's **student-friendly, free-first, and zero-mandatory-dependency** philosophy, reports are rendered using a custom, pure Python 1.4 PDF assembler (`PdfStreamBuilder`):

- **No heavy native binaries**: Zero dependency on ReportLab, WeasyPrint, wkhtmltopdf, or Cairo.
- **Strict PDF 1.4 Standard**: Generates standard vector graphics operators (`re`, `f`, `S`, `rg`, `RG`, `m`, `l`, `BT`, `ET`, `Tf`, `Td`, `Tj`).
- **Typography**: Built-in standard Type1 PostScript fonts (`/Helvetica`, `/Helvetica-Bold`, `/Courier`).
- **Dynamic Paging & Running Headers**: Computes exact line wraps, triggers automatic page breaks when vertical space is exhausted, and prints running headers, footers, watermarks, and `"Page X of Y"` page numbers.
- **Ten Standard Sections**:
  1. Executive Summary & Calibrated Risk Callout
  2. File Information (Filename, Size, MIME, Timestamp)
  3. Risk Assessment & Calibrated Threat Score
  4. Detailed Security Findings (Severity, Category, Evidence)
  5. Observed Capabilities (API triggers, network capabilities)
  6. Trust & Digital Signature Integrity (Authenticode, Signers, CAs, Hashes)
  7. Correlated Passive Reconnaissance (DNS records, TLS parameters, exposure score)
  8. Operational Limitations (Static analysis boundaries, offline verification)
  9. Technical Details (SHA-256, SHA-512, MD5, SHA-1)
  10. Report Metadata & Anti-Hallucination Attestation

---

## 5. Security & Isolation Guarantees

1. **Strict Multi-User Isolation**:
   - User A cannot view, search, export, or correlate User B's scans or reports.
   - All scan detail (`/api/v1/scans/{scan_id}`), findings, recon correlation (`/api/v1/scans/{scan_id}/recon`), and report export endpoints (`/api/v1/scans/{scan_id}/report`, `/api/v1/reports/{report_id}/export`) enforce ownership boundaries. Attempting to access another tenant's scan returns a strict `404 Not Found`.
2. **Credential & Path Hygiene**:
   - Internal server paths (scratch dirs, temp folders) and API keys are strictly excluded from JSON, CSV, and PDF exports.
3. **Evidence-Based Grounding**:
   - The engine explicitly refuses to state `"100% safe"`. When no findings are detected, the report prints:
     > *"No significant security findings were detected by the implemented analysis."*

---

## 6. Verification & Test Suite

All functionality is covered by automated unit and integration tests:

| Test File | Scope | Status |
|-----------|-------|--------|
| `tests/unit/test_reports_export.py` | Unit tests for JSON, CSV, and PDF report builders, Type1 font escaping, multi-page layout, and zero-finding fallbacks | **PASSED** (8/8) |
| `tests/integration/test_history_and_reports_api.py` | Integration tests for search, risk filtering, deterministic sorting, pagination headers, correlated recon, and cross-user isolation | **PASSED** (3/3) |
| Entire Pytest Suite (`pytest -q`) | Full regression coverage across foundation, database, analysis, recon, trust, and reporting | **PASSED** (123/123) |
| Ruff Linter (`ruff check .`) | PEP 8, import sorting, unused variables, and type consistency | **PASSED** (0 errors) |
| Production Frontend Build (`npm run build`) | TypeScript type-checking and Vite minification bundle | **PASSED** (0 errors) |
