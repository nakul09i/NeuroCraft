"""Settings API routes for local preferences and configurations."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_types import UserContext
from pydantic import BaseModel, Field

from neurocraft_api.auth import get_optional_user
from neurocraft_api.repositories.settings_repo import SettingsRepository

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])
settings_repo = SettingsRepository()


class SettingPayload(BaseModel):
    value: Any = Field(..., description="Arbitrary setting value")


@router.get("", summary="List all settings")
async def list_settings(user: UserContext | None = Depends(get_optional_user)) -> dict[str, Any]:
    """Retrieve all local settings."""
    user_id = user.user_id if user else None
    return await settings_repo.list_all(user_id=user_id)


@router.get("/{key}", summary="Get setting by key")
async def get_setting(key: str, user: UserContext | None = Depends(get_optional_user)) -> dict[str, Any]:
    """Retrieve a setting by its unique key."""
    user_id = user.user_id if user else None
    val = await settings_repo.get(key, user_id=user_id)
    if val is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' not found.",
        )
    return {"key": key, "value": val}


@router.put("/{key}", summary="Set or update setting by key")
async def set_setting(
    key: str,
    payload: SettingPayload,
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Save or update a setting."""
    user_id = user.user_id if user else None
    await settings_repo.set(key, payload.value, user_id=user_id)
    return {"key": key, "value": payload.value, "status": "saved"}


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete setting")
async def delete_setting(
    key: str,
    user: UserContext | None = Depends(get_optional_user),
) -> None:
    """Delete a setting by key."""
    user_id = user.user_id if user else None
    deleted = await settings_repo.delete(key, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' not found.",
        )
