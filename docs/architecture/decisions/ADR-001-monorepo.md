# ADR-001: Adoption of Monorepo Architecture

**Status**: Accepted  
**Date**: 2026-09-08  
**Deciders**: NeuroCraft Architecture Review Board  

---

## Context

NeuroCraft is a comprehensive cybersecurity platform comprising multiple interconnected applications (Web Next.js app, Tauri desktop app, Python CLI), background services (API gateway, scanner orchestrator, ML inference engine, risk engine, explanation engine, integrity service, provenance service, worker), shared domain types, security libraries, and test fixtures.

Dividing these components into separate repositories at this early stage would introduce severe friction:
* Fragmented schema updates and version synchronization across services.
* Complex cross-repository PR workflows and CI coordination.
* High overhead for small student and open-source teams.

---

## Decision

We adopt a **monorepo** architecture structured with top-level `apps/`, `services/`, `packages/`, `docs/`, and `tests/` directories.

Shared contracts and utilities are housed in `packages/` and directly referenced across services and apps.

---

## Consequences

### Positive
* Single source of truth for all domain models (`packages/shared-types`).
* Atomic commits and pull requests spanning schemas, services, and tests.
* Simplified CI/CD setup and centralized linting/type-checking tooling.
* Low maintenance friction for student contributors.

### Negative / Trade-offs
* Build and CI configurations require care to avoid redundant testing of unaffected modules as the repository grows.
* Large Git checkout size if binary assets were included (mitigated by strict rules against committing live malware or large datasets).
