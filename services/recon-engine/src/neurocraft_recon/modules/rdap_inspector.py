"""Passive domain and IP registration data (RDAP) inspector."""

from typing import Any

import httpx
from neurocraft_logging import get_logger

from neurocraft_recon.ssrf import safe_redirect_hook

logger = get_logger("neurocraft.recon.rdap")


async def inspect_rdap(
    target: str, target_type: str = "DOMAIN", timeout_seconds: float = 3.0
) -> dict[str, Any] | None:
    """Passively query official RDAP bootstrap registry for domain/IP metadata."""
    if target_type == "IP_ADDRESS":
        url = f"https://rdap.org/ip/{target}"
    else:
        url = f"https://rdap.org/domain/{target}"

    client_args = {
        "verify": False,  # noqa: S501
        "timeout": timeout_seconds,
        "follow_redirects": True,
        "max_redirects": 2,
        "event_hooks": {"response": [safe_redirect_hook]},
        "headers": {
            "User-Agent": "NeuroCraft-Passive-Scanner/1.0 (+https://neurocraft.security/rdap)",
            "Accept": "application/rdap+json, application/json",
        },
    }

    try:
        async with httpx.AsyncClient(**client_args) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None

            data = resp.json()
            if not isinstance(data, dict):
                return None

            # Extract registrar
            registrar_name = None
            for entity in data.get("entities", []):
                roles = entity.get("roles", [])
                if "registrar" in roles:
                    vcard = entity.get("vcardArray", [])
                    if len(vcard) > 1:
                        for entry in vcard[1]:
                            if len(entry) > 3 and entry[0] == "fn":
                                registrar_name = entry[3]
                                break

            # Extract key dates
            created_date = None
            expires_date = None
            last_changed = None
            for event in data.get("events", []):
                action = event.get("eventAction")
                date_str = event.get("eventDate")
                if action == "registration":
                    created_date = date_str
                elif action == "expiration":
                    expires_date = date_str
                elif action == "last changed":
                    last_changed = date_str

            # Extract nameservers
            nameservers = [
                ns.get("ldhName")
                for ns in data.get("nameservers", [])
                if isinstance(ns, dict) and ns.get("ldhName")
            ]

            status_list = data.get("status", [])

            return {
                "registrar": registrar_name or "Not Available",
                "created_date": created_date,
                "expiration_date": expires_date,
                "last_changed": last_changed,
                "nameservers": nameservers[:10],
                "status": status_list[:5] if isinstance(status_list, list) else [],
            }

    except Exception as err:
        logger.debug(f"RDAP query note for {target}: {err}")
        return None
