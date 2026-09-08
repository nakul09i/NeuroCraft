# Contributing to NeuroCraft

Thank you for contributing to NeuroCraft! As an open-source cybersecurity project, we maintain high standards for security, reliability, documentation, and code quality.

---

## 1. Code of Conduct & Philosophy

NeuroCraft is a **Free-First (FOSS)** project. When contributing:
* Ensure all dependencies have compatible open-source licenses (MIT, Apache 2.0, BSD).
* Avoid introducing mandatory paid services or proprietary cloud requirements.
* Design algorithms and ML models to run efficiently on standard consumer CPU hardware.

---

## 2. Development Workflow

### Branch Naming Conventions
* `feature/<short-description>`: New capabilities or functional enhancements.
* `fix/<issue-id-or-description>`: Bug and regression fixes.
* `security/<advisory-or-fix>`: Security hardening or vulnerability fixes.
* `docs/<topic>`: Documentation updates and architectural records.
* `chore/<maintenance>`: Dependency bumps, CI updates, refactoring.

### Commit Conventions
We enforce [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```
*Types*: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `security`.

Example:
```
feat(scanner): add safe PE header magic byte validation
security(archive): enforce 10:1 decompression ratio limit
```

---

## 3. Pull Request Requirements

Before opening a pull request, verify:
1. **Security Review**:
   - Verify that no untrusted input is executed or passed directly to a shell.
   - Verify all file operations enforce canonical path sanitization.
   - Ensure no secrets or credentials are introduced.
2. **Testing**:
   - Add unit tests under `tests/unit/` for every new function or branch.
   - For security-sensitive features, include tests covering malformed inputs.
3. **Documentation**:
   - Update relevant architecture documents in `docs/` or service READMEs.
   - Document any changes to environment variables in `.env.example`.
4. **Code Quality**:
   - Pass formatting and lint checks (`ruff format`, `ruff check`).
   - Pass type checks (`mypy`).

---

## 4. Testing & Review Expectations

* **No Live Malware**: Pull requests that commit live executable malware, dangerous exploits, or unapproved binaries will be rejected immediately.
* **Safe Test Fixtures**: Use synthetic byte sequences or harmless text fixtures in `test-fixtures/`.
* **Reproducibility**: PRs should describe how changes were verified locally.

---

## 5. Security Disclosure

Do not use public GitHub issues to report security vulnerabilities. Refer to [`SECURITY.md`](./SECURITY.md) for confidential reporting channels.
