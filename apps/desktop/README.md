# NeuroCraft Desktop Application (Placeholder)

**Path**: `apps/desktop`  
**Future Technology**: Tauri v2 (Rust) + React 18+ / TypeScript + Tailwind CSS.

---

## Planned Responsibilities

1. **Air-Gapped & Local-First Triage**: Run analysis completely offline on the user's workstation without network access.
2. **Native OS File System Integration**: Right-click context menu ("Scan with NeuroCraft") for instant local triage of suspicious downloads.
3. **Local Embedded Engine**: Option to execute local YARA, ClamAV, and CPU-optimized ONNX models directly on the desktop machine.
4. **Local Provenance Ledger**: Maintain a local SQLite/RocksDB append-only log of file scans with verifiable Merkle roots.
5. **Ultra-Low Memory Footprint**: Leverages Tauri and native OS webviews instead of resource-heavy Chromium/Electron runtimes.

---

## Phase 0 Status

* Directory structure created.
* No Rust binaries, Cargo crates, or npm packages are generated in Phase 0 to preserve a lean, clean repository foundation.
