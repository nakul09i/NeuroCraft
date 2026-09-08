# Upload Security & Quarantine Policy

**Document**: `docs/security/upload-security.md`  
**Status**: Security Guidelines (Phase 0)

---

## 1. File Upload Defenses

1. **Size Limits**: Enforce a 100 MB hard ceiling on incoming HTTP request bodies at the reverse proxy (Nginx) and API gateway (FastAPI) levels.
2. **Streaming to Disk**: Files are streamed directly to disk chunks to prevent memory exhaustion from concurrent uploads.
3. **Randomized Ephemeral Naming**: Uploaded files are assigned UUIDv4 names and stripped of original filenames for filesystem storage (e.g., `./scratch/quarantine/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.bin`).
4. **Filename Sanitization**: User-supplied filenames stored in metadata are stripped of path delimiters (`/`, `\`), null bytes (`\0`), and control characters.
5. **No Executable Permissions**: Quarantine directories are mounted with `noexec,nosuid,nodev` flags in production environments.
6. **Guaranteed Ephemeral Cleanup**: Files in `./scratch/quarantine/` are unlinked immediately after scan completion or pipeline failure.
