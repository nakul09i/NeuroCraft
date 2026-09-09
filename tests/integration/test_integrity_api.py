"""Integration tests for Trust and File Integrity API routes."""

import hashlib

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app


@pytest.mark.anyio
async def test_post_scan_with_matching_reference_hash(tmp_path):
    """Verify upload with matching reference hash returns MATCH and UNCHANGED."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_integrity.db"
    await init_db(custom_url=test_db)

    test_bytes = b"NeuroCraft Verified Integrity Payload Content"
    expected_sha256 = hashlib.sha256(test_bytes).hexdigest()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("verified_doc.txt", test_bytes, "text/plain")}
        data = {"reference_hash": expected_sha256}

        resp = await client.post("/api/v1/scans", files=files, data=data)
        assert resp.status_code == 201
        res = resp.json()

        assert "integrity_summary" in res
        assert res["integrity_summary"] is not None
        integrity = res["integrity_summary"]

        assert integrity["hash_match_status"] == "MATCH"
        assert integrity["integrity_status"] == "UNCHANGED"
        assert integrity["trust_score"] >= 70.0
        assert integrity["trust_level"] in ("HIGH", "VERY_HIGH")
        assert integrity["sha256"] == expected_sha256
        assert len(integrity["evidence"]) > 0

        # Also verify GET /api/v1/scans/{id}/integrity
        scan_id = res["scan_id"]
        get_int = await client.get(f"/api/v1/scans/{scan_id}/integrity")
        assert get_int.status_code == 200
        int_data = get_int.json()
        assert int_data["hash_match_status"] == "MATCH"
        assert int_data["integrity_status"] == "UNCHANGED"

        # Verify GET /api/v1/scans/{id}/trust
        get_trust = await client.get(f"/api/v1/scans/{scan_id}/trust")
        assert get_trust.status_code == 200
        trust_data = get_trust.json()
        assert trust_data["trust_score"] == int_data["trust_score"]
        assert trust_data["integrity_status"] == "UNCHANGED"
        assert "risk_level" in trust_data
        assert "summary" in trust_data


@pytest.mark.anyio
async def test_post_scan_with_mismatching_reference_hash(tmp_path):
    """
    Verify upload with mismatching reference hash returns MISMATCH.
    Verifies that hash mismatch does NOT make the file malware.
    """
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_integrity_mismatch.db"
    await init_db(custom_url=test_db)

    test_bytes = b"NeuroCraft Safe Payload that differs from expected hash"
    mismatched_sha256 = "f" * 64

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("differing_doc.txt", test_bytes, "text/plain")}
        data = {"reference_hash": mismatched_sha256}

        resp = await client.post("/api/v1/scans", files=files, data=data)
        assert resp.status_code == 201
        res = resp.json()

        integrity = res["integrity_summary"]
        assert integrity["hash_match_status"] == "MISMATCH"
        assert integrity["integrity_status"] == "MISMATCH"
        assert integrity["trust_score"] < 40.0

        # CRITICAL: File is NOT marked critical/malicious just because of hash mismatch
        assert res["verdict"]["level"] in ("SAFE", "LOW", "MEDIUM")

        # Integrity finding is present
        finding_ids = [f["id"] for f in res["findings"]]
        assert "FIND-INT-001" in finding_ids


@pytest.mark.anyio
async def test_get_scan_integrity_and_trust_isolation(tmp_path):
    """Verify user isolation on integrity and trust routes."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_isolation.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register User A
        reg_a = await client.post(
            "/api/v1/auth/signup",
            json={"email": "alice@neurocraft.io", "password": "Password123!", "display_name": "Alice"},
        )
        assert reg_a.status_code == 201
        token_a = reg_a.json()["access_token"]

        # Register User B
        reg_b = await client.post(
            "/api/v1/auth/signup",
            json={"email": "bob@neurocraft.io", "password": "Password123!", "display_name": "Bob"},
        )
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]

        # User A uploads a scan
        files = {"file": ("alice_doc.txt", b"Alice confidential payload", "text/plain")}
        upload_resp = await client.post(
            "/api/v1/scans",
            files=files,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert upload_resp.status_code == 201
        scan_id = upload_resp.json()["scan_id"]

        # User A can view integrity and trust
        resp_a_int = await client.get(
            f"/api/v1/scans/{scan_id}/integrity",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert resp_a_int.status_code == 200

        resp_a_trust = await client.get(
            f"/api/v1/scans/{scan_id}/trust",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert resp_a_trust.status_code == 200

        # User B CANNOT view User A's integrity or trust
        resp_b_int = await client.get(
            f"/api/v1/scans/{scan_id}/integrity",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp_b_int.status_code == 404

        resp_b_trust = await client.get(
            f"/api/v1/scans/{scan_id}/trust",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp_b_trust.status_code == 404


@pytest.mark.anyio
async def test_get_integrity_not_found():
    """Verify 404 on nonexistent scan id."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/scans/non-existent-scan-id-xyz/integrity")
        assert resp.status_code == 404

        resp_trust = await client.get("/api/v1/scans/non-existent-scan-id-xyz/trust")
        assert resp_trust.status_code == 404
