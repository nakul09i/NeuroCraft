"""Repository layer for local configuration settings and user preferences."""

from typing import Any

from neurocraft_api.database import (
    SettingRecord,
    delete_setting,
    get_session_factory,
    get_setting,
    list_settings,
    save_setting,
)


class SettingsRepository:
    """Encapsulates local setting retrieval and persistence."""

    def __init__(self, session_factory=None):
        self._session_factory = session_factory or get_session_factory()

    async def get(self, key: str, user_id: str | None = None) -> Any | None:
        return await get_setting(key, user_id=user_id)

    async def set(self, key: str, value: Any, user_id: str | None = None) -> SettingRecord:
        return await save_setting(key, value, user_id=user_id)

    async def list_all(self, user_id: str | None = None) -> dict[str, Any]:
        return await list_settings(user_id=user_id)

    async def delete(self, key: str, user_id: str | None = None) -> bool:
        return await delete_setting(key, user_id=user_id)
