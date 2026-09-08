"""Integration tests for user data isolation, ownership, and authorization."""

import pytest
from httpx import ASGITransport, AsyncClient
from neurocraft_api.database import init_db
from neurocraft_api.main import app


@pytest.mark.anyio
async def test_multi_user_data_isolation(tmp_path):
    test_db = f"sqlite+aiosqlite:///{tmp_path}/test_isolation.db"
    await init_db(custom_url=test_db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register Alice
        alice_signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "alice@neurocraft.io",
                "password": "PasswordAlice123!",
                "display_name": "Alice Analyst",
            },
        )
        assert alice_signup.status_code == 201
        alice_token = alice_signup.json()["access_token"]
        alice_headers = {"Authorization": f"Bearer {alice_token}"}

        # 2. Register Bob
        bob_signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "bob@neurocraft.io",
                "password": "PasswordBob456!",
                "display_name": "Bob Analyst",
            },
        )
        assert bob_signup.status_code == 201
        bob_token = bob_signup.json()["access_token"]
        bob_headers = {"Authorization": f"Bearer {bob_token}"}

        # 3. Alice uploads and scans a file
        scan_file = {"file": ("alice_doc.txt", b"Confidential Alice content", "text/plain")}
        alice_scan_res = await client.post(
            "/api/v1/scans", files=scan_file, headers=alice_headers
        )
        assert alice_scan_res.status_code == 201
        alice_scan_id = alice_scan_res.json()["scan_id"]

        # 4. Alice can retrieve her own scan
        alice_fetch = await client.get(
            f"/api/v1/scans/{alice_scan_id}", headers=alice_headers
        )
        assert alice_fetch.status_code == 200
        assert alice_fetch.json()["scan_id"] == alice_scan_id

        # 5. Bob attempts to access Alice's scan -> Access restricted (404)
        bob_fetch = await client.get(
            f"/api/v1/scans/{alice_scan_id}", headers=bob_headers
        )
        assert bob_fetch.status_code == 404

        # 6. Unauthenticated request attempts to access Alice's scan -> 404
        anon_fetch = await client.get(f"/api/v1/scans/{alice_scan_id}")
        assert anon_fetch.status_code == 404

        # 7. Alice lists scans -> finds 1
        alice_list = await client.get("/api/v1/scans", headers=alice_headers)
        assert alice_list.status_code == 200
        assert len(alice_list.json()) == 1
        assert alice_list.json()[0]["scan_id"] == alice_scan_id

        # 8. Bob lists scans -> finds 0
        bob_list = await client.get("/api/v1/scans", headers=bob_headers)
        assert bob_list.status_code == 200
        assert len(bob_list.json()) == 0

        # 9. Alice runs a Quantum Simulation
        sim_res = await client.post(
            "/api/v1/quantum/simulate",
            json={"scenario": "FORGERY", "shots": 500, "qubits": 2},
            headers=alice_headers,
        )
        assert sim_res.status_code == 201
        sim_id = sim_res.json()["id"]

        # 10. Alice can view simulation; Bob is blocked
        alice_sim_fetch = await client.get(
            f"/api/v1/quantum/simulations/{sim_id}", headers=alice_headers
        )
        assert alice_sim_fetch.status_code == 200

        bob_sim_fetch = await client.get(
            f"/api/v1/quantum/simulations/{sim_id}", headers=bob_headers
        )
        assert bob_sim_fetch.status_code == 404
