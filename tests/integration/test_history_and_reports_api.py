"""Integration tests for Scan History, Reconnaissance Correlation, and Multi-Format Report Generation."""

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app


@pytest.mark.anyio
async def test_scan_history_search_filters_sort_and_isolation(tmp_path):
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_history_suite.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register Alice & Bob
        alice_reg = await client.post(
            "/api/v1/auth/signup",
            json={"email": "alice_hist@test.com", "password": "Password123!", "display_name": "Alice"},
        )
        assert alice_reg.status_code == 201
        alice_headers = {"Authorization": f"Bearer {alice_reg.json()['access_token']}"}

        bob_reg = await client.post(
            "/api/v1/auth/signup",
            json={"email": "bob_hist@test.com", "password": "Password123!", "display_name": "Bob"},
        )
        assert bob_reg.status_code == 201
        bob_headers = {"Authorization": f"Bearer {bob_reg.json()['access_token']}"}

        # 2. Alice uploads 3 distinct files
        # File 1: invoice pdf
        f1 = {"file": ("vendor_invoice_2026.pdf", b"%PDF-1.4 sample invoice content with text", "application/pdf")}
        r1 = await client.post("/api/v1/scans", files=f1, headers=alice_headers)
        assert r1.status_code == 201
        scan1_id = r1.json()["scan_id"]

        # File 2: powershell script
        f2 = {"file": ("admin_audit_tool.ps1", b"Write-Host 'Running audit tool script'", "text/plain")}
        r2 = await client.post("/api/v1/scans", files=f2, headers=alice_headers)
        assert r2.status_code == 201
        assert "scan_id" in r2.json()

        # File 3: image png
        f3 = {"file": ("company_logo.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 30, "image/png")}
        r3 = await client.post("/api/v1/scans", files=f3, headers=alice_headers)
        assert r3.status_code == 201
        scan3_id = r3.json()["scan_id"]

        # Bob uploads 1 file
        fb = {"file": ("bob_private_memo.docx", b"PK\x03\x04 Bob confidential memo content", "application/zip")}
        rb = await client.post("/api/v1/scans", files=fb, headers=bob_headers)
        assert rb.status_code == 201
        bob_scan_id = rb.json()["scan_id"]

        # 3. Test Alice List Scans (pagination & headers)
        alice_scans_all = await client.get("/api/v1/scans", headers=alice_headers)
        assert alice_scans_all.status_code == 200
        assert alice_scans_all.headers.get("X-Total-Count") == "3"
        assert len(alice_scans_all.json()) == 3

        # Test pagination limit=2, offset=0
        alice_p1 = await client.get("/api/v1/scans?limit=2&offset=0", headers=alice_headers)
        assert alice_p1.status_code == 200
        assert len(alice_p1.json()) == 2
        assert alice_p1.headers.get("X-Total-Count") == "3"
        assert alice_p1.headers.get("X-Limit") == "2"
        assert alice_p1.headers.get("X-Offset") == "0"

        # Test pagination offset=2
        alice_p2 = await client.get("/api/v1/scans?limit=2&offset=2", headers=alice_headers)
        assert alice_p2.status_code == 200
        assert len(alice_p2.json()) == 1

        # 4. Test Search `q`
        q_invoice = await client.get("/api/v1/scans?q=invoice", headers=alice_headers)
        assert q_invoice.status_code == 200
        results = q_invoice.json()
        assert len(results) == 1
        assert "invoice" in results[0]["filename"].lower()

        q_script = await client.get("/api/v1/scans?q=ps1", headers=alice_headers)
        assert q_script.status_code == 200
        assert len(q_script.json()) == 1
        assert results[0]["scan_id"] != q_script.json()[0]["scan_id"]

        q_empty = await client.get("/api/v1/scans?q=nonexistentqueryxyz", headers=alice_headers)
        assert q_empty.status_code == 200
        assert len(q_empty.json()) == 0

        # 5. Test Sorting
        sort_oldest = await client.get("/api/v1/scans?sort_by=oldest", headers=alice_headers)
        assert sort_oldest.status_code == 200
        assert sort_oldest.json()[0]["scan_id"] == scan1_id

        sort_newest = await client.get("/api/v1/scans?sort_by=newest", headers=alice_headers)
        assert sort_newest.status_code == 200
        assert sort_newest.json()[0]["scan_id"] == scan3_id

        # 6. Test User Isolation (Bob's view vs Alice's view)
        bob_scans = await client.get("/api/v1/scans", headers=bob_headers)
        assert bob_scans.status_code == 200
        assert len(bob_scans.json()) == 1
        assert bob_scans.json()[0]["scan_id"] == bob_scan_id

        # Bob accessing Alice's scan directly -> 404
        bob_get_alice = await client.get(f"/api/v1/scans/{scan1_id}", headers=bob_headers)
        assert bob_get_alice.status_code == 404

        # Bob accessing Alice's correlated recon -> 404
        bob_recon_alice = await client.get(f"/api/v1/scans/{scan1_id}/recon", headers=bob_headers)
        assert bob_recon_alice.status_code == 404

        # Bob exporting Alice's report -> 404
        bob_exp_pdf = await client.get(f"/api/v1/scans/{scan1_id}/report?format=pdf", headers=bob_headers)
        assert bob_exp_pdf.status_code == 404
        bob_exp_csv = await client.get(f"/api/v1/scans/{scan1_id}/report?format=csv", headers=bob_headers)
        assert bob_exp_csv.status_code == 404
        bob_exp_json = await client.get(f"/api/v1/scans/{scan1_id}/report?format=json", headers=bob_headers)
        assert bob_exp_json.status_code == 404


@pytest.mark.anyio
async def test_scan_report_export_formats_and_integrity(tmp_path):
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_report_formats.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register user
        reg = await client.post(
            "/api/v1/auth/signup",
            json={"email": "auditor@neurocraft.io", "password": "SecurePass123!", "display_name": "Lead Auditor"},
        )
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Upload a scan
        doc_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        scan_res = await client.post(
            "/api/v1/scans",
            files={"file": ("audit_sample.pdf", doc_bytes, "application/pdf")},
            headers=headers,
        )
        assert scan_res.status_code == 201
        scan_id = scan_res.json()["scan_id"]

        # 1. JSON Export
        res_json = await client.get(f"/api/v1/scans/{scan_id}/report?format=json", headers=headers)
        assert res_json.status_code == 200
        assert "application/json" in res_json.headers.get("content-type", "")
        payload = res_json.json()
        assert payload["scan_id"] == scan_id
        assert payload["file_profile"]["filename"] == "audit_sample.pdf"
        assert "report_meta" in payload
        assert "risk_assessment" in payload
        assert "trust_and_integrity" in payload

        # 2. CSV Export
        res_csv = await client.get(f"/api/v1/scans/{scan_id}/report?format=csv", headers=headers)
        assert res_csv.status_code == 200
        assert "text/csv" in res_csv.headers.get("content-type", "")
        csv_text = res_csv.text
        assert "Scan ID" in csv_text
        assert "File Name" in csv_text
        assert "Severity" in csv_text
        assert "audit_sample.pdf" in csv_text

        # 3. PDF Export
        res_pdf = await client.get(f"/api/v1/scans/{scan_id}/report?format=pdf", headers=headers)
        assert res_pdf.status_code == 200
        assert "application/pdf" in res_pdf.headers.get("content-type", "")
        assert res_pdf.content.startswith(b"%PDF-1.4")
        assert res_pdf.content.rstrip().endswith(b"%%EOF")

        # 4. Invalid format error
        res_invalid = await client.get(f"/api/v1/scans/{scan_id}/report?format=exe", headers=headers)
        assert res_invalid.status_code == 400


@pytest.mark.anyio
async def test_report_entity_export_and_isolation(tmp_path):
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_report_entity.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register User A and User B
        u_a = await client.post(
            "/api/v1/auth/signup",
            json={"email": "alice_rep@test.com", "password": "Password123!", "display_name": "Alice"},
        )
        headers_a = {"Authorization": f"Bearer {u_a.json()['access_token']}"}

        u_b = await client.post(
            "/api/v1/auth/signup",
            json={"email": "bob_rep@test.com", "password": "Password123!", "display_name": "Bob"},
        )
        headers_b = {"Authorization": f"Bearer {u_b.json()['access_token']}"}

        # Alice creates a formal report
        gen_res = await client.post(
            "/api/v1/reports",
            json={"report_type": "EXECUTIVE_SUMMARY", "title": "Corporate Integrity Audit"},
            headers=headers_a,
        )
        assert gen_res.status_code == 201
        report_id = gen_res.json()["id"]

        # Alice exports report in PDF
        pdf_res = await client.get(f"/api/v1/reports/{report_id}/export?format=pdf", headers=headers_a)
        assert pdf_res.status_code == 200
        assert pdf_res.content.startswith(b"%PDF-1.4")

        # Alice exports report in CSV
        csv_res = await client.get(f"/api/v1/reports/{report_id}/export?format=csv", headers=headers_a)
        assert csv_res.status_code == 200
        assert "report_id" in csv_res.text.lower()

        # Alice exports report in JSON
        json_res = await client.get(f"/api/v1/reports/{report_id}/export?format=json", headers=headers_a)
        assert json_res.status_code == 200
        assert json_res.json()["id"] == report_id

        # Bob attempts to export Alice's report -> 404
        bob_pdf = await client.get(f"/api/v1/reports/{report_id}/export?format=pdf", headers=headers_b)
        assert bob_pdf.status_code == 404

        bob_csv = await client.get(f"/api/v1/reports/{report_id}/export?format=csv", headers=headers_b)
        assert bob_csv.status_code == 404

        bob_json = await client.get(f"/api/v1/reports/{report_id}/export?format=json", headers=headers_b)
        assert bob_json.status_code == 404
