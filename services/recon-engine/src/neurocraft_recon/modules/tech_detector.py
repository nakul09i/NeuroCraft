"""Passive technology and version indicator detection."""

import re
from typing import Any

from neurocraft_logging import get_logger

logger = get_logger("neurocraft.recon.tech")


def detect_technologies(raw_headers: dict[str, str], sample_html: str) -> list[dict[str, Any]]:
    """Conservatively detect technologies from passive response headers and root HTML markers.

    Returns:
        List of dicts: [{"name": str, "category": str, "confidence": float, "source": str}]
    """
    detected: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add_tech(name: str, category: str, confidence: float, source: str) -> None:
        if name.lower() not in seen:
            seen.add(name.lower())
            detected.append(
                {
                    "name": name,
                    "category": category,
                    "confidence": round(confidence, 2),
                    "source": source,
                }
            )

    server = raw_headers.get("server", "").lower()
    powered_by = raw_headers.get("x-powered-by", "").lower()

    # 1. CDNs & WAFs
    if "cf-ray" in raw_headers or "cloudflare" in server:
        add_tech("Cloudflare Edge / CDN", "CDN / Edge", 0.95, "HTTP Headers (CF-Ray/Server)")
    if "x-amz-cf-id" in raw_headers:
        add_tech("Amazon CloudFront", "CDN", 0.95, "HTTP Header (X-Amz-Cf-Id)")
    if "x-azure-ref" in raw_headers:
        add_tech("Azure Front Door", "CDN", 0.95, "HTTP Header (X-Azure-Ref)")

    # 2. Web Servers
    if "nginx" in server:
        add_tech("Nginx", "Web Server", 0.85, f"Server Header ({server})")
    elif "apache" in server:
        add_tech("Apache HTTP Server", "Web Server", 0.85, f"Server Header ({server})")
    elif "caddy" in server:
        add_tech("Caddy Server", "Web Server", 0.85, f"Server Header ({server})")
    elif "microsoft-iis" in server or "iis" in server:
        add_tech("Microsoft IIS", "Web Server", 0.85, f"Server Header ({server})")
    elif "litespeed" in server:
        add_tech("LiteSpeed Web Server", "Web Server", 0.85, f"Server Header ({server})")

    # 3. Application Runtimes
    if "php" in powered_by:
        add_tech("PHP Runtime", "Application Language", 0.85, f"X-Powered-By ({powered_by})")
    elif "express" in powered_by:
        add_tech("Express.js / Node.js", "Web Framework", 0.85, "X-Powered-By (Express)")
    elif "asp.net" in powered_by:
        add_tech("ASP.NET", "Web Framework", 0.85, f"X-Powered-By ({powered_by})")

    # 4. HTML Meta & Script Fingerprints (Only if HTML was returned)
    if sample_html:
        html_lower = sample_html.lower()

        # WordPress
        if "wp-content" in html_lower or "wp-includes" in html_lower:
            add_tech("WordPress", "CMS", 0.85, "HTML Asset Path (/wp-content/)")

        # Next.js / React
        if "_next/static" in html_lower or "__next_data__" in html_lower or "x-nextjs-matched-path" in raw_hdrs_keys(raw_headers):
            add_tech("Next.js", "JavaScript Framework", 0.85, "HTML Artifact (_next/static)")
        elif "react" in html_lower and ("reactroot" in html_lower or "data-reactid" in html_lower):
            add_tech("React", "Frontend Library", 0.70, "HTML Attribute (data-reactroot)")

        # Vue / Nuxt
        if "__nuxt" in html_lower or "_nuxt/" in html_lower:
            add_tech("Nuxt.js", "JavaScript Framework", 0.80, "HTML Artifact (_nuxt/)")
        elif "v-data" in html_lower or "data-v-" in html_lower:
            add_tech("Vue.js", "Frontend Library", 0.70, "HTML Attribute (data-v-*)")

        # Meta Generator tag
        meta_gen_match = re.search(r'<meta\s+name=["\']generator["\']\s+content=["\']([^"\']+)["\']', sample_html, re.IGNORECASE)
        if meta_gen_match:
            gen_val = meta_gen_match.group(1).strip()
            add_tech(gen_val, "CMS / Generator", 0.90, f"HTML <meta generator> ({gen_val})")

    return detected


def raw_hdrs_keys(raw: dict[str, str]) -> set[str]:
    return set(raw.keys())
