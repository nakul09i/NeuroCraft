"""Passive HTTP defense-in-depth security headers inspector."""

from datetime import UTC, datetime

import httpx
from neurocraft_logging import get_logger
from neurocraft_types import (
    ConfidenceEnum,
    HttpSecurityHeaders,
    ReconFinding,
    SeverityEnum,
)

from neurocraft_recon.ssrf import safe_redirect_hook

logger = get_logger("neurocraft.recon.headers")

MAX_BODY_BYTES = 64 * 1024  # 64 KB for passive banner/HTML inspection


async def inspect_http_headers(
    target: str, timeout_seconds: float = 3.5
) -> tuple[HttpSecurityHeaders | None, list[ReconFinding], dict[str, str], str]:
    """Passively analyze HTTP/HTTPS defense headers on root path.

    Returns:
        (security_headers, findings, raw_headers, sample_html_body)
    """
    findings: list[ReconFinding] = []
    raw_hdrs: dict[str, str] = {}
    sample_html = ""
    now = datetime.now(UTC)

    client_args = {
        "verify": False,  # noqa: S501
        "timeout": timeout_seconds,
        "follow_redirects": True,
        "max_redirects": 3,
        "event_hooks": {"response": [safe_redirect_hook]},
        "headers": {
            "User-Agent": "NeuroCraft-Passive-Scanner/1.0 (+https://neurocraft.security/bot)",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
    }

    resp = None
    urls_to_try = [f"https://{target}", f"http://{target}"]

    for url in urls_to_try:
        try:
            async with httpx.AsyncClient(**client_args) as client:
                resp = await client.get(url)
                if resp.status_code < 500:
                    break
        except Exception as exc:
            logger.debug(f"HTTP request note for {url}: {exc}")
            continue

    if resp is None:
        return None, findings, raw_hdrs, sample_html

    try:
        raw_hdrs = {k.lower(): str(v) for k, v in resp.headers.items()}
        sample_html = resp.text[:MAX_BODY_BYTES] if resp.text else ""

        has_hsts = "strict-transport-security" in raw_hdrs
        has_csp = "content-security-policy" in raw_hdrs
        x_frame = raw_hdrs.get("x-frame-options")
        has_nosniff = raw_hdrs.get("x-content-type-options", "").lower() == "nosniff"
        referrer = raw_hdrs.get("referrer-policy")
        server_banner = raw_hdrs.get("server")
        powered_by = raw_hdrs.get("x-powered-by")

        # Missing HSTS (Only relevant if endpoint is HTTPS)
        if not has_hsts and resp.url.scheme == "https":
            findings.append(
                ReconFinding(
                    id="RECON-HDR-001",
                    category="HEADERS",
                    title="Missing HTTP Strict Transport Security (HSTS)",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"header": "Strict-Transport-Security", "scheme": "https"},
                    recommendation="Add Strict-Transport-Security header with max-age >= 31536000 and includeSubDomains.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # Missing CSP
        if not has_csp:
            findings.append(
                ReconFinding(
                    id="RECON-HDR-002",
                    category="HEADERS",
                    title="Missing Content Security Policy (CSP)",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"header": "Content-Security-Policy"},
                    recommendation="Configure a Content-Security-Policy header to restrict resource loading and mitigate XSS.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # Missing X-Frame-Options
        if not x_frame and "frame-ancestors" not in raw_hdrs.get("content-security-policy", "").lower():
            findings.append(
                ReconFinding(
                    id="RECON-HDR-003",
                    category="HEADERS",
                    title="Missing X-Frame-Options (Clickjacking Exposure)",
                    severity=SeverityEnum.LOW,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"header": "X-Frame-Options"},
                    recommendation="Set X-Frame-Options to DENY or SAMEORIGIN to prevent framing and UI redressing.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # Missing X-Content-Type-Options
        if not has_nosniff:
            findings.append(
                ReconFinding(
                    id="RECON-HDR-004",
                    category="HEADERS",
                    title="Missing X-Content-Type-Options Header",
                    severity=SeverityEnum.LOW,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"header": "X-Content-Type-Options"},
                    recommendation="Set X-Content-Type-Options: nosniff to prevent MIME confusion and sniffing attacks.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # Server Banner
        if server_banner:
            findings.append(
                ReconFinding(
                    id="RECON-HDR-005",
                    category="EXPOSURE",
                    title="Server Banner Disclosure",
                    severity=SeverityEnum.INFO,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"server": server_banner},
                    recommendation="Minimize detailed web server software and version disclosure in HTTP headers.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # X-Powered-By
        if powered_by:
            findings.append(
                ReconFinding(
                    id="RECON-HDR-006",
                    category="EXPOSURE",
                    title="Backend Technology Disclosure (X-Powered-By)",
                    severity=SeverityEnum.LOW,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"x_powered_by": powered_by},
                    recommendation="Suppress the X-Powered-By response header in production server configuration.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        # Missing Referrer-Policy
        if not referrer:
            findings.append(
                ReconFinding(
                    id="RECON-HDR-007",
                    category="HEADERS",
                    title="Missing Referrer-Policy Header",
                    severity=SeverityEnum.LOW,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"header": "Referrer-Policy"},
                    recommendation="Set Referrer-Policy: strict-origin-when-cross-origin to control referrer leakage.",
                    source="HEADERS",
                    observed_at=now,
                )
            )

        sec_hdrs = HttpSecurityHeaders(
            hsts=has_hsts,
            csp=has_csp,
            x_frame_options=x_frame,
            x_content_type_options=has_nosniff,
            referrer_policy=referrer,
            raw_headers=raw_hdrs,
        )

        return sec_hdrs, findings, raw_hdrs, sample_html

    except Exception as exc:
        logger.debug(f"HTTP header evaluation note for {target}: {exc}")
        return None, findings, raw_hdrs, sample_html
