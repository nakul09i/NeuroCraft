"""Unit tests verifying Firebase integration readiness and security rules."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from fastapi import HTTPException
from neurocraft_api.auth import create_access_token, decode_access_token


def test_firestore_rules_security_posture():
    """Verify that firestore.rules enforces strict tenant isolation and denies public access."""
    rules_path = Path("firestore.rules")
    assert rules_path.is_file(), "firestore.rules file must exist"

    content = rules_path.read_text(encoding="utf-8")

    # Strict tenant isolation
    assert "request.auth != null" in content
    assert "request.auth.uid == userId" in content

    # Default deny
    assert "allow read, write: if false;" in content

    # Absolute prohibition of public read/write
    assert "allow read, write: if true;" not in content
    assert "allow read: if true;" not in content
    assert "allow write: if true;" not in content


def test_firebase_json_configuration():
    """Verify that firebase.json specifies firestore rules path."""
    fb_path = Path("firebase.json")
    assert fb_path.is_file(), "firebase.json must exist"

    content = fb_path.read_text(encoding="utf-8")
    assert "firestore.rules" in content


def test_env_example_contains_firebase_variables():
    """Verify that .env.example defines all required VITE_FIREBASE_* variables."""
    env_path = Path(".env.example")
    assert env_path.is_file()

    content = env_path.read_text(encoding="utf-8")
    required_vars = [
        "VITE_FIREBASE_API_KEY",
        "VITE_FIREBASE_AUTH_DOMAIN",
        "VITE_FIREBASE_PROJECT_ID",
        "VITE_FIREBASE_STORAGE_BUCKET",
        "VITE_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_APP_ID",
    ]
    for var in required_vars:
        assert var in content, f"Missing required env var in .env.example: {var}"


def test_decode_access_token_supports_firebase_id_token():
    """Verify decode_access_token correctly maps valid Firebase ID tokens."""
    fake_firebase_uid = "firebase_user_abc123"
    fake_project = "neurocraft-test"
    now = datetime.now(UTC)

    payload = {
        "iss": f"https://securetoken.google.com/{fake_project}",
        "aud": fake_project,
        "sub": fake_firebase_uid,
        "email": "analyst@test.com",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "role": "analyst",
    }
    raw_token = jwt.encode(payload, "untrusted-secret-for-testing", algorithm="HS256")

    user_context = decode_access_token(raw_token)
    assert user_context.user_id == fake_firebase_uid
    assert user_context.email == "analyst@test.com"
    assert user_context.role == "analyst"


def test_decode_access_token_rejects_expired_firebase_token():
    """Verify decode_access_token rejects expired Firebase tokens."""
    fake_project = "neurocraft-test"
    past = datetime.now(UTC) - timedelta(hours=2)

    payload = {
        "iss": f"https://securetoken.google.com/{fake_project}",
        "aud": fake_project,
        "sub": "expired_user",
        "email": "expired@test.com",
        "iat": int((past - timedelta(hours=1)).timestamp()),
        "exp": int(past.timestamp()),
    }
    raw_token = jwt.encode(payload, "secret", algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(raw_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_decode_access_token_preserves_local_jwt():
    """Verify decode_access_token still validates local PBKDF2/PyJWT tokens seamlessly."""
    local_token = create_access_token(user_id="local_user_456", email="local@test.com", role="admin")
    ctx = decode_access_token(local_token)
    assert ctx.user_id == "local_user_456"
    assert ctx.email == "local@test.com"
    assert ctx.role == "admin"
