# NeuroCraft Analysis Engine Specification

**Tagline**: *Detect. Verify. Prove.*  
**Version**: 0.3.0 (Step 3 — Real File Analysis Engine)  
**Status**: Production-Ready / Fully Verified

---

## 1. Architectural Philosophy & Core Product Principle

NeuroCraft is an **evidence-based**, **local-first** static file analysis and trust verification engine.

### Non-Negotiable Core Principle
A normal or safe file **MUST NOT** be classified as dangerous merely because it is:
- Unsigned or self-signed
- Uncommon or rare
- Old or unmaintained
- Contains ordinary metadata
- Contains script-like fields that are normal for its format (e.g. build scripts, documentation snippets)
- Has an unusual filename
- Has an unknown or non-standard property
- Originates from an unknown location

A **HIGH-RISK** or **CRITICAL** verdict **MUST** be supported by meaningful, verifiable evidence. When evidence is insufficient or absent:
$$\text{Verdict} \in \{\text{SAFE}, \text{LOW}, \text{LIMITED}\}$$
Inventing fake findings, simulating random risk scores, or hardcoding alarmist verdicts to look impressive is strictly prohibited.

---

## 2. Target Pipeline Architecture

```
User selects file
        ↓
Frontend (React + Vite Web App)
        ↓
FastAPI Upload (POST /api/v1/scans)
        ↓
Secure File Ingestion & Quarantine (.bin in isolated directory)
        ↓
Cryptographic Fingerprinting (Chunked Streaming SHA-256)
        ↓
Content-Based File Type Detection (Magic Bytes Header Inspection)
        ↓
Safe Metadata Extraction (Out-of-Process, Passive)
        ↓
Format-Specific Static Analyzers (PE, ELF, PDF, Office, APK, Image, Text, ZIP)
        ↓
Evidence Collection & Verification
        ↓
Finding Generation (With Severity, Confidence, Weight & Evidence)
        ↓
Deterministic Risk Engine (Bounded 0–100, Correlated Category Caps)
        ↓
Analytic Confidence Calculation (Independent of Risk)
        ↓
Async SQLite Persistence (Scans, Findings, Capabilities, History)
        ↓
API Response (ScanResponse with Structured Evidence)
        ↓
Frontend Visualization (Real Score, Level, Findings, Technical Inspector)
        ↓
Optional Asynchronous Firebase Sync (Queue-based, Non-blocking)
```

---

## 3. Absolute Security Mandate: Zero Execution

Uploaded files are strictly **DATA**, never executable code.
The engine enforces:
1. **Zero Execution**: Never execute uploaded binaries, never launch shell commands (`cmd.exe`, `powershell`, `bash`), never `eval()` or dynamically import uploaded modules.
2. **Quarantine Isolation**: Uploaded byte streams are written to an isolated quarantine staging directory with `.bin` extensions, sanitized filenames, and strict path validation against directory traversal (`../`).
3. **Guaranteed Cleanup**: Quarantined files are unconditionally unlinked/cleaned up in `finally` blocks upon completion or failure.
4. **Boundary Limits**: Maximum file upload limit (100 MB default) is strictly enforced in streaming chunks; uploads exceeding limits abort immediately without buffering the entire file into memory.

---

## 4. Supported File Formats & Extractors

NeuroCraft determines file type strictly using **content inspection and magic byte headers**, never trusting user-supplied file extensions or client MIME headers.

| Normalized Type | Magic Bytes / Header | Dedicated Extractor | Capabilities & Evidence Extracted |
|---|---|---|---|
| **PE** | `MZ` + `PE\x00\x00` | `pe_extractor` | Section headers, section entropy, Authenticode digital signatures, suspicious import APIs (e.g. `VirtualAllocEx`, `WriteProcessMemory`), TLS callbacks. |
| **ELF** | `\x7fELF` | `elf_extractor` | ELF class (32/64-bit), endianness, section table, dynamic tags, embedded system calls, executable stack flag (`GNU_STACK`). |
| **PDF** | `%PDF-` | `pdf_extractor` | Object and stream counts, active JavaScript directives (`/JavaScript`, `/JS`), launch/open actions (`/Launch`, `/OpenAction`, `/AA`), embedded file streams (`/EmbeddedFiles`). |
| **OFFICE** | `PK\x03\x04` (OOXML) or `\xd0\xcf\x11\xe0...` (OLE) | `office_extractor` | VBA macro project streams (`vbaProject.bin`, `_VBA_PROJECT`), external relationship targets (remote template injection), embedded OLE packages. |
| **APK** | `PK\x03\x04` + `AndroidManifest.xml` / `classes.dex` | `apk_extractor` | Android package manifest, DEX bytecode indicators, dangerous permissions, dynamic DEX classloading (`DexClassLoader`). |
| **IMAGE** | PNG (`\x89PNG...`), JPEG (`\xff\xd8...`), GIF (`GIF87a`/`GIF89a`), BMP (`BM`) | `image_extractor` | Dimensions, color depth, format headers, appended trailing payloads after EOF/IEND (polyglot payloads concealing `MZ`, `ELF`, or scripts). |
| **TEXT / SCRIPT** | Printable ASCII / UTF-8 text | `text_extractor` | Obfuscated PowerShell execution switches (`-enc`, `-ep bypass`, `-w hidden`), download-and-execute cradles (`IEX WebClient`), ransomware shadow copy deletion (`vssadmin delete shadows`), interactive reverse shells. |
| **ZIP** | `PK\x03\x04` | `archive_extractor` | Table-of-contents inspection without disk extraction, directory traversal entries (`../`), decompression bomb expansion ratio (>100x), packaged executable binaries. |
| **UNKNOWN** | Unrecognized binary header | Fallback | Cryptographic SHA-256 fingerprinting, byte entropy analysis. Honestly reports `status = "limited"`. |

