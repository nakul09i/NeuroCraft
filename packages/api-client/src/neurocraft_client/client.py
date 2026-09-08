"""Python client SDK for NeuroCraft API."""

from pathlib import Path

from neurocraft_types import ScanResult


class NeuroCraftClient:
    """Client for NeuroCraft API gateway."""

    def __init__(self, base_url: str = "http://127.0.0.1:8000", api_key: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def scan_file(self, file_path: Path) -> str:
        """Submit a file for analysis and return the assigned task_id."""
        raise NotImplementedError(
            "API client will be implemented in Phase 5 alongside API gateway."
        )

    async def get_scan_result(self, scan_id: str) -> ScanResult:
        """Fetch analysis results by scan_id."""
        raise NotImplementedError(
            "API client will be implemented in Phase 5 alongside API gateway."
        )
