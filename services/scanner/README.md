# NeuroCraft Scanner Orchestrator Service

**Module**: `services/scanner`  
**Package**: `src/neurocraft_scanner`  

---

## 1. Responsibility

The **Scanner Orchestrator** is the core static analysis coordinator of NeuroCraft. It takes quarantined file artifacts and executes passive, non-executing inspection routines:
* **Fingerprinting**: Calculates MD5, SHA-1, SHA-256, SHA-512, and fuzzy hashes (SSDEEP).
* **Format & Magic Byte Detection**: Accurately classifies true file types regardless of extension using byte signatures.
* **Header & Structural Parsing**: Safely extracts structural metadata from PE (Portable Executable), ELF, PDF, APK, and Office formats.
* **YARA Engine Bridge**: Evaluates curated YARA rule sets against raw file bytes with byte-offset match tracking.
* **ClamAV Bridge**: Streams bytes to a local ClamAV daemon over UNIX socket or TCP (`3310`) for signature matching.
* **Digital Signature Verification**: Extracts PKCS#7 / Authenticode signature blocks and validates certificate chains.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `file_path`: Absolute path to the quarantined file on isolated storage.
  - `scan_options`: Flags specifying which sub-engines to invoke, timeouts, and offline mode.
* **Outputs**:
  - `RawEvidenceCollection`: A collection of verified structural observations, hashes, rule matches, and signature statuses.

---

## 3. Future Dependencies

* `pefile`: Safe parsing of Windows Portable Executable headers.
* `yara-python`: YARA rule compilation and pattern matching.
* `python-magic`: Libmagic bindings for MIME and byte type detection.
* `clamd`: Python client for local ClamAV daemon.
* `cryptography`: X.509 certificate parsing and digital signature validation.
* `ssdeep` or `tlsh`: Fuzzy hashing for similarity clustering.

---

## 4. Security Considerations

* **CRITICAL — ZERO EXECUTION**: No binary or script is ever executed.
* **Memory & Time Limits**: Parsers run with strict memory bounds and per-file timeouts (default: 30s).
* **Malformed File Handling**: Corrupted headers must raise structured warnings rather than unhandled crashes or infinite loops.
* **Safe Extraction**: If container formats (ZIP, TAR) are parsed, extraction enforces decompression bomb guards (max 10:1 ratio, max 250MB, max depth 2).

---

## 5. Planned Interfaces

```python
class BaseScannerModule(ABC):
    """Abstract base class for all static analysis sub-engines."""
    @abstractmethod
    async def analyze(self, file_path: Path) -> list[EvidenceItem]:
        """Perform passive analysis and return structured evidence items."""
        pass

class ScannerOrchestrator:
    """Coordinates execution across static engines and produces consolidated raw evidence."""
    async def run_pipeline(self, file_path: Path, options: ScanOptions) -> RawEvidenceCollection:
        pass
```
