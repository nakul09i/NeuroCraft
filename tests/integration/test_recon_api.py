"""Integration tests for the Passive Reconnaissance Engine API, SSRF guard, and User Isolation."""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app
from neurocraft_types import DnsRecord, ReconAsset, ReconFinding, SeverityEnum


@pytest.mark.anyio
async def test_recon_authorization_mandate(tmp_path):
    """Verify that reconnaissance rejects requests where authorization is not explicitly confirmed."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_recon_auth.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Missing or False authorization confirmation
        res = await client.post(
            "/api/v1/recon",
            json={"target": "example.com", "authorization_confirmed": False},
        )
        assert res.status_code == 400
        assert "authorization confirmation is required" in res.json()["detail"].lower()


@pytest.mark.anyio
async def test_recon_ssrf_prevention(tmp_path):
    """Verify API rejects localhost, private RFC 1918, and cloud metadata targets."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_recon_ssrf.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        prohibited_targets = [
            "localhost",
            "127.0.0.1",
            "169.254.169.254",
            "metadata.google.internal",
            "192.168.1.1",
            "10.0.0.1",
            "172.16.0.1",
        ]

        for tgt in prohibited_targets:
            res = await client.post(
                "/api/v1/recon",
                json={"target": tgt, "authorization_confirmed": True},
            )
            assert res.status_code == 400
            detail = res.json()["detail"].lower()
            assert "ssrf" in detail or "restricted" in detail or "local" in detail or "reserved" in detail


@pytest.mark.anyio
async def test_recon_user_isolation_and_persistence(tmp_path):
    """Verify multi-user isolation for reconnaissance scans and observations."""
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_recon_isolation.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register Alice
        alice_signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "alice_recon@neurocraft.io",
                "password": "PasswordAlice123!",
                "display_name": "Alice Recon",
            },
        )
        assert alice_signup.status_code == 201
        alice_token = alice_signup.json()["access_token"]
        alice_headers = {"Authorization": f"Bearer {alice_token}"}

        # 2. Register Bob
        bob_signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "bob_recon@neurocraft.io",
                "password": "PasswordBob456!",
                "display_name": "Bob Recon",
            },
        )
        assert bob_signup.status_code == 201
        bob_token = bob_signup.json()["access_token"]
        bob_headers = {"Authorization": f"Bearer {bob_token}"}

        # Mock external network functions for safe, fast, offline integration testing
        with patch("neurocraft_recon.analyzer.validate_target_safety", return_value=("alice-target.com", "DOMAIN", ["93.184.216.34"])):
            with patch("neurocraft_recon.analyzer.inspect_dns") as mock_dns:
                mock_dns.return_value = (
                    [DnsRecord(record_type="A", value="93.184.216.34", ttl=300)],
                    [ReconAsset(id="ast-1", hostname="alice-target.com", asset_type="DOMAIN", source="DNS")],
                    [],
                )
                with patch("neurocraft_recon.analyzer.inspect_tls", return_value=(None, [], [])):
                    with patch("neurocraft_recon.analyzer.inspect_http_headers", return_value=(None, [], {}, "")):
                        with patch("neurocraft_recon.analyzer.inspect_robots_and_sitemap", return_value=(False, False, [], {})):
                            with patch("neurocraft_recon.analyzer.inspect_rdap", return_value={"registrar": "SafeCorp"}):
                                alice_res = await client.post(
                                    "/api/v1/recon",
                                    json={"target": "alice-target.com", "authorization_confirmed": True},
                                    headers=alice_headers,
                                )
                                assert alice_res.status_code == 201
                                alice_recon_id = alice_res.json()["id"]

        with patch("neurocraft_recon.analyzer.validate_target_safety", return_value=("bob-target.com", "DOMAIN", ["93.184.216.35"])):
            with patch("neurocraft_recon.analyzer.inspect_dns") as mock_dns:
                mock_dns.return_value = (
                    [DnsRecord(record_type="A", value="93.184.216.35", ttl=300)],
                    [ReconAsset(id="ast-2", hostname="bob-target.com", asset_type="DOMAIN", source="DNS")],
                    [],
                )
                with patch("neurocraft_recon.analyzer.inspect_tls", return_value=(None, [], [])):
                    with patch("neurocraft_recon.analyzer.inspect_http_headers", return_value=(None, [], {}, "")):
                        with patch("neurocraft_recon.analyzer.inspect_robots_and_sitemap", return_value=(False, False, [], {})):
                            with patch("neurocraft_recon.analyzer.inspect_rdap", return_value={"registrar": "BobCorp"}):
                                bob_res = await client.post(
                                    "/api/v1/recon",
                                    json={"target": "bob-target.com", "authorization_confirmed": True},
                                    headers=bob_headers,
                                )
                                assert bob_res.status_code == 201
                                bob_recon_id = bob_res.json()["id"]

        # 3. Alice can retrieve her own recon scan
        a_get = await client.get(f"/api/v1/recon/{alice_recon_id}", headers=alice_headers)
        assert a_get.status_code == 200
        assert a_get.json()["target"] == "alice-target.com"
        assert a_get.json()["status"] == "COMPLETED"

        # 4. User Isolation Check: Alice CANNOT retrieve Bob's recon scan
        cross_get = await client.get(f"/api/v1/recon/{bob_recon_id}", headers=alice_headers)
        assert cross_get.status_code == 404

        # 5. User Isolation Check: Bob CANNOT retrieve Alice's recon scan
        cross_get_bob = await client.get(f"/api/v1/recon/{alice_recon_id}", headers=bob_headers)
        assert cross_get_bob.status_code == 404

        # 6. Unauthenticated user CANNOT retrieve Alice's recon scan
        unauth_get = await client.get(f"/api/v1/recon/{alice_recon_id}")
        assert unauth_get.status_code == 404

        # 7. Alice CANNOT delete Bob's recon scan
        cross_del = await client.delete(f"/api/v1/recon/{bob_recon_id}", headers=alice_headers)
        assert cross_del.status_code == 404

        # 8. Observations endpoint returns structured findings & assets
        obs_get = await client.get(f"/api/v1/recon/{alice_recon_id}/observations", headers=alice_headers)
        assert obs_get.status_code == 200
        obs_data = obs_get.json()
        assert "observations" in obs_data
        assert "assets" in obs_data
        assert obs_data["recon_id"] == alice_recon_id


def test_recon_scoring_determinism():
    """Verify exposure scoring is 100% deterministic given identical findings."""
    from neurocraft_recon.analyzer import ReconEngine

    engine = ReconEngine()
    findings = [
        ReconFinding(
            id="FIND-1",
            category="DNS",
            title="Missing SPF Record",
            severity=SeverityEnum.MEDIUM,
            confidence="HIGH",
            recommendation="Add SPF",
        ),
        ReconFinding(
            id="FIND-2",
            category="HEADERS",
            title="Missing HSTS",
            severity=SeverityEnum.MEDIUM,
            confidence="HIGH",
            recommendation="Add HSTS",
        ),
    ]

    score1, level1 = engine._calculate_exposure_score(findings)
    score2, level2 = engine._calculate_exposure_score(findings)

    assert score1 == score2
    assert level1 == level2
    assert 0.0 <= score1 <= 100.0
