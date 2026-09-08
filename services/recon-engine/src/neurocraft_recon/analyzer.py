"""Defensive, passive reconnaissance engine.

Analyzes public digital exposure of an authorized domain/target:
- DNS records (A, AAAA, MX, NS, TXT, SPF, DMARC)
- TLS certificate metadata (issuer, subject, SAN, cipher suite, expiry)
- HTTP/HTTPS security headers (HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy)
- Public technology & version banner disclosure

STRICT DEFENSIVE RULE: Zero brute-force, zero exploitation, zero intrusive scanning.
"""

import socket
import ssl
import uuid
from datetime import UTC, datetime
from urllib.parse import urlparse

import dns.resolver
import httpx
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

logger = get_logger("neurocraft.recon")


class ReconEngine:
    """Defensive, passive digital exposure analyzer."""

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout = timeout_seconds

    async def scan_target(self, target: str, user_id: str | None = None) -> ReconScanResponse:
        """Execute passive reconnaissance on an authorized domain or hostname."""
        clean_target = self._normalize_target(target)
        recon_id = f"recon-{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(UTC)

        logger.info(f"Initiating passive reconnaissance for target: {clean_target}")

        dns_records: list[DnsRecord] = []
        tls_info: TlsCertificateInfo | None = None
        security_headers: HttpSecurityHeaders | None = None
        assets: list[ReconAsset] = []
        findings: list[ReconFinding] = []

        # 1. Passive DNS Inspection
        dns_records, dns_assets, dns_findings = self._inspect_dns(clean_target)
        assets.extend(dns_assets)
        findings.extend(dns_findings)

        # 2. Passive TLS Certificate Inspection
        tls_info, tls_assets, tls_findings = self._inspect_tls(clean_target)
        assets.extend(tls_assets)
        findings.extend(tls_findings)

        # 3. Passive HTTP Security Headers & Banner Inspection
        security_headers, header_findings = await self._inspect_http_headers(clean_target)
        findings.extend(header_findings)

        # 4. Calculate Deterministic Exposure Score (0.0 to 100.0)
        exposure_score, exposure_level = self._calculate_exposure_score(findings)

        completed_at = datetime.now(UTC)

        return ReconScanResponse(
            id=recon_id,
            user_id=user_id,
            target=clean_target,
            status="COMPLETED",
            exposure_score=exposure_score,
            exposure_level=exposure_level,
            dns_records=dns_records,
            tls_info=tls_info,
            security_headers=security_headers,
            assets=assets,
            findings=findings,
            created_at=created_at,
            completed_at=completed_at,
        )

    def _normalize_target(self, target: str) -> str:
        """Strip protocols and paths to extract pure domain/hostname."""
        t = target.strip().lower()
        if t.startswith("http://") or t.startswith("https://"):
            parsed = urlparse(t)
            t = parsed.netloc or parsed.path
        if ":" in t:
            t = t.split(":")[0]
        return t.strip("/")

    def _inspect_dns(
        self, target: str
    ) -> tuple[list[DnsRecord], list[ReconAsset], list[ReconFinding]]:
        """Passive DNS inspection for public records."""
        records: list[DnsRecord] = []
        assets: list[ReconAsset] = []
        findings: list[ReconFinding] = []

        resolver = dns.resolver.Resolver()
        resolver.timeout = self.timeout
        resolver.lifetime = self.timeout

        # Root Domain Asset
        assets.append(
            ReconAsset(
                id=f"asset-{uuid.uuid4().hex[:8]}",
                hostname=target,
                asset_type="DOMAIN",
                source="DNS",
                status="ACTIVE",
                metadata={"domain": target},
            )
        )

        has_spf = False
        has_dmarc = False

        record_types = ["A", "AAAA", "MX", "NS", "TXT"]
        for rtype in record_types:
            try:
                answers = resolver.resolve(target, rtype)
                for ans in answers:
                    val = ans.to_text().strip('"')
                    records.append(DnsRecord(record_type=rtype, value=val, ttl=answers.ttl))

                    # Track infrastructure assets
                    if rtype == "A" or rtype == "AAAA":
                        assets.append(
                            ReconAsset(
                                id=f"asset-{uuid.uuid4().hex[:8]}",
                                hostname=val,
                                asset_type="IP_ADDRESS",
                                source="DNS_A",
                                status="ACTIVE",
                            )
                        )
                    elif rtype == "MX":
                        mail_host = val.split()[-1].rstrip(".")
                        assets.append(
                            ReconAsset(
                                id=f"asset-{uuid.uuid4().hex[:8]}",
                                hostname=mail_host,
                                asset_type="MAIL_SERVER",
                                source="DNS_MX",
                                status="ACTIVE",
                            )
                        )
                    elif rtype == "NS":
                        ns_host = val.rstrip(".")
                        assets.append(
                            ReconAsset(
                                id=f"asset-{uuid.uuid4().hex[:8]}",
                                hostname=ns_host,
                                asset_type="NAME_SERVER",
                                source="DNS_NS",
                                status="ACTIVE",
                            )
                        )
                    elif rtype == "TXT" and "v=spf1" in val.lower():
                        has_spf = True
            except Exception as err:
                logger.debug(f"DNS {rtype} query note for {target}: {err}")

        # Check DMARC
        try:
            dmarc_answers = resolver.resolve(f"_dmarc.{target}", "TXT")
            for ans in dmarc_answers:
                if "v=dmarc1" in ans.to_text().lower():
                    has_dmarc = True
                    records.append(DnsRecord(record_type="DMARC", value=ans.to_text().strip('"')))
        except Exception:
            pass

        # Findings for email spoofing controls
        if not has_spf:
            findings.append(
                ReconFinding(
                    id="RECON-DNS-001",
                    category="DNS",
                    title="Missing SPF Record",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"domain": target, "has_spf": False},
                    recommendation="Publish a valid SPF (v=spf1) TXT record to prevent domain email spoofing.",
                )
            )

        if not has_dmarc:
            findings.append(
                ReconFinding(
                    id="RECON-DNS-002",
                    category="DNS",
                    title="Missing DMARC Policy Record",
                    severity=SeverityEnum.MEDIUM,
                    confidence=ConfidenceEnum.HIGH,
                    evidence={"domain": target, "has_dmarc": False},
                    recommendation="Configure a DMARC policy at _dmarc.<domain> to reject unauthorized senders.",
                )
            )

        return records, assets, findings

    def _inspect_tls(
        self, target: str
    ) -> tuple[TlsCertificateInfo | None, list[ReconAsset], list[ReconFinding]]:
        """Passive TLS certificate inspection via socket handshake."""
        assets: list[ReconAsset] = []
        findings: list[ReconFinding] = []

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            with socket.create_connection((target, 443), timeout=self.timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=target) as ssock:
                    cert_bin = ssock.getpeercert(binary_form=True)
                    tls_version = ssock.version()
                    cipher_tuple = ssock.cipher()
                    cipher_suite = cipher_tuple[0] if cipher_tuple else "Unknown"

                    if not cert_bin:
                        return None, assets, findings


                    # Parse dict format
                    cert_dict = ssock.getpeercert()

                    subject_str = ""
                    issuer_str = ""
                    sans: list[str] = []
                    valid_from = None
                    valid_to = None

                    if cert_dict:
                        subject_dict = dict(x[0] for x in cert_dict.get("subject", ()))
                        issuer_dict = dict(x[0] for x in cert_dict.get("issuer", ()))
                        subject_str = subject_dict.get("commonName", str(subject_dict))
                        issuer_str = issuer_dict.get("commonName", str(issuer_dict))
                        valid_from = cert_dict.get("notBefore")
                        valid_to = cert_dict.get("notAfter")
                        for san_type, san_val in cert_dict.get("subjectAltName", ()):
                            if san_type == "DNS":
                                sans.append(san_val)
                                assets.append(
                                    ReconAsset(
                                        id=f"asset-{uuid.uuid4().hex[:8]}",
                                        hostname=san_val,
                                        asset_type="SAN_SUBDOMAIN",
                                        source="TLS_CERT",
                                        status="ACTIVE",
                                    )
                                )

                    # Check for outdated TLS version
                    if tls_version in ("TLSv1", "TLSv1.1"):
                        findings.append(
                            ReconFinding(
                                id="RECON-TLS-001",
                                category="TLS",
                                title="Outdated TLS Protocol Version",
                                severity=SeverityEnum.HIGH,
                                confidence=ConfidenceEnum.HIGH,
                                evidence={"tls_version": tls_version},
                                recommendation="Disable TLS 1.0 and TLS 1.1; enforce TLS 1.2 or TLS 1.3.",
                            )
                        )

                    return (
                        TlsCertificateInfo(
                            subject=subject_str,
                            issuer=issuer_str,
                            san=sans,
                            valid_from=valid_from,
                            valid_to=valid_to,
                            cipher_suite=cipher_suite,
                            tls_version=tls_version,
                            is_expired=False,
                        ),
                        assets,
                        findings,
                    )
        except Exception as err:
            logger.debug(f"TLS inspection note for {target}: {err}")
            return None, assets, findings

    async def _inspect_http_headers(
        self, target: str
    ) -> tuple[HttpSecurityHeaders | None, list[ReconFinding]]:
        """Passive analysis of HTTP/HTTPS defense-in-depth security headers."""
        findings: list[ReconFinding] = []
        url = f"https://{target}"

        try:
            async with httpx.AsyncClient(verify=False, timeout=self.timeout) as client:  # noqa: S501
                resp = await client.get(url, follow_redirects=True)
                raw_hdrs = {k.lower(): v for k, v in resp.headers.items()}

                has_hsts = "strict-transport-security" in raw_hdrs
                has_csp = "content-security-policy" in raw_hdrs
                x_frame = raw_hdrs.get("x-frame-options")
                has_nosniff = raw_hdrs.get("x-content-type-options", "").lower() == "nosniff"
                referrer = raw_hdrs.get("referrer-policy")
                server_banner = raw_hdrs.get("server")
                powered_by = raw_hdrs.get("x-powered-by")

                if not has_hsts:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-001",
                            category="HEADERS",
                            title="Missing HTTP Strict Transport Security (HSTS)",
                            severity=SeverityEnum.MEDIUM,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"header": "Strict-Transport-Security"},
                            recommendation="Add Strict-Transport-Security header with max-age >= 31536000 and includeSubDomains.",
                        )
                    )

                if not has_csp:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-002",
                            category="HEADERS",
                            title="Missing Content Security Policy (CSP)",
                            severity=SeverityEnum.MEDIUM,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"header": "Content-Security-Policy"},
                            recommendation="Configure a robust Content-Security-Policy header to mitigate Cross-Site Scripting (XSS).",
                        )
                    )

                if not x_frame:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-003",
                            category="HEADERS",
                            title="Missing X-Frame-Options (Clickjacking Exposure)",
                            severity=SeverityEnum.LOW,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"header": "X-Frame-Options"},
                            recommendation="Set X-Frame-Options to DENY or SAMEORIGIN to prevent framing and UI redressing.",
                        )
                    )

                if not has_nosniff:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-004",
                            category="HEADERS",
                            title="Missing X-Content-Type-Options Header",
                            severity=SeverityEnum.LOW,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"header": "X-Content-Type-Options"},
                            recommendation="Set X-Content-Type-Options: nosniff to prevent MIME type sniffing.",
                        )
                    )

                if server_banner:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-005",
                            category="EXPOSURE",
                            title="Server Banner Version Disclosure",
                            severity=SeverityEnum.INFO,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"server_header": server_banner},
                            recommendation="Suppress detailed web server version strings in production responses.",
                        )
                    )

                if powered_by:
                    findings.append(
                        ReconFinding(
                            id="RECON-HDR-006",
                            category="EXPOSURE",
                            title="Backend Technology Disclosure (X-Powered-By)",
                            severity=SeverityEnum.LOW,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"x_powered_by": powered_by},
                            recommendation="Remove the X-Powered-By header to obscure backend application frameworks.",
                        )
                    )

                return (
                    HttpSecurityHeaders(
                        hsts=has_hsts,
                        csp=has_csp,
                        x_frame_options=x_frame,
                        x_content_type_options=has_nosniff,
                        referrer_policy=referrer,
                        raw_headers=raw_hdrs,
                    ),
                    findings,
                )
        except Exception as exc:
            logger.debug(f"HTTP headers inspection note for {url}: {exc}")
            return None, findings

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

        for f in findings:
            score += weights.get(f.severity, 0.0)

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
