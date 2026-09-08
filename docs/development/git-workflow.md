# Git & GitHub Workflow Specification

**Project**: NeuroCraft  
**Document**: `docs/development/git-workflow.md`  
**Status**: Standard Operating Procedure (Phase 0)

---

## 1. Repository Overview & Governance

NeuroCraft uses a modular monorepo hosted under the `neurocraft` project identifier. All components (Web UI, Desktop client, CLI, scanner orchestrator, ML engines, shared contracts, and security rules) reside in this repository to facilitate synchronized schema updates and atomic testing.

---

## 2. Branch Strategy

We follow a structured Git branching model separating stable production code from ongoing integration and feature development:

```
main (Stable releases only, protected)
  ▲
  │ (Release tags / tested merges)
develop (Active integration branch)
  ▲
  ├── feature/<short-description>  (New capabilities)
  ├── fix/<short-description>      (Bug fixes)
  └── security/<short-description> (Security hardening)
```

### Branch Roles
1. **`main`**:
   - Contains only hardened, tested, and tagged releases.
   - Direct commits and forced pushes are strictly forbidden.
   - Code enters `main` only via pull requests merged from `develop` following comprehensive automated testing.
2. **`develop`**:
   - The primary integration trunk.
   - All completed features, bug fixes, and security patches are merged here.
   - Nightly and integration CI workflows execute against this branch.
3. **`feature/<short-description>`**:
   - Branch off: `develop`
   - Merge back into: `develop`
   - Examples:
     - `feature/backend-foundation`
     - `feature/file-ingestion`
     - `feature/static-analysis`
     - `feature/yara`
     - `feature/clamav`
     - `feature/ml-v1`
     - `feature/risk-engine`
     - `feature/web-dashboard`
4. **`fix/<short-description>`**:
   - Branch off: `develop`
   - Merge back into: `develop`
5. **`security/<short-description>`**:
   - Branch off: `develop` (or hotfix from `main` if addressing an active vulnerability in a released version)
   - Merge into: `develop` and `main`

---

## 3. Commit Convention

We enforce the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard. Every commit message must follow this schema:

```
<type>(<optional-scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types
* `feat`: A new user-facing or architectural capability.
* `fix`: A bug fix.
* `docs`: Documentation updates or additions only.
* `refactor`: Code change that neither fixes a bug nor adds a feature.
* `test`: Adding missing tests or correcting existing tests.
* `chore`: Build processes, tooling updates, or dependency management.
* `security`: Vulnerability fixes, sanitizers, or security policy updates.
* `perf`: Code changes that improve performance or latency.
* `build`: Changes that affect the build system or external dependencies.

### Commit Examples
```
feat(scanner): add safe PE header magic byte validation
docs(ml): document temporal dataset splitting lifecycle
chore(ci): add pre-commit secret audit workflow
security(archive): enforce 10:1 decompression ratio limit
```

---

## 4. Pull Request (PR) Workflow

For every substantial feature or bug fix:

1. **Create Branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/<name>
   ```
2. **Implement & Test**:
   - Write code adhering to typing and architectural rules in `AGENTS.md`.
   - Add unit and security tests in `tests/`.
   - Run local verification:
     ```bash
     python scripts/security/verify_foundation.py
     python scripts/security/check_secrets.py
     pytest tests/unit
     ```
3. **Commit**:
   - Write clear conventional commits.
4. **Push & Open PR**:
   - Push to GitHub: `git push -u origin feature/<name>`
   - Open Pull Request targeting `develop`.
5. **Review & Approval**:
   - Automated CI must pass (lint, type-check, tests, secret audit).
   - At least one code review approval required before merging.
6. **Merge**:
   - Squash-and-merge or rebase-and-merge into `develop`.
   - Delete the feature branch upon merge.

---

## 5. Code Review Standards

Reviewers must verify:
* **Zero Execution Rule**: No untrusted file or archive content is executed.
* **Path Validation**: All disk accesses use `validate_safe_path` or `sanitize_filename`.
* **Zero Secrets**: No tokens, private keys, or credentials are added.
* **FOSS / Free-First**: No mandatory paid APIs or proprietary cloud services are introduced.
* **No Live Malware**: No weaponized binaries or live viruses are included in test fixtures.

---

## 6. Release & Versioning Strategy

* Releases follow **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).
* Stable releases are merged from `develop` into `main` and tagged:
  ```bash
  git checkout main
  git merge --no-ff develop
  git tag -a v0.1.0 -m "Release v0.1.0 - Phase 0 Foundation"
  git push origin main --tags
  ```

---

## 7. Rollback Strategy

If a regression or security issue is discovered in production (`main`):
1. **Hotfix**: Branch `security/<issue>` directly from `main`.
2. Apply the fix and verify with reproduction unit tests.
3. Merge the fix into `main` and immediately backport to `develop`.
4. Tag a patch release (e.g. `v0.1.1`).
5. In extreme cases, revert the offending commit using `git revert <commit-sha>`. Never force-push or rewrite public history on `main` or `develop`.

---

## 8. Secret Handling & Incident Response

### Pre-Push Verification
Before pushing to remote, developers must run:
```bash
python scripts/security/check_secrets.py
```

### Prohibited Artifacts
Never commit:
* `.env` or files containing real secrets
* Private keys (`*.pem`, `*.key`, `*.p12`)
* Live malware samples (`*.exe`, `*.bin`, `*.malware`)
* Large raw dataset dumps

### Accidental Secret Leak Procedure
If a secret is accidentally committed locally before push:
1. Reset the commit: `git reset HEAD~1`.
2. Remove the secret and add the pattern to `.gitignore`.
3. If already pushed to remote:
   - Immediately revoke and rotate the compromised credential.
   - Use `git-filter-repo` or BFG Repo-Cleaner to rewrite history.
   - Force-push the sanitized branch only after team coordination.
