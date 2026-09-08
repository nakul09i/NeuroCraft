"""Unit tests for authentication, password hashing, and JWT handling."""

from datetime import timedelta

import pytest
from fastapi import HTTPException
from neurocraft_api.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify() -> None:
    raw_pwd = "P@ssw0rd!Secure2026"
    hashed = hash_password(raw_pwd)

    assert hashed != raw_pwd
    assert hashed.startswith("pbkdf2_sha256$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_password_salt_uniqueness() -> None:
    raw_pwd = "IdenticalPassword"
    hash1 = hash_password(raw_pwd)
    hash2 = hash_password(raw_pwd)

    assert hash1 != hash2
    assert verify_password(raw_pwd, hash1) is True
    assert verify_password(raw_pwd, hash2) is True


def test_jwt_generation_and_decoding() -> None:
    user_id = "usr-test-123456"
    email = "analyst@neurocraft.io"
    role = "security_lead"

    token = create_access_token(user_id=user_id, email=email, role=role)
    assert isinstance(token, str)

    ctx = decode_access_token(token)
    assert ctx.user_id == user_id
    assert ctx.email == email
    assert ctx.role == role


def test_jwt_expired_token_rejected() -> None:
    token = create_access_token(
        user_id="usr-expired",
        email="expired@neurocraft.io",
        expires_delta=timedelta(seconds=-10),  # expired 10 seconds ago
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


def test_jwt_tampered_token_rejected() -> None:
    token = create_access_token(user_id="usr-tamper")
    tampered = token[:-4] + "fake"

    with pytest.raises(HTTPException) as exc:
        decode_access_token(tampered)
    assert exc.value.status_code == 401
