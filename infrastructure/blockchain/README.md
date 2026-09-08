# NeuroCraft Decentralized Anchoring (Phase 0 Scaffold)

**Status**: Optional / Future Planned Component (Phase 6)

---

## 1. Principles

1. **Strictly Optional**: NeuroCraft operates completely without blockchain infrastructure.
2. **Free-First Local Execution**: No gas fees, wallet funding, or private keys are needed for development or standard production usage.
3. **Zero Raw Data On-Chain**: Only periodic batch Merkle roots ($32$ bytes) may ever be submitted to a smart contract. Raw file bytes, file names, or user identities are never placed on-chain.
4. **Local Network Testing**: If blockchain features are tested, use local emulated nodes (Anvil / Hardhat / Ganache), never live public networks with monetary cost.
