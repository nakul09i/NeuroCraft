"""Short-lived TTL cache for passive reconnaissance scan results."""

import time
from typing import Any

from neurocraft_logging import get_logger

logger = get_logger("neurocraft.recon.cache")


class ReconCache:
    """In-memory thread-safe short-lived TTL cache for reconnaissance scans."""

    def __init__(self, default_ttl_seconds: int = 600):
        self._cache: dict[str, tuple[float, Any]] = {}
        self._ttl = default_ttl_seconds

    def get(self, key: str) -> Any | None:
        """Retrieve entry if present and not expired."""
        norm_key = key.strip().lower()
        entry = self._cache.get(norm_key)
        if not entry:
            return None

        cached_at, value = entry
        if time.time() - cached_at > self._ttl:
            self._cache.pop(norm_key, None)
            return None

        logger.debug(f"Cache hit for recon target: {norm_key}")
        return value

    def set(self, key: str, value: Any) -> None:
        """Store entry with current timestamp."""
        norm_key = key.strip().lower()
        self._cache[norm_key] = (time.time(), value)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
