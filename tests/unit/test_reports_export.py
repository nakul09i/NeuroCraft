"""Unit tests for NeuroCraft scan history export and report builders (JSON, CSV, PDF)."""

import csv
import io
import json

from neurocraft_api.reports.csv_exporter import export_scan_as_csv
from neurocraft_api.reports.json_exporter import export_scan_as_json
from neurocraft_api.reports.pdf_builder import PdfStreamBuilder, export_scan_as_pdf, generate_report_pdf


def _make_dummy_scan_data():
    return {
        "scan_id": "test-scan-1234567890ab",
        "user_id": "user-alice",
        "filename": "sample_invoice.pdf",
        "file_size": 42000,
        "file_type": "PDF",
        "mime_type": "application/pdf",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "md5": "d41d8cd98f00b204e9800998ecf8427e",
        "status": "completed",
        "risk_level": "LOW",
        "risk_score": 18,
        "confidence": "HIGH",
        "verdict": "Low Risk",
        "summary": "File analysis revealed standard document characteristics with valid structural headers.",
        "created_at": "2026-09-10T02:00:00Z",
        "findings": [
            {
                "id": "FIND-001",
                "finding_id": "FIND-001",
                "rule_id": "PDF_METADATA_EXTRACT",
                "title": "Embedded Metadata Present",
                "description": "The PDF contains standard Author and Producer metadata attributes.",
                "severity": "LOW",
                "category": "METADATA",
                "confidence": "HIGH",
                "evidence": {"producer": "Acrobat 11.0"},
            },
            {
                "id": "FIND-002",
                "finding_id": "FIND-002",
                "rule_id": "EXTERNAL_URL_DETECT",
                "title": "External Hyperlink Detected",
                "description": "Document contains an outbound link referencing example.org.",
                "severity": "MEDIUM",
                "category": "NETWORK_IOC",
                "confidence": "MEDIUM",
                "evidence": {"url": "https://example.org"},
            },
        ],
        "integrity": {
            "is_signed": True,
            "signature_status": "VALID",
            "trust_verdict": "TRUSTED",
            "signer_name": "Acme Document Services CA",
            "cert_issuer": "GlobalSign",
            "algorithm": "SHA256withRSA",
            "timestamp_present": True,
            "known_good_match": False,
        },
        "recon": {
            "target": "example.org",
            "target_type": "DOMAIN",
            "dns_records": {"A": ["93.184.216.34"]},
            "tls_info": {"subject": "example.org", "valid": True},
            "threat_signals": [],
            "risk_score": 5,
        },
    }


def test_export_scan_as_json_structure():
    scan_data = _make_dummy_scan_data()
    parsed = export_scan_as_json(scan_data)

    assert parsed["report_meta"]["format"] == "NeuroCraft Structured Audit JSON"
    assert parsed["report_meta"]["version"] == "1.0"
    assert parsed["scan_id"] == "test-scan-1234567890ab"
    assert parsed["file_profile"]["filename"] == "sample_invoice.pdf"
    assert parsed["risk_assessment"]["risk_level"] == "LOW"
    assert parsed["risk_assessment"]["risk_score"] == 18
    assert len(parsed["findings"]) == 2
    assert parsed["trust_and_integrity"]["is_signed"] is True
    assert parsed["trust_and_integrity"]["signer_name"] == "Acme Document Services CA"
    assert parsed["reconnaissance"]["target"] == "example.org"
    assert "methodological_limitations" in parsed
    assert "confidential" in parsed["report_meta"]["classification"].lower()


def test_export_scan_as_json_omits_sensitive_paths():
    scan_data = _make_dummy_scan_data()
    # Add hypothetical local scratch path or secret
    scan_data["file_path"] = "C:\\scratch\\temp_malicious_upload_382.bin"
    scan_data["api_key"] = "sk-live-secret-never-expose"

    parsed = export_scan_as_json(scan_data)
    json_str = json.dumps(parsed)
    assert "C:\\scratch\\temp_malicious_upload_382.bin" not in json_str
    assert "sk-live-secret" not in json_str


def test_export_scan_as_csv_with_findings():
    scan_data = _make_dummy_scan_data()
    csv_str = export_scan_as_csv(scan_data)

    reader = csv.DictReader(io.StringIO(csv_str))
    rows = list(reader)
    assert len(rows) == 2

    assert rows[0]["Scan ID"] == "test-scan-1234567890ab"
    assert rows[0]["File Name"] == "sample_invoice.pdf"
    assert rows[0]["Finding ID"] == "FIND-001"
    assert rows[0]["Severity"] == "LOW"
    assert rows[0]["Category"] == "METADATA"

    assert rows[1]["Finding ID"] == "FIND-002"
    assert rows[1]["Severity"] == "MEDIUM"


