"""Streaming fingerprinting and cryptographic hashing for NeuroCraft."""

import hashlib
import time
from datetime import UTC, datetime
from pathlib import Path

from neurocraft_types import HashDigest
from pydantic import BaseModel, Field


class FingerprintResult(BaseModel):
    """Result of file fingerprinting."""

    scan_id: str
    file_size_bytes: int
    hashes: HashDigest
    started_at: datetime
    completed_at: datetime
    hash_duration_ms: float = Field(..., description="Duration of hashing in milliseconds")


def compute_fingerprint(
    file_path: Path,
    scan_id: str,
    chunk_size: int = 64 * 1024,
    compute_legacy_hashes: bool = True,
) -> FingerprintResult:
    """
    Compute cryptographic SHA-256 (and optional legacy MD5/SHA-1) hashes via streaming chunks.
    Avoids buffering entire files into memory.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    start_time = time.perf_counter()
    started_at = datetime.now(UTC)

    sha256_hasher = hashlib.sha256()
    sha512_hasher = hashlib.sha512()
    md5_hasher = hashlib.md5() if compute_legacy_hashes else None
    sha1_hasher = hashlib.sha1() if compute_legacy_hashes else None

    total_bytes = 0
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            sha256_hasher.update(chunk)
            sha512_hasher.update(chunk)
            if md5_hasher:
                md5_hasher.update(chunk)
            if sha1_hasher:
                sha1_hasher.update(chunk)

    end_time = time.perf_counter()
    completed_at = datetime.now(UTC)
    duration_ms = round((end_time - start_time) * 1000, 2)

    digest = HashDigest(
        sha256=sha256_hasher.hexdigest(),
        sha512=sha512_hasher.hexdigest(),
        md5=md5_hasher.hexdigest() if md5_hasher else None,
        sha1=sha1_hasher.hexdigest() if sha1_hasher else None,
    )

    return FingerprintResult(
        scan_id=scan_id,
        file_size_bytes=total_bytes,
        hashes=digest,
        started_at=started_at,
        completed_at=completed_at,
        hash_duration_ms=duration_ms,
    )
