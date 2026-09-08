# NeuroCraft Command-Line Interface (CLI)

**Path**: `apps/cli`  
**Future Technology**: Python (Typer, Rich, Click) with standalone binary distribution via PyInstaller.

---

## Planned Command Interface

The CLI will expose a scriptable, UNIX-friendly terminal interface for automated pipelines, SOC workstations, and CI/CD security gates:

### 1. File Inspection & Triage
```bash
# Perform multi-layer static scan on target file
neurocraft scan <file> [--format json|table|detailed] [--offline]

# Compute comprehensive cryptographic hashes (MD5, SHA-1, SHA-256, SSDEEP)
neurocraft hash <file>

# Verify digital signature, certificate chain, and Authenticode validity
neurocraft verify <file>

# Query known threat intelligence repositories or local database by SHA-256
neurocraft lookup <sha256>
```

### 2. Cryptographic Integrity & Provenance
```bash
# Compute Merkle tree inclusion proof and register file in the local provenance ledger
neurocraft integrity register <file> [--anchor]

# Verify a file against the tamper-evident provenance ledger
neurocraft integrity verify <file> [--proof <proof_file>]
```

### 3. Diagnostics & Health
```bash
# List available detection engines, active YARA rule counts, and loaded ML models
neurocraft engines

# Perform self-diagnostic health check (ClamAV status, Python environment, storage permissions)
neurocraft doctor
```

---

## Phase 0 Status

* Planned interface documented.
* Module skeleton created at `src/neurocraft_cli/`. Command logic will be implemented in Phase 5.
