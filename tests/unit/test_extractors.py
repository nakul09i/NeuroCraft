"""Unit tests for static feature extractors and malformed file handling."""

from pathlib import Path

from neurocraft_scanner.extractors.apk import extract_apk_features
from neurocraft_scanner.extractors.generic import calculate_entropy, extract_generic_features
from neurocraft_scanner.extractors.pdf import extract_pdf_features
from neurocraft_scanner.extractors.pe import extract_pe_features
from neurocraft_types import FileTypeEnum, FileTypeInfo


def test_entropy_uniform_bytes(tmp_path: Path):
    f = tmp_path / "zeros.bin"
    f.write_bytes(b"\x00" * 1024)
    entropy = calculate_entropy(f)
    assert entropy == 0.0


def test_entropy_high_random(tmp_path: Path):
    f = tmp_path / "random.bin"
    # Write pseudo-random byte stream covering 256 byte values
    f.write_bytes(bytes([i % 256 for i in range(10240)]))
    entropy = calculate_entropy(f)
    assert entropy >= 7.9


def test_generic_extracts_suspicious_indicators(tmp_path: Path):
    f = tmp_path / "script.ps1"
    f.write_bytes(
        b"powershell.exe -enc aW52b2tl\ncmd.exe /c whoami\nhttp://malicious-domain.com/drop.exe"
    )

    ft_info = FileTypeInfo(
        type=FileTypeEnum.TEXT,
        mime="text/plain",
        description="Text",
        is_supported=True,
    )
    features, findings = extract_generic_features(f, ft_info)

    assert (
        "powershell.exe" in features["suspicious_string_indicators"]
        or "powershell" in features["suspicious_string_indicators"]
    )
    assert any("http://malicious-domain.com/drop.exe" in url for url in features["embedded_urls"])
    # Finding generated for suspicious commands
    assert any(f.id == "FIND-GEN-003" for f in findings)


def test_malformed_pe_handling(tmp_path: Path):
    # Header claims to be PE but is truncated and corrupt
    corrupt_pe = tmp_path / "corrupt.exe"
    corrupt_pe.write_bytes(b"MZ\x90\x00\x03\x00\x00\x00PE\x00\x00CORRUPTED_BYTES_HERE")

    # MUST gracefully return error finding, not crash with unhandled exception
    features, findings = extract_pe_features(corrupt_pe)
    assert "error" in features
    assert any(f.category == "MALFORMED_HEADER" for f in findings)


def test_malformed_pdf_handling(tmp_path: Path):
    pdf = tmp_path / "test.pdf"
    pdf.write_bytes(
        b"%PDF-1.4\n1 0 obj\n<< /JavaScript (app.alert('evil')) /OpenAction 1 0 R >>\nendobj\n"
    )

    features, findings = extract_pdf_features(pdf)
    assert features["has_javascript"] is True
    assert features["has_launch_or_open_action"] is True
    # Check findings for active JS and OpenAction
    finding_ids = [f.id for f in findings]
    assert "FIND-PDF-001" in finding_ids
    assert "FIND-PDF-002" in finding_ids


def test_malformed_apk_handling(tmp_path: Path):
    corrupt_apk = tmp_path / "corrupt.apk"
    corrupt_apk.write_bytes(b"PK\x03\x04NOT_A_VALID_ZIP_ARCHIVE")

    features, findings = extract_apk_features(corrupt_apk)
    assert "error" in features
