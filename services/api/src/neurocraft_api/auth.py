"""Authentication and authorization services for NeuroCraft.

Supports Supabase Auth JWT verification with a seamless local cryptographic
development fallback (PBKDF2-HMAC-SHA256 + PyJWT) for offline/student development.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from neurocraft_config import get_config
from neurocraft_logging import get_logger
from neurocraft_types import UserContext, UserProfile

from neurocraft_api.database import get_profile_by_email, save_profile

logger = get_logger("neurocraft.auth")
config = get_config()
security_bearer = HTTPBearer(auto_error=False)

TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


# ==============================================================================
# Password Hashing (Standard PBKDF2-HMAC-SHA256)
# ==============================================================================


def hash_password(password: str) -> str:
    """Hash password using salted PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against stored PBKDF2-HMAC-SHA256 hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_key = parts[3]
        actual_key = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations
        ).hex()
        return secrets.compare_digest(expected_key, actual_key)
    except Exception as err:
        logger.error(f"Password verification error: {err}")
        return False


# ==============================================================================
# JWT Generation and Validation
# ==============================================================================


def create_access_token(
    user_id: str,
    email: str | None = None,
    role: str = "user",
    expires_delta: timedelta | None = None,
) -> str:
    """Generate signed JWT access token for user identity."""
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES))
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email or "",
        "role": role,
        "exp": int(expire.timestamp()),
        "iat": int(datetime.now(UTC).timestamp()),
        "iss": "neurocraft-auth",
    }
    secret = config.supabase_jwt_secret or "neurocraft-default-local-jwt-secret-for-dev-only"
    return jwt.encode(payload, secret, algorithm=config.jwt_algorithm)


def decode_access_token(token: str) -> UserContext:
    """Decode and validate a JWT access token."""
    secret = config.supabase_jwt_secret or "neurocraft-default-local-jwt-secret-for-dev-only"
    try:
        # Verify signature and expiration
        payload = jwt.decode(
            token,
            secret,
            algorithms=[config.jwt_algorithm],
            options={"verify_exp": True, "verify_signature": True},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject identifier.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return UserContext(
            user_id=str(user_id),
            email=payload.get("email") or None,
            role=payload.get("role", "user"),
        )
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except (jwt.InvalidTokenError, Exception) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err


# ==============================================================================
# FastAPI Dependencies
# ==============================================================================


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> UserContext:
    """Enforce authentication. Requires a valid Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> UserContext | None:
    """Optional authentication. Returns UserContext if token present and valid; else None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return decode_access_token(credentials.credentials)
    except HTTPException:
        return None


# ==============================================================================
# User Account Registration & Login Helpers
# ==============================================================================


async def register_user(
    email: str,
    password: str,
    display_name: str | None = None,
    role: str = "user",
) -> tuple[UserProfile, str]:
    """Register a new user account with secure password hashing and return profile + token."""
    clean_email = email.lower().strip()
    existing = await get_profile_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user_id = secrets.token_hex(16)
    pwd_hash = hash_password(password)
    disp_name = display_name.strip() if display_name else clean_email.split("@")[0]

    profile = UserProfile(
        id=user_id,
        email=clean_email,
        display_name=disp_name,
        role=role,
    )
    await save_profile(profile, password_hash=pwd_hash)
    token = create_access_token(user_id=user_id, email=clean_email, role=role)
    return profile, token


async def authenticate_user(email: str, password: str) -> tuple[UserProfile, str]:
    """Authenticate user with email/password and return profile + JWT."""
    clean_email = email.lower().strip()
    profile_record = await get_profile_by_email(clean_email)
    if not profile_record or not profile_record.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, profile_record.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    profile = UserProfile(
        id=profile_record.id,
        email=profile_record.email,
        display_name=profile_record.display_name,
        role=profile_record.role,
        created_at=profile_record.created_at,
        updated_at=profile_record.updated_at,
    )
    token = create_access_token(user_id=profile.id, email=profile.email, role=profile.role)
    return profile, token
