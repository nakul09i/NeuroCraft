"""Passive robots.txt and sitemap.xml structure inspector."""

import re
from datetime import UTC, datetime
from typing import Any

import httpx
from neurocraft_logging import get_logger
from neurocraft_types import (
    ConfidenceEnum,
    ReconFinding,
    SeverityEnum,
)

from neurocraft_recon.ssrf import safe_redirect_hook

logger = get_logger("neurocraft.recon.robots")

MAX_ROBOTS_BYTES = 128 * 1024  # 128 KB
SENSITIVE_PATH_PATTERNS = [
    re.compile(r"/(?:admin|wp-admin|backend|dashboard|internal|manage)", re.IGNORECASE),
    re.compile(r"/(?:backup|backups|dump|export|db)", re.IGNORECASE),
    re.compile(r"/(?:private|secret|conf|config|env)", re.IGNORECASE),
    re.compile(r"\.(?:sql|bak|tar|gz|zip|log)$", re.IGNORECASE),
]


async def inspect_robots_and_sitemap(
    target: str, timeout_seconds: float = 3.0
) -> tuple[bool, bool, list[ReconFinding], dict[str, Any]]:
    """Safely fetch and inspect robots.txt and sitemap without recursive crawling.

    Returns:
        (has_robots, has_sitemap, findings, metadata)
    """
    findings: list[ReconFinding] = []
    metadata: dict[str, Any] = {
        "disallow_count": 0,
        "sitemap_urls": [],
        "disclosed_sensitive_paths": [],
    }
    now = datetime.now(UTC)
    has_robots = False
    has_sitemap = False

    client_args = {
        "verify": False,  # noqa: S501
        "timeout": timeout_seconds,
        "follow_redirects": True,
        "max_redirects": 3,
        "event_hooks": {"response": [safe_redirect_hook]},
        "headers": {"User-Agent": "NeuroCraft-Passive-Scanner/1.0"},
    }

    # 1. Fetch robots.txt
    robots_url = f"https://{target}/robots.txt"
    try:
        async with httpx.AsyncClient(**client_args) as client:
            resp = await client.get(robots_url)
            if resp.status_code == 200 and "text" in resp.headers.get("content-type", "text"):
                has_robots = True
                content = resp.text[:MAX_ROBOTS_BYTES]
                disallow_paths: list[str] = []
                sitemaps: list[str] = []

                for line in content.splitlines():
                    clean = line.strip()
                    if clean.lower().startswith("disallow:"):
                        path = clean[len("disallow:") :].strip()
                        if path and path != "/":
                            disallow_paths.append(path)
                    elif clean.lower().startswith("sitemap:"):
                        smap = clean[len("sitemap:") :].strip()
                        if smap:
                            sitemaps.append(smap)

                metadata["disallow_count"] = len(disallow_paths)
                metadata["sitemap_urls"] = sitemaps[:10]

                # Check for sensitive path disclosure
                sensitive_disclosed: list[str] = []
                for p in disallow_paths:
                    for pat in SENSITIVE_PATH_PATTERNS:
                        if pat.search(p):
                            sensitive_disclosed.append(p)
                            break

                if sensitive_disclosed:
                    metadata["disclosed_sensitive_paths"] = sensitive_disclosed[:15]
                    findings.append(
                        ReconFinding(
                            id="RECON-ROB-001",
                            category="EXPOSURE",
                            title="Sensitive Path Disclosure in robots.txt",
                            severity=SeverityEnum.INFO,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={
                                "disclosed_paths": sensitive_disclosed[:5],
                                "total_sensitive_paths": len(sensitive_disclosed),
                            },
                            recommendation="Ensure administrative and sensitive endpoints require authentication and do not rely on robots.txt for security.",
                            source="ROBOTS",
                            observed_at=now,
                        )
                    )
    except Exception as err:
        logger.debug(f"Robots.txt check note for {target}: {err}")

    # 2. Check sitemap.xml
    sitemap_url = f"https://{target}/sitemap.xml"
    try:
        async with httpx.AsyncClient(**client_args) as client:
            s_resp = await client.head(sitemap_url)
            if s_resp.status_code == 200:
                has_sitemap = True
            elif s_resp.status_code in (404, 403, 405):
                has_sitemap = False
    except Exception:
        pass

    return has_robots, has_sitemap, findings, metadata
