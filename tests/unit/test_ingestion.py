"""Unit tests for secure file ingestion and quarantine staging."""

import io
from pathlib import Path

import pytest
from neurocraft_scanner.ingestion import IngestionError, IngestionManager
from neurocraft_security import SecurityValidationError, sanitize_filename, validate_safe_path


def test_sanitize_filename_removes_dangerous_chars():
    assert sanitize_filename("../../../etc/shadow") == "shadow"
    assert sanitize_filename("..\\..\\Windows\\System32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("malicious\x00file.exe") == "maliciousfile.exe"
    assert sanitize_filename("   ") == "unnamed_artifact"


def test_validate_safe_path_detects_traversal(tmp_path: Path):
    base = tmp_path / "quarantine"
    base.mkdir()

    # Valid child
    valid = validate_safe_path(base, Path("scan_123.bin"))
    assert valid.parent == base

    # Traversal escaping base
    with pytest.raises(SecurityValidationError):
        validate_safe_path(base, Path("../../outside.txt"))


def test_ingestion_stream_enforces_size_limit(tmp_path: Path):
    quarantine = tmp_path / "quarantine"
    mgr = IngestionManager(quarantine_dir=quarantine, max_size_bytes=100)

    # 50 bytes should succeed
    data = io.BytesIO(b"A" * 50)
    scan_id, name, path, size = mgr.ingest_stream(data, "safe.txt")
    assert size == 50
    assert path.exists()
    mgr.cleanup(path)
    assert not path.exists()

    # 150 bytes should fail with IngestionError and clean up
    large_data = io.BytesIO(b"A" * 150)
    with pytest.raises(IngestionError):
        mgr.ingest_stream(large_data, "oversized.txt")


def test_ingestion_quarantined_context_manager(tmp_path: Path):
    quarantine = tmp_path / "quarantine"
    mgr = IngestionManager(quarantine_dir=quarantine, max_size_bytes=1024)

    data = io.BytesIO(b"Test quarantine content")
    with mgr.quarantined(data, "test.txt") as (scan_id, name, path, size):
        assert path.exists()
        assert size == len(b"Test quarantine content")

    # Path must be unlinked after context manager exits
    assert not path.exists()