def test_export_scan_as_csv_without_findings():
    scan_data = _make_dummy_scan_data()
    scan_data["findings"] = []

    csv_str = export_scan_as_csv(scan_data)
    reader = csv.DictReader(io.StringIO(csv_str))
    rows = list(reader)
    assert len(rows) == 1
    assert rows[0]["Finding ID"] == "NO-FINDINGS"
    assert rows[0]["Severity"] == "INFORMATIONAL"
    assert "No significant security findings" in rows[0]["Description"]


def test_export_scan_as_pdf_validity_and_sections():
    scan_data = _make_dummy_scan_data()
    pdf_bytes = export_scan_as_pdf(scan_data)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-1.4")
    assert pdf_bytes.rstrip().endswith(b"%%EOF")

    # Inspect rendered PDF content strings
    pdf_text = pdf_bytes.decode("latin1", errors="ignore")

    assert "NEUROCRAFT" in pdf_text
    assert "EXECUTIVE SUMMARY" in pdf_text
    assert "FILE INFORMATION" in pdf_text
    assert "sample_invoice.pdf" in pdf_text
    assert "RISK ASSESSMENT" in pdf_text
    assert "FINDINGS" in pdf_text
    assert "Embedded Metadata Present" in pdf_text
    assert "TRUST & INTEGRITY" in pdf_text
    assert "Acme Document Services CA" in pdf_text
    assert "RECONNAISSANCE" in pdf_text
    assert "example.org" in pdf_text
    assert "LIMITATIONS" in pdf_text
    assert "REPORT METADATA" in pdf_text


def test_export_scan_as_pdf_handles_high_risk_and_many_findings():
    scan_data = _make_dummy_scan_data()
    scan_data["risk_level"] = "CRITICAL"
    scan_data["risk_score"] = 92
    scan_data["findings"] = [
        {
            "id": f"FIND-00{i}",
            "finding_id": f"FIND-00{i}",
            "title": f"Threat Finding Number {i} with Detailed Context",
            "description": f"Extended description for threat finding {i} explaining structural anomalies.",
            "severity": "HIGH" if i % 2 == 0 else "CRITICAL",
            "category": "STATIC_ANALYSIS",
            "confidence": "HIGH",
        }
        for i in range(1, 12)
    ]

    pdf_bytes = export_scan_as_pdf(scan_data)
    assert pdf_bytes.startswith(b"%PDF-1.4")
    assert pdf_bytes.rstrip().endswith(b"%%EOF")

    # Multi-page check: should generate multiple pages
    pdf_text = pdf_bytes.decode("latin1", errors="ignore")
    assert "/Type /Page" in pdf_text
    page_count = pdf_text.count("/Type /Page\n") + pdf_text.count("/Type /Page ")
    assert page_count >= 2


def test_generate_report_pdf_from_report_dict():
    report_dict = {
        "id": "rep-789xyz",
        "title": "Quarterly Document Security Audit",
        "report_type": "EXECUTIVE_SUMMARY",
        "summary": "Comprehensive security audit across analyzed documents.",
        "created_at": "2026-09-10T02:00:00Z",
        "content": {
            "recommendations": [
                "Enforce digital signature validation across all customer invoices.",
                "Review external links flagged in low-confidence documents.",
            ]
        },
    }

    pdf_bytes = generate_report_pdf(report_dict)
    assert pdf_bytes.startswith(b"%PDF-1.4")
    assert pdf_bytes.rstrip().endswith(b"%%EOF")
    pdf_text = pdf_bytes.decode("latin1", errors="ignore")
    assert "Quarterly Document Security Audit" in pdf_text
    assert "Enforce digital signature validation" in pdf_text


def test_pdf_stream_builder_special_character_escaping():
    builder = PdfStreamBuilder()
    builder.new_page()
    builder.draw_text("Testing (parentheses) and \\backslashes\\ in PDF text", 50, 500)
    pdf_bytes = builder.build_pdf_bytes()
    pdf_text = pdf_bytes.decode("latin1", errors="ignore")
    assert r"\(parentheses\)" in pdf_text
    assert r"\\backslashes\\" in pdf_text
