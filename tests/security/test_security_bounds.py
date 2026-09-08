"""Security boundary tests for path traversal, archive bombs, and malformed inputs."""

import io
from pathlib import Path

import pytest
from neurocraft_scanner.ingestion import IngestionError, IngestionManager
from neurocraft_security import (
    SecurityValidationError,
    check_archive_limits,
    sanitize_filename,
    validate_safe_path,
)


def test_path_traversal_variations():
    cases = [
        ("../../etc/passwd", "passwd"),
        ("..\\..\\windows\\system32\\cmd.exe", "cmd.exe"),
        ("/var/log/syslog", "syslog"),
        ("C:\\boot.ini", "boot.ini"),
        ("file\x00.exe", "file.exe"),
        ("normal_file.pdf", "normal_file.pdf"),
    ]
    for raw, expected in cases:
        assert sanitize_filename(raw) == expected


def test_directory_traversal_rejection(tmp_path: Path):
    base_dir = tmp_path / "quarantine"
    base_dir.mkdir()

    with pytest.raises(SecurityValidationError):
        validate_safe_path(base_dir, Path("../../../escaped.bin"))

    with pytest.raises(SecurityValidationError):
        validate_safe_path(base_dir, Path("subdir/../../escaped.bin"))


def test_archive_decompression_bomb_limit():
    # 1KB compressed to 20KB exceeds 10:1 ratio limit
    with pytest.raises(SecurityValidationError):
        check_archive_limits(compressed_size=1024, uncompressed_size=20480, max_ratio=10.0)

    # Exceeding absolute max bytes (250 MB ceiling)
    with pytest.raises(SecurityValidationError):
        check_archive_limits(compressed_size=50 * 1024 * 1024, uncompressed_size=300 * 1024 * 1024)

    # Safe archive within 10:1 ratio
    check_archive_limits(compressed_size=1024, uncompressed_size=4096, max_ratio=10.0)


def test_oversized_upload_rejected(tmp_path: Path):
    # Default limit is 100MB; test by creating a mock manager with 10 bytes limit
    mgr = IngestionManager(quarantine_dir=tmp_path, max_size_bytes=10)
    data = io.BytesIO(b"01234567891111111111")  # 20 bytes > 10 bytes
    with pytest.raises(IngestionError):
        mgr.ingest_stream(data, "large.txt")

