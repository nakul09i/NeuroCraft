# NeuroCraft Integrity Service

**Module**: `services/integrity-service`  
**Package**: `src/neurocraft_integrity`  

---

## 1. Responsibility

The **Integrity Service** provides cryptographic verification and proof generation to establish tamper-evident chain of custody:
* **Multi-Algorithm Hashing**: Computes SHA-256, SHA-512, and BLAKE3 digests over scanned files, feature manifests, and scan reports.
* **Digital Signature & Authenticode Verification**: Parses PKCS#7 signatures, validates X.509 certificate chains against trusted roots, checks expiration timestamps, and evaluates certificate revocation lists (CRLs).
* **Merkle Tree Construction**: Organizes discrete evidence items into a deterministic Merkle tree and generates cryptographic inclusion proofs (`MerkleProof`).
* **Report Attestation**: Cryptographically seals scan results with a digital signature to guarantee non-repudiation.

---

## 2. Inputs & Outputs

* **Inputs**:
  - Raw file bytes or file descriptors.
  - Evidence items to be sealed into a Merkle tree.
  - Target certificates for signature chain verification.
* **Outputs**:
  - `FileDigest`: Complete cryptographic fingerprint profile.
  - `SignatureValidation`: Authentic, Revoked, Expired, Untrusted, or Unsigned status.
  - `MerkleProof`: Cryptographic inclusion proof linking an evidence item or scan report to a root hash.

---

## 3. Future Dependencies

* `cryptography`: High-level cryptographic primitives (X.509, PKCS#7, RSA, ECDSA).
* `pycryptodome` or standard `hashlib`: Cryptographic hashing.
* Native Merkle tree implementation (`packages/shared-security`).

---

## 4. Security Considerations

* **Constant-Time Comparisons**: Hashes and signatures must be compared using constant-time algorithms (`hmac.compare_digest`) to prevent timing side-channel attacks.
* **Certificate Chain Validation**: Strictly enforce revocation checks and validity periods; do not bypass untrusted root warnings without explicit administrative flags.
* **No Secret Key Exposure**: Private signing keys for attestation must be stored in secure key vaults or isolated environment files, never in code.

---

## 5. Planned Interfaces

```python
class IntegrityService:
    """Manages cryptographic verification and Merkle tree generation."""

    def compute_file_fingerprint(self, file_path: Path) -> FileFingerprint:
        pass

    def build_evidence_merkle_tree(self, evidence_hashes: list[str]) -> MerkleTreeResult:
        pass

    def verify_authenticode(self, pe_path: Path) -> SignatureVerificationResult:
        pass
```
