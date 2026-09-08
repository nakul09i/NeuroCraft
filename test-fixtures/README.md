# NeuroCraft Test Fixtures & Safety Protocol

**Path**: `test-fixtures/`  

---

## 1. Safe Testing Principles

> **MANDATORY SAFETY POLICY**  
> Under no circumstances should live malware, weaponized exploits, or active payloads be committed to this folder or any part of the NeuroCraft repository.

All automated testing, parser fuzzing, and engine validation must utilize **safe synthetic fixtures**:
* Known harmless text files and small scripts.
* Synthetically constructed, non-executable binary headers (PE/ELF headers with dummy sections).
* The industry-standard **EICAR Anti-Virus Test File** (a standard 68-byte benign ASCII test string designed to verify scanner responsiveness without harm).
* Truncated and corrupt file headers to test parser fault tolerance.

---

## 2. Directory Breakdown

* `benign/`: Safe, standard files (plain text, simple JSON, minimal valid executables compiled from harmless C/Go code, e.g. "Hello World").
* `suspicious/`: Synthetic files exhibiting benign anomalies (e.g. non-standard section names, high entropy text sections, mock UPX header markers).
* `malformed/`: Intentionally corrupted files designed to test parser error handling (truncated headers, out-of-bounds offsets, negative section counts, null bytes).
* `documents/`: Benign PDFs, text files, and Office documents with mock metadata.
* `archives/`: Safe archives (ZIP, TAR) containing harmless nested files to test path traversal prevention and recursion depth limits.
* `signatures/`: Synthetic files signed with expired, untrusted, or valid self-signed test certificates to exercise Authenticode validation routines.

---

## 3. The Standard EICAR Test Signature

When testing ClamAV or signature engines in later phases, use the standardized benign test string:
```
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
```
*This string is universally recognized by antivirus products as a non-malicious test marker.*
