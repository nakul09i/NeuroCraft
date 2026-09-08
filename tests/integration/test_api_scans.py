"""Integration tests for FastAPI endpoints, database persistence, and end-to-end scanning."""

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app


@pytest.mark.anyio
async def test_health_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root health
        r1 = await client.get("/health")
        assert r1.status_code == 200
        assert r1.json()["status"] == "ok"

        # 2. Detailed health
        r2 = await client.get("/api/v1/health")
        assert r2.status_code == 200
        data = r2.json()
        assert data["status"] == "ok"
        assert "engines" in data
        assert data["engines"]["static_analysis"] == "COMPLETED"
        assert data["engines"]["yara"] == "NOT_CONFIGURED"
        assert data["engines"]["ml"] == "NOT_CONFIGURED"


@pytest.mark.anyio
async def test_post_and_get_scan_workflow(tmp_path):
    # Initialize DB for test run
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_scans.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a benign test file
        test_bytes = b"Hello NeuroCraft! Safe benign test document."
        files = {"file": ("benign.txt", test_bytes, "text/plain")}

        # POST /api/v1/scans
        resp = await client.post("/api/v1/scans", files=files)
        assert resp.status_code == 201
        data = resp.json()

        assert "scan_id" in data
        scan_id = data["scan_id"]
        assert data["file"]["name"] == "benign.txt"
        assert data["file"]["size"] == len(test_bytes)
        assert len(data["file"]["sha256"]) == 64
        assert data["file"]["type"] == "TEXT"
        assert data["verdict"]["level"] in ("SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert "engines" in data
        assert data["engines"]["static_analysis"] == "COMPLETED"
        assert data["engines"]["yara"] == "NOT_CONFIGURED"
        assert data["engines"]["clamav"] == "NOT_CONFIGURED"
        assert data["engines"]["ml"] == "NOT_CONFIGURED"
        assert isinstance(data["findings"], list)
        assert isinstance(data["capabilities"], list)

        # GET /api/v1/scans/{scan_id}
        fetch_resp = await client.get(f"/api/v1/scans/{scan_id}")
        assert fetch_resp.status_code == 200
        fetch_data = fetch_resp.json()
        assert fetch_data["scan_id"] == scan_id
        assert fetch_data["file"]["sha256"] == data["file"]["sha256"]


@pytest.mark.anyio
async def test_get_scan_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/scans/non-existent-uuid")
        assert resp.status_code == 404
