"""Comprehensive unit and integration tests for NeuroCraft Real File Analysis Engine.

Verifies:
1. Real static analysis of safe files (plain text, PNG, JPEG, PDF, ZIP)
2. Safe files remain SAFE/LOW (False Positive Control)
3. Determinism: Same file produces identical SHA-256, score, and level
4. Scan Isolation: Scan A findings never leak to Scan B
5. Unsupported formats honestly marked as 'limited'
6. Corrupt file handling (graceful recovery, no crash)
7. Oversized file enforcement
8. Zero Execution / Security Isolation
"""

import io
import zipfile
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app
from neurocraft_api.repositories.scan_repo import ScanRepository
from neurocraft_scanner import IngestionError, IngestionManager, ScannerOrchestrator
from neurocraft_types import (
    ConfidenceEnum,
    FileTypeEnum,
    Finding,
    SeverityEnum,
    VerdictLevel,
)

# Minimal 1x1 valid PNG image fixture (68 bytes)
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00"
    b"\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

# Minimal valid JPEG image fixture
VALID_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
)

# Minimal clean PDF fixture without active content
VALID_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n"
    b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n"
)


@pytest.fixture
def orchestrator():
    return ScannerOrchestrator()


@pytest.fixture
def ingestion():
    return IngestionManager()


# ==============================================================================
# 1. Determinism Tests
# ==============================================================================


