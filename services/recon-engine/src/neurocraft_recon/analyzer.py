"""Defensive, passive reconnaissance engine coordinator.

Orchestrates passive digital surface intelligence:
- DNS records (A, AAAA, MX, NS, TXT, CNAME, SPF, DMARC)
- TLS certificate metadata & cipher suites
- HTTP/HTTPS security headers (HSTS, CSP, X-Frame-Options, nosniff)
- Public technology & version indicators
- Robots.txt and sitemap.xml disclosures
- Public RDAP registration metadata

STRICT DEFENSIVE RULE: Zero brute-force, zero exploitation, zero port flooding, zero crawling.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from neurocraft_logging import get_logger
from neurocraft_types import (
    ConfidenceEnum,
    DnsRecord,
    HttpSecurityHeaders,
    ReconAsset,
    ReconFinding,
    ReconScanResponse,
    SeverityEnum,
    TlsCertificateInfo,
    VerdictLevel,
)

from neurocraft_recon.modules import (
    ReconCache,
    detect_technologies,
    inspect_dns,
    inspect_http_headers,
    inspect_rdap,
    inspect_robots_and_sitemap,
    inspect_tls,
)
from neurocraft_recon.ssrf import (
    SSRFSecurityError,
    normalize_target,
    validate_target_safety,
)

logger = get_logger("neurocraft.recon")


class ReconEngine:
    """Defensive, passive digital exposure analyzer."""

    def __init__(
        self,
        timeout_seconds: float = 3.5,
        cache_ttl_seconds: int = 600,
        allow_private: bool = False,
    ):
        self.timeout = timeout_seconds
        self.allow_private = allow_private
        self.cache = ReconCache(default_ttl_seconds=cache_ttl_seconds)

    async def scan_target(
        self,
        target: str,
        user_id: str | None = None,
        authorization_confirmed: bool = True,
        bypass_cache: bool = False,
    ) -> ReconScanResponse:
        """Execute passive reconnaissance on an authorized domain or hostname."""
        if not authorization_confirmed:
            raise ValueError(
                "Explicit authorization confirmation is required before reconnaissance."
            )

        # 1. SSRF Validation and perimeter safety checks
        clean_target, target_type, resolved_ips = validate_target_safety(
            target, allow_private=self.allow_private, timeout_seconds=self.timeout
        )

        # 2. Check Cache
        if not bypass_cache:
            cached_res = self.cache.get(clean_target)
            if cached_res is not None:
                # Return cached report with user_id and cached flag
                cached_res.user_id = user_id
                cached_res.cached = True
                return cached_res

        recon_id = f"recon-{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(UTC)
        limitations: list[str] = []

        logger.info(
            f"Initiating passive reconnaissance for target: {clean_target} (type={target_type})"
        )

        assets: list[ReconAsset] = []
        findings: list[ReconFinding] = []
        dns_records: list[DnsRecord] = []
        tls_info: TlsCertificateInfo | None = None
        security_headers: HttpSecurityHeaders | None = None
        technologies: list[dict[str, Any]] = []
        rdap_info: dict[str, Any] | None = None

        # Add initially resolved IPs as assets if available
        for rip in resolved_ips:
            assets.append(
                ReconAsset(
                    id=f"asset-{uuid.uuid4().hex[:8]}",
                    hostname=rip,
                    asset_type="RESOLVED_IP",
                    source="DNS_PRE_RESOLUTION",
                    status="ACTIVE",
                    observed_at=created_at,
                )
            )

        # 3. Passive DNS Inspection
        try:
            dns_records, dns_assets, dns_findings = inspect_dns(
                clean_target, timeout_seconds=self.timeout
            )
            assets.extend(dns_assets)
            findings.extend(dns_findings)
        except Exception as err:
            logger.warning(f"DNS inspection error for {clean_target}: {err}")
            limitations.append("DNS resolution encountered an error or target is offline.")

        # 4. Passive TLS Certificate Inspection
        try:
            tls_info, tls_assets, tls_findings = inspect_tls(
                clean_target, timeout_seconds=self.timeout
            )
            assets.extend(tls_assets)
            findings.extend(tls_findings)
        except Exception as err:
            logger.warning(f"TLS inspection error for {clean_target}: {err}")
            limitations.append("TLS handshake could not be established on port 443.")

        # 5. Passive HTTP Security Headers & Banner Inspection
        raw_hdrs: dict[str, str] = {}
        sample_html: str = ""
        try:
            security_headers, hdr_findings, raw_hdrs, sample_html = await inspect_http_headers(
                clean_target, timeout_seconds=self.timeout
            )
            findings.extend(hdr_findings)
        except SSRFSecurityError as ssrf_err:
            logger.warning(f"SSRF violation during HTTP inspection: {ssrf_err}")
            raise
        except Exception as err:
            logger.warning(f"HTTP header inspection error for {clean_target}: {err}")
            limitations.append("HTTP/HTTPS web service did not respond to passive requests.")

        # 6. Passive Technology & Banner Detection
        try:
            technologies = detect_technologies(raw_hdrs, sample_html)
        except Exception as err:
            logger.debug(f"Technology detection error for {clean_target}: {err}")

        # 7. Passive Robots.txt and Sitemap Inspection
        try:
            has_robots, has_sitemap, rob_findings, rob_meta = await inspect_robots_and_sitemap(
                clean_target, timeout_seconds=self.timeout
            )
            findings.extend(rob_findings)
        except Exception as err:
            logger.debug(f"Robots inspection error for {clean_target}: {err}")

        # 8. Passive RDAP Lookup
        try:
            rdap_info = await inspect_rdap(
                clean_target, target_type=target_type, timeout_seconds=self.timeout
            )
        except Exception as err:
            logger.debug(f"RDAP lookup error for {clean_target}: {err}")

        # 9. Deduplicate Assets by (hostname, asset_type)
        deduped_assets: list[ReconAsset] = []
        seen_assets: set[tuple[str, str]] = set()
        for a in assets:
            key = (a.hostname.lower(), a.asset_type.upper())
            if key not in seen_assets:
                seen_assets.add(key)
                deduped_assets.append(a)

        # 10. Calculate Deterministic Exposure Score & Separate Confidence
        exposure_score, exposure_level = self._calculate_exposure_score(findings)
        confidence, confidence_score = self._calculate_confidence(
            dns_records=dns_records,
            tls_info=tls_info,
            security_headers=security_headers,
            limitations=limitations,
        )

        status_str = "COMPLETED"
        if not dns_records and not tls_info and not security_headers and not resolved_ips:
            # When nothing could be reached at all, report LIMITED
            if limitations:
                status_str = "COMPLETED"  # Gracefully completed passive scan with limitations

        completed_at = datetime.now(UTC)

        response = ReconScanResponse(
            id=recon_id,
            user_id=user_id,
            target=clean_target,
            target_type=target_type,
            authorization_confirmed=authorization_confirmed,
            status=status_str,
            exposure_score=exposure_score,
            exposure_level=exposure_level,
            confidence=confidence,
            confidence_score=confidence_score,
            dns_records=dns_records,
            tls_info=tls_info,
            security_headers=security_headers,
            assets=deduped_assets,
            findings=findings,
            technologies=technologies,
            rdap_info=rdap_info,
            cached=False,
            limitations=limitations,
            created_at=created_at,
            completed_at=completed_at,
        )

        # Cache successful scan result
        self.cache.set(clean_target, response)
        return response

    def _normalize_target(self, target: str) -> str:
        """Helper to normalize target string."""
        clean, _ = normalize_target(target)
        return clean

    def _calculate_exposure_score(
        self, findings: list[ReconFinding]
    ) -> tuple[float, VerdictLevel]:
        """Calculate transparent, deterministic exposure score (0.0 to 100.0)."""
        score = 0.0

        weights = {
            SeverityEnum.CRITICAL: 35.0,
            SeverityEnum.HIGH: 20.0,
            SeverityEnum.MEDIUM: 12.0,
            SeverityEnum.LOW: 6.0,
            SeverityEnum.INFO: 2.0,
        }

        # Category caps to prevent double-counting
        category_scores: dict[str, float] = {}
        category_caps = {
            "DNS": 25.0,
            "TLS": 35.0,
            "HEADERS": 25.0,
            "EXPOSURE": 15.0,
        }

        for f in findings:
            w = weights.get(f.severity, 0.0)
            cat = f.category.upper()
            category_scores[cat] = category_scores.get(cat, 0.0) + w

        for cat, cat_score in category_scores.items():
            cap = category_caps.get(cat, 50.0)
            score += min(cat_score, cap)

        clamped = round(min(100.0, max(0.0, score)), 1)

        if clamped < 20.0:
            level = VerdictLevel.SAFE
        elif clamped < 40.0:
            level = VerdictLevel.LOW
        elif clamped < 70.0:
            level = VerdictLevel.MEDIUM
        elif clamped < 90.0:
            level = VerdictLevel.HIGH
        else:
            level = VerdictLevel.CRITICAL

        return clamped, level

    def _calculate_confidence(
        self,
        dns_records: list[DnsRecord],
        tls_info: TlsCertificateInfo | None,
        security_headers: HttpSecurityHeaders | None,
        limitations: list[str],
    ) -> tuple[ConfidenceEnum, float]:
        """Compute separate confidence score based on passive evidence completeness."""
        score = 0.50

        if dns_records:
            score += 0.20
        if tls_info is not None:
            score += 0.15
        if security_headers is not None:
            score += 0.15

        # Penalize confidence if significant limitations were encountered
        score -= min(0.40, len(limitations) * 0.15)
        clamped = round(min(1.0, max(0.20, score)), 2)

        if clamped >= 0.80:
            return ConfidenceEnum.HIGH, clamped
        elif clamped >= 0.50:
            return ConfidenceEnum.MEDIUM, clamped
        else:
            return ConfidenceEnum.LOW, clamped
