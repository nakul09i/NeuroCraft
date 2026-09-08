# Static File Analysis Security Architecture

**Document**: `docs/security/file-analysis-security.md`  
**Status**: Security Guidelines (Phase 0)

---

## 1. Zero-Execution Mandate

NeuroCraft's static analysis engine strictly analyzes file contents as passive data buffers. The operating system execution bit is never set on quarantined files, and the scanner does not invoke shell interpreters, scripting runtimes, or system loaders on target files.

---

## 2. Safe Parsing & Memory Safety

Parsing complex binary formats (PE, ELF, Mach-O, PDF) is historically prone to memory corruption (buffer overflows, integer overflows, out-of-bounds reads):
* **Memory-Safe Language Implementations**: Prefer pure Python, Rust (via Tauri/extensions), or heavily fuzzed libraries for binary parsing.
* **Bounded Reads**: All file reads must specify maximum byte lengths. Unbounded `file.read()` calls are prohibited.
* **Process Isolation**: Analysis modules run as separate child worker processes with non-root privileges.
* **Watchdog Timeouts**: Each parsing engine operates under a strict timeout (default: 30 seconds). Processes exceeding this limit are terminated.
