# NeuroCraft Provenance Service

**Module**: `services/provenance-service`  
**Package**: `src/neurocraft_provenance`  

---

## 1. Responsibility

The **Provenance Service** maintains an immutable, tamper-evident audit history of all scans and forensic findings:
* **Local Audit Ledger**: Maintains an append-only cryptographic ledger (hash-chain / transparency log) of scan metadata and Merkle roots.
* **Proof Verification**: Allows external parties to verify that a specific scan report was generated at a specific timestamp without modification.
* **Optional Decentralized Anchoring**: Periodically commits aggregated batch Merkle roots to an optional public or private blockchain smart contract (e.g. Ethereum, Polygon, or local EVM testnet).
* **Decoupled Architecture**: Designed to function completely offline without any network or blockchain connectivity.

---

## 2. Inputs & Outputs

* **Inputs**:
  - `ScanReceipt`: Scan metadata, SHA-256 digest, risk verdict, and evidence Merkle root.
  - Verification queries with inclusion proofs.
* **Outputs**:
  - `ProvenanceRecord`: Registered ledger entry with sequence number, timestamp, and signature.
  - `AnchorAttestation`: Optional transaction hash and block number if decentralized anchoring is enabled.

---

## 3. Future Dependencies

* Local storage backend: SQLite / PostgreSQL for local ledger tables.
* `web3.py`: Optional EVM blockchain client (only loaded if `BLOCKCHAIN_ENABLED=true`).
* `pydantic`: Provenance contract schemas.

---

## 4. Security & Free-First Considerations

* **NEVER PUT RAW FILES ON A LEDGER OR BLOCKCHAIN**: Only cryptographic hashes and structured metadata attestations are stored.
* **BLOCKCHAIN IS STRICTLY OPTIONAL**: The provenance service defaults to local verification. Lack of blockchain credentials or connectivity must never impede local operations.
* **Non-Repudiation**: Entries in the append-only ledger cannot be modified retroactively without breaking the cryptographic hash chain.

---

## 5. Planned Interfaces

```python
class ProvenanceService:
    """Maintains tamper-evident audit logs and coordinates optional anchoring."""
    async def record_scan(self, receipt: ScanReceipt) -> ProvenanceRecord:
        pass

    async def verify_provenance(self, file_hash: str, proof: MerkleProof) -> VerificationStatus:
        pass

    async def anchor_batch(self, batch_root: str) -> Optional[AnchorReceipt]:
        pass
```