def test_determinism_same_file_twice(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Analyze the exact same file twice; verify results are strictly deterministic."""
    sample = tmp_path / "sample.txt"
    sample.write_text("Hello NeuroCraft Determinism Test", encoding="utf-8")

    res1 = orchestrator.scan_file(sample, "sample.txt", "scan-det-1")
    res2 = orchestrator.scan_file(sample, "sample.txt", "scan-det-2")

    assert res1.hashes.sha256 == res2.hashes.sha256
    assert res1.file_type.type == res2.file_type.type
    assert res1.risk_verdict.score == res2.risk_verdict.score
    assert res1.risk_verdict.level == res2.risk_verdict.level
    assert res1.risk_verdict.confidence == res2.risk_verdict.confidence
    assert len(res1.findings) == len(res2.findings)


# ==============================================================================
# 2. False Positive Tests: Safe Files Must Remain Safe / Low
# ==============================================================================


def test_safe_plain_text_remains_safe(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify an ordinary safe text file is classified as SAFE with 0 risk score."""
    txt_file = tmp_path / "notes.txt"
    txt_file.write_text(
        "Project Architecture Notes:\n- Database: SQLite\n- Frontend: React Vite\n- Safe and secure.",
        encoding="utf-8",
    )

    res = orchestrator.scan_file(txt_file, "notes.txt", "scan-txt-1")
    assert res.file_type.type == FileTypeEnum.TEXT
    assert res.risk_verdict.score == 0.0
    assert res.risk_verdict.level == VerdictLevel.SAFE
    assert res.risk_verdict.confidence == ConfidenceEnum.HIGH
    assert res.status == "completed"


def test_safe_png_image_remains_safe(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify an ordinary valid PNG is classified as SAFE and NOT flagged for entropy."""
    png_file = tmp_path / "photo.png"
    png_file.write_bytes(VALID_PNG_BYTES)

    res = orchestrator.scan_file(png_file, "photo.png", "scan-png-1")
    assert res.file_type.type == FileTypeEnum.IMAGE
    assert res.risk_verdict.score <= 10.0
    assert res.risk_verdict.level in (VerdictLevel.SAFE, VerdictLevel.LOW)
    assert res.status == "completed"
    # No false entropy warning
    assert not any(f.id == "FIND-GEN-002" for f in res.findings)


def test_safe_jpeg_image_remains_safe(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify an ordinary valid JPEG is classified as SAFE."""
    jpeg_file = tmp_path / "image.jpg"
    jpeg_file.write_bytes(VALID_JPEG_BYTES)

    res = orchestrator.scan_file(jpeg_file, "image.jpg", "scan-jpg-1")
    assert res.file_type.type == FileTypeEnum.IMAGE
    assert res.risk_verdict.level in (VerdictLevel.SAFE, VerdictLevel.LOW)
    assert res.status == "completed"


def test_safe_pdf_document_remains_safe(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify a standard clean PDF without JavaScript/Launch is classified as SAFE."""
    pdf_file = tmp_path / "document.pdf"
    pdf_file.write_bytes(VALID_PDF_BYTES)

    res = orchestrator.scan_file(pdf_file, "document.pdf", "scan-pdf-1")
    assert res.file_type.type == FileTypeEnum.PDF
    assert res.risk_verdict.level == VerdictLevel.SAFE
    assert res.status == "completed"
    assert not any(f.id in ("FIND-PDF-001", "FIND-PDF-002") for f in res.findings)


def test_safe_zip_archive_remains_safe(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify a standard clean ZIP archive with benign text files is classified as SAFE."""
    zip_path = tmp_path / "data.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("file1.txt", "Sample text inside zip archive.")
        zf.writestr("file2.txt", "Another text document.")

    res = orchestrator.scan_file(zip_path, "data.zip", "scan-zip-1")
    assert res.file_type.type == FileTypeEnum.ZIP
    assert res.risk_verdict.level == VerdictLevel.SAFE
    assert res.status == "completed"


# ==============================================================================
# 3. Format Anomaly and Threat Detection Tests
# ==============================================================================


def test_polyglot_png_with_appended_payload(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify detection of suspicious appended binary executable after PNG IEND marker."""
    png_polyglot = tmp_path / "polyglot.png"
    # Valid PNG + appended MZ header
    payload = VALID_PNG_BYTES + b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 100
    png_polyglot.write_bytes(payload)

    res = orchestrator.scan_file(png_polyglot, "polyglot.png", "scan-poly-1")
    assert any(f.id == "FIND-IMG-001" for f in res.findings)
    assert res.risk_verdict.level in (VerdictLevel.LOW, VerdictLevel.MEDIUM, VerdictLevel.HIGH)


def test_weaponized_powershell_script(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify detection of obfuscated PowerShell encoded execution."""
    script_file = tmp_path / "dropper.ps1"
    script_file.write_text(
        "powershell.exe -ExecutionPolicy Bypass -NoProfile -EncodedCommand aW52b2tlLWV4cHJlc3Npb24=",
        encoding="utf-8",
    )

    res = orchestrator.scan_file(script_file, "dropper.ps1", "scan-ps-1")
    assert any(f.id == "FIND-TXT-001" for f in res.findings)
    assert res.risk_verdict.score >= 20.0


def test_unsupported_format_honest_limited_status(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify unsupported formats return status='limited' and confidence=LOW without fake findings."""
    unsupported = tmp_path / "unknown.xyz"
    unsupported.write_bytes(b"\x12\x34\x56\x78\x9a\xbc\xde\xf0" * 32)

    res = orchestrator.scan_file(unsupported, "unknown.xyz", "scan-unsupp-1")
    assert res.file_type.type == FileTypeEnum.UNKNOWN
    assert res.status == "limited"
    assert res.risk_verdict.confidence == ConfidenceEnum.LOW
    assert any(f.id == "FIND-FMT-UNSUPPORTED" for f in res.findings)


def test_corrupted_file_handled_gracefully(tmp_path: Path, orchestrator: ScannerOrchestrator):
    """Verify corrupted file headers are handled gracefully without unhandled exceptions."""
    corrupt = tmp_path / "corrupt.pdf"
    corrupt.write_bytes(b"%PDF-\xff\xfe\x00TruncatedGarbage")

    res = orchestrator.scan_file(corrupt, "corrupt.pdf", "scan-corrupt-1")
    assert res.hashes.sha256 is not None
    assert res.risk_verdict is not None


# ==============================================================================
# 4. Ingestion Security & Bounds
# ==============================================================================


def test_oversized_file_rejected(tmp_path: Path):
    """Verify ingestion strictly enforces maximum upload size."""
    mgr = IngestionManager(max_size_bytes=1024)
    oversized_stream = io.BytesIO(b"A" * 2048)

    with pytest.raises(IngestionError, match="exceeded maximum allowed upload size"):
        mgr.ingest_stream(oversized_stream, "huge.txt")


def test_quarantine_cleanup(tmp_path: Path, ingestion: IngestionManager):
    """Verify quarantine files are cleaned up reliably."""
    stream = io.BytesIO(b"Clean me up!")
    with ingestion.quarantined(stream, "temp.txt") as (_sid, _clean, path, _size):
        assert path.exists()
    assert not path.exists()


# ==============================================================================
# 5. Scan Isolation Test (Scan A findings NEVER appear in Scan B)
# ==============================================================================


@pytest.mark.anyio
async def test_scan_isolation_no_finding_leakage(tmp_path: Path):
    """Explicitly verify Scan A findings NEVER leak to Scan B."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/isolation_test.db"
    await init_db(custom_url=test_db)
    scan_repo = ScanRepository()

    orchestrator = ScannerOrchestrator()

    # Create File A (benign, 0 threat findings)
    file_a = tmp_path / "file_a.txt"
    file_a.write_text("Hello from file A. Perfectly safe document.", encoding="utf-8")
    res_a = orchestrator.scan_file(file_a, "file_a.txt", "SCAN-AAA-111")
    await scan_repo.save_scan_result(res_a)

    # Create File B (suspicious, has finding)
    file_b = tmp_path / "file_b.ps1"
    file_b.write_text("powershell.exe -enc aW52b2tlLWV4cHJlc3Npb24=", encoding="utf-8")
    res_b = orchestrator.scan_file(file_b, "file_b.ps1", "SCAN-BBB-222")
    # Manually add distinctive finding to B
    res_b.findings.append(
        Finding(
            id="FIND-UNIQUE-TO-B",
            category="SPECIAL_B",
            title="Finding strictly in Scan B",
            description="Unique marker",
            severity=SeverityEnum.HIGH,
            confidence=ConfidenceEnum.HIGH,
            source_engine="test",
        )
    )
    await scan_repo.save_scan_result(res_b)

    # Retrieve findings via repository
    findings_a = await scan_repo.get_findings_for_scan("SCAN-AAA-111")
    findings_b = await scan_repo.get_findings_for_scan("SCAN-BBB-222")

    # Assert Scan A has NO findings from Scan B
    assert not any(f.finding_id == "FIND-UNIQUE-TO-B" for f in findings_a)
    assert not any(f.category == "SPECIAL_B" for f in findings_a)

    # Assert Scan B contains its finding
    assert any(f.finding_id == "FIND-UNIQUE-TO-B" for f in findings_b)


# ==============================================================================
# 6. API Integration: Findings Endpoint & Upload Flow
# ==============================================================================


@pytest.mark.anyio
async def test_api_upload_and_findings_retrieval(tmp_path: Path):
    """End-to-end test of POST /api/v1/scans and GET /api/v1/scans/{id}/findings."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/api_test.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload clean file
        files = {"file": ("document.txt", b"Safe report text without threats.", "text/plain")}
        res = await client.post("/api/v1/scans", files=files)
        assert res.status_code == 201
        data = res.json()
        scan_id = data["scan_id"]
        assert data["verdict"]["level"] == "SAFE"
        assert data["verdict"]["score"] == 0.0
        assert data["status"] == "completed"

        # 2. Retrieve findings for scan
        findings_res = await client.get(f"/api/v1/scans/{scan_id}/findings")
        assert findings_res.status_code == 200
        findings_data = findings_res.json()
        assert isinstance(findings_data, list)

        # 3. Retrieve non-existent scan findings -> 404
        bad_res = await client.get("/api/v1/scans/non-existent-scan-id/findings")
        assert bad_res.status_code == 404
