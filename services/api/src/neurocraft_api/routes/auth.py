"""Authentication and user management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_types import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserContext,
    UserProfile,
)

from neurocraft_api.auth import (
    authenticate_user,
    get_current_user,
    register_user,
)
from neurocraft_api.database import get_profile_by_id

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user account",
)
async def signup(req: SignupRequest) -> TokenResponse:
    """Register a new user account and return JWT access token."""
    profile, token = await register_user(
        email=req.email,
        password=req.password,
        display_name=req.display_name,
    )
    return TokenResponse(access_token=token, token_type="bearer", user=profile)  # noqa: S106


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user credentials",
)
async def login(req: LoginRequest) -> TokenResponse:
    """Authenticate with email and password and return JWT access token."""
    profile, token = await authenticate_user(email=req.email, password=req.password)
    return TokenResponse(access_token=token, token_type="bearer", user=profile)  # noqa: S106


@router.get(
    "/me",
    response_model=UserProfile,
    summary="Retrieve current authenticated profile",
)
async def get_current_user_profile(user: UserContext = Depends(get_current_user)) -> UserProfile:
    """Fetch profile of currently authenticated user."""
    rec = await get_profile_by_id(user.user_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    return UserProfile(
        id=rec.id,
        email=rec.email,
        display_name=rec.display_name,
        role=rec.role,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )
