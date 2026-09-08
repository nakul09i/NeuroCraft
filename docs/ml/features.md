# Static Feature Extraction Specification

**Document**: `docs/ml/features.md`  
**Status**: Feature Engineering Specification (Phase 0)

---

## 1. Overview

NeuroCraft's static analysis extractors transform raw file byte streams into normalized numerical feature representations for machine learning models.

---

## 2. PE (Portable Executable) Feature Groups

For Windows PE binaries (EXE, DLL, SYS), we define 6 core feature groups (aligned with the EMBER schema):

| Group | Dimensions | Description |
| :--- | :--- | :--- |
| **Byte Histogram** | 256 | Normalized distribution of byte values ($0x00$ through $0xFF$) across the file. |
| **Byte-Entropy Histogram** | 256 | 2D distribution of byte values conditioned on local sliding-window Shannon entropy. |
| **Section Characteristics** | ~50 | Section names, sizes, virtual vs. raw size ratios, section permissions (Execute/Read/Write), and entropy per section. |
| **Imports & APIs** | 1024 (hashed) | Imported DLL names and function calls hashed via MurmurHash3 / FeatureHasher into fixed-size bins. |
| **Exports** | 128 (hashed) | Exported function symbol hashes. |
| **General File Metadata** | 10 | File size, virtual size, timestamp, number of sections, number of symbols, debug directories. |

---

## 3. PDF & Document Feature Groups

* Document structural hierarchy (number of indirect objects, streams, pages).
* Count of suspicious action tags (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile`, `/OpenAction`).
* Stream compression methods (`/FlateDecode`, `/ASCIIHexDecode`).

---

## 4. Normalization & Preprocessing

* Zero-padding and constant bounds are enforced.
* Quantile transformation or min-max normalization parameters are saved in model manifest metadata to ensure identical inference scaling.
