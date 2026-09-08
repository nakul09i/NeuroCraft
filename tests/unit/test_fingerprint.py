"""Unit tests for streaming cryptographic fingerprinting."""

from pathlib import Path

from neurocraft_scanner.fingerprint import compute_fingerprint


def test_fingerprint_empty_file(tmp_path: Path):
    empty_file = tmp_path / "empty.bin"
    empty_file.write_bytes(b"")

    res = compute_fingerprint(empty_file, scan_id="test-scan-empty")
    assert res.file_size_bytes == 0
    # Standard SHA-256 for empty file: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    assert res.hashes.sha256 == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert res.hashes.md5 == "d41d8cd98f00b204e9800998ecf8427e"
    assert res.hashes.sha1 == "da39a3ee5e6b4b0d3255bfef95601890afd80709"
    assert res.hash_duration_ms >= 0.0


def test_fingerprint_known_content(tmp_path: Path):
    sample_file = tmp_path / "sample.txt"
    sample_file.write_bytes(b"NeuroCraft: Detect. Verify. Prove.")

    res = compute_fingerprint(sample_file, scan_id="test-scan-sample")
    assert res.file_size_bytes == 34
    assert len(res.hashes.sha256) == 64
    assert res.scan_id == "test-scan-sample"


def test_fingerprint_chunking(tmp_path: Path):
    # 256 KB file tested with 32 KB chunks
    large_file = tmp_path / "large.bin"
    data = b"0123456789ABCDEF" * (16 * 1024)
    large_file.write_bytes(data)

    res = compute_fingerprint(large_file, scan_id="test-large", chunk_size=32 * 1024)
    assert res.file_size_bytes == len(data)
    assert len(res.hashes.sha256) == 64