---

## 5. False Positive Controls & Calibration

1. **Entropy False Positive Control**:
   - Naturally compressed formats (PNG, JPEG, GIF, BMP, ZIP, APK, Office OOXML, compressed PDFs) always exhibit high Shannon entropy (~7.3 to 7.9).
   - High entropy is **NOT** flagged as suspicious on compressed containers.
   - High entropy is only flagged for uncompressed native binaries (`PE`, `ELF`) or unrecognized raw binaries where it signals packing or payload encryption.
2. **Extension Mismatch Calibration**:
   - Extension mismatch is treated as an **indicator**, not automatic malware.
   - Benign format swaps (e.g., JPEG named `.png`, text named `.log`) receive `SeverityEnum.LOW` (3 risk points) or `INFO`.
   - Only when an executable binary (`PE`, `ELF`, `Mach-O`) masquerades as a harmless document/image (e.g., `.pdf`, `.docx`, `.jpg`) is it classified as `SeverityEnum.HIGH` (evasion).
3. **Command String Calibration**:
   - Harmless mentions of `curl`, `wget`, or `whoami` in plain text documentation do not trigger critical security alarms.
   - Binary files referencing destructive administrative tools (`vssadmin delete shadows`, `schtasks /create`) receive calibrated severity.
4. **Network URLs**:
   - Embedded URLs alone are informational (`SeverityEnum.INFO`) and do not inflate risk scores without malicious context.

---

## 6. Deterministic Risk Engine & Formula

### Risk Score Calculation
The risk engine maps observed findings and detected capabilities to a bounded numeric score $[0.0, 100.0]$:

$$\text{RawScore} = \sum_{c \in \text{Categories}} \min\left(\sum_{f \in F_c} \text{Weight}(f.\text{severity}),\; \text{Cap}(c)\right) + \sum_{k \in \text{Capabilities}} \text{CapWeight}(k)$$

Where:
- Severity Weights:
  - `CRITICAL`: 35.0 pts
  - `HIGH`: 20.0 pts
  - `MEDIUM`: 10.0 pts
  - `LOW`: 3.0 pts
  - `INFO`: 0.0 pts
- Category Caps (Prevent Correlated Double-Counting):
  - `EVASION`: max 30.0 pts
  - `ENTROPY`: max 20.0 pts
  - `NETWORK`: max 10.0 pts
  - `FORMAT_INDICATOR`: max 5.0 pts
  - `PARSER_FAULT`: max 5.0 pts

### Standard Risk Level Thresholds
$$\begin{array}{rll}
0.0 - 19.9 & \implies & \textbf{SAFE} \\
20.0 - 39.9 & \implies & \textbf{LOW} \\
40.0 - 59.9 & \implies & \textbf{MEDIUM} \\
60.0 - 79.9 & \implies & \textbf{HIGH} \\
80.0 - 100.0 & \implies & \textbf{CRITICAL}
\end{array}$$

For clean, benign files with no malicious indicators, the raw score is **0.0** and the verdict is **SAFE**.

---

## 7. Separate Confidence Model

Risk is strictly separated from Confidence:
- **Risk**: *What is the severity of detected threat indicators?*
- **Confidence**: *How thoroughly was this file parsed and verified?*

$$\begin{array}{lll}
\textbf{Confidence Level} & \textbf{Score Range} & \textbf{Condition} \\
\hline
\text{HIGH} & 0.80 - 1.00 & \text{Supported format, full header parser executed, zero faults.} \\
\text{MEDIUM} & 0.50 - 0.79 & \text{Supported format with parser warning or partial structure.} \\
\text{LOW} & 0.10 - 0.49 & \text{Unsupported format (`is_supported = False`), unknown binary.}
\end{array}$$

---

## 8. Operational Analysis Statuses

| Status | Meaning |
|---|---|
| `completed` | File type supported, static parsers ran to completion, findings verified. |
| `limited` | Format unsupported or partially analyzed; honest indicator provided. |
| `failed` | Parser fault or file corrupted preventing inspection. |
| `queued` / `processing` | Ingestion lifecycle state during async ingestion. |

---

## 9. SQLite Persistence & Scan Isolation

- **Primary Storage**: SQLite is the first-class offline database.
- **Scan Record**: Stores `scan_id, user_id, filename, sha256, file_type, file_size_bytes, status, risk_level, risk_score, confidence, created_at, updated_at`.
- **Finding Record**: Stores `scan_id, finding_id, category, title, description, severity, confidence, source_engine, weight, evidence_json`.
- **Scan Isolation Mandate**:
  All finding queries enforce `WHERE scan_id = :scan_id`. Scan A findings can never appear in Scan B.

---

## 10. Offline-First & Optional Cloud Sync

- **Offline**: NeuroCraft operates 100% locally with zero external network connectivity required.
- **Firebase**: Completely optional. If Firebase is offline or unconfigured, file analysis continues without error or blocking delay.
