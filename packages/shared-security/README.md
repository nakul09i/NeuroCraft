# NeuroCraft Shared Security Package

**Package**: `packages/shared-security`  
**Namespace**: `neurocraft_security`  

---

## Responsibility

Central repository for security-critical functions and hardening utilities:
* Safe path resolution and directory traversal (`../`) prevention.
* Archive entry sanitization and decompression bomb safety guards.
* Cryptographic constant-time comparisons.
* Known magic byte signature tables.
