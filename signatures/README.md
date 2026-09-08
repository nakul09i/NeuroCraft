# NeuroCraft Digital Signatures & Certificates Directory

This directory manages X.509 root certificates, Certificate Revocation Lists (CRLs), and test signing artifacts used by `services/integrity-service`.

---

## Directory Organization

* `trusted/`: Well-known public root Certificate Authorities (e.g. Microsoft Root Authority, DigiCert, Sectigo) used to validate Authenticode digital signatures on executable binaries.
* `revoked/`: Serial numbers, fingerprints, and CRLs for compromised or revoked certificates commonly abused by malware.
* `test/`: Self-signed test certificates and mock chains used exclusively in local test environments.

---

## Safety & Governance Rules

* **NO PRIVATE KEYS**: Never commit private keys (`*.key`, `*.pem`, `*.p12`) to this repository. Only public certificates (`*.crt`, `*.cer`, `*.der`) and public key digests may be stored.
