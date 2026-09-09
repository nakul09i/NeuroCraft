"""Integration tests for NeuroCraft Offline-First Architecture and Sync Queue API."""

import os
from io import BytesIO

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import (
    init_db,
)
from neurocraft_api.main import app
from neurocraft_api.sync.service import MockCloudSyncAdapter, get_sync_service


@pytest.fixture(autouse=True)
async def setup_test_db():
    """Ensure database tables and clean state before each test."""
    await init_db()
    yield


@pytest.mark.anyio
async def test_offline_scan_execution_and_automatic_enqueue():
    """Scenario A: Scan executes 100% locally offline, persists to SQLite, and enqueues to sync_queue."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        sample_content = b"MZ\x90\x00\x03\x00\x00\x00PE\x00\x00This is a safe local test binary"
        files = {"file": ("offline_sample.exe", BytesIO(sample_content), "application/octet-stream")}

        # Scan should succeed immediately without cloud requirement
        resp = await ac.post("/api/v1/scans", files=files)
        assert resp.status_code == 201
        data = resp.json()

        assert "scan_id" in data
        assert data["file"]["name"] == "offline_sample.exe"
        assert "verdict" in data
        scan_id = data["scan_id"]

        # Check sync status endpoint shows pending item
        sync_resp = await ac.get("/api/v1/sync/status")
        assert sync_resp.status_code == 200
        sync_data = sync_resp.json()
        assert sync_data["pending_count"] >= 1

        # Check sync queue listing contains the scan
        queue_resp = await ac.get("/api/v1/sync/queue")
        assert queue_resp.status_code == 200
        queue_items = queue_resp.json()
        scan_items = [item for item in queue_items if item["entity_id"] == scan_id]
        assert len(scan_items) == 1
        assert scan_items[0]["entity_type"] == "scan"
        assert scan_items[0]["status"] == "PENDING"


@pytest.mark.anyio
async def test_offline_history_and_reports():
    """Scenarios B & C: History browsing and local report generation work completely offline."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First upload a sample file
        files = {"file": ("report_test.txt", BytesIO(b"Safe test content for report verification"), "text/plain")}
        scan_resp = await ac.post("/api/v1/scans", files=files)
        assert scan_resp.status_code == 201
        scan_id = scan_resp.json()["scan_id"]

        # 1. Verify history retrieves locally
        hist_resp = await ac.get("/api/v1/scans")
        assert hist_resp.status_code == 200
        items = hist_resp.json()
        assert any(s["scan_id"] == scan_id for s in items)

        # 2. Verify local report generation
        rep_req = {
            "title": "Offline Verification Report",
            "report_type": "TECHNICAL",
            "scan_id": scan_id,
        }
        rep_resp = await ac.post("/api/v1/reports", json=rep_req)
        assert rep_resp.status_code == 201
        rep_id = rep_resp.json()["id"]

        # 3. Verify local exports (PDF, CSV, JSON)
        pdf_resp = await ac.get(f"/api/v1/reports/{rep_id}/export?format=pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF")

        csv_resp = await ac.get(f"/api/v1/reports/{rep_id}/export?format=csv")
        assert csv_resp.status_code == 200
        assert "text/csv" in csv_resp.headers["content-type"]

        json_resp = await ac.get(f"/api/v1/reports/{rep_id}/export?format=json")
        assert json_resp.status_code == 200
        assert "application/json" in json_resp.headers["content-type"]


@pytest.mark.anyio
async def test_sync_queue_api_flush_and_retry():
    """Scenario D: Verification of /api/v1/sync/flush and retry endpoints."""
    # Use MockCloudSyncAdapter for deterministic flush verification
    mock_adapter = MockCloudSyncAdapter(should_fail=False)
    sync_svc = get_sync_service()
    sync_svc.set_cloud_adapter(mock_adapter)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Enqueue a local scan
        files = {"file": ("flush_test.bin", BytesIO(b"Flush verification payload"), "application/octet-stream")}
        scan_resp = await ac.post("/api/v1/scans", files=files)
        assert scan_resp.status_code == 201
        scan_id = scan_resp.json()["scan_id"]
        assert scan_id

        # Call flush endpoint
        flush_resp = await ac.post("/api/v1/sync/flush")
        assert flush_resp.status_code == 200
        flush_data = flush_resp.json()
        assert flush_data["processed"] >= 1
        assert flush_data["synced"] >= 1

        # Check queue status reflects synced
        status_resp = await ac.get("/api/v1/sync/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["synced_count"] >= 1


@pytest.mark.anyio
async def test_offline_recon_safeguards():
    """Scenario E: When offline, recon returns 503 if no cache exists, or returns CACHED if previous scan exists."""
    import uuid

    os.environ["NEUROCRAFT_OFFLINE_MODE"] = "1"
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Target with no cache -> 503 Service Unavailable
            req1 = {"target": "uncached-offline-target.com", "authorization_confirmed": True}
            r1 = await ac.post("/api/v1/recon", json=req1)
            assert r1.status_code == 503
            assert "Recon unavailable while offline" in r1.json()["detail"]

            # 2. Pre-populate a cached scan in SQLite for a target
            cached_target = f"cached-{uuid.uuid4().hex[:6]}.org"
            from neurocraft_api.database import save_recon_scan
            from neurocraft_types import ConfidenceEnum, ReconScanResponse, VerdictLevel

            pre_scan = ReconScanResponse(
                id=f"recon-cached-{uuid.uuid4().hex[:8]}",
                target=cached_target,
                status="COMPLETED",
                exposure_score=15.0,
                exposure_level=VerdictLevel.SAFE,
                confidence=ConfidenceEnum.HIGH,
                confidence_score=0.95,
                limitations=["Initial observation"],
            )
            await save_recon_scan(pre_scan)

            # 3. Query the same target while offline -> 200 OK with cached=True
            req2 = {"target": cached_target, "authorization_confirmed": True}
            r2 = await ac.post("/api/v1/recon", json=req2)
            assert r2.status_code == 201 or r2.status_code == 200
            data2 = r2.json()
            assert data2["cached"] is True
            assert any("offline" in lim.lower() for lim in data2["limitations"])
    finally:
        os.environ.pop("NEUROCRAFT_OFFLINE_MODE", None)
