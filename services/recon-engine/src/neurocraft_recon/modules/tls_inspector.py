"""Passive TLS certificate and transport encryption inspector."""

import socket
import ssl
import uuid
from datetime import UTC, datetime, timedelta

from cryptography import x509
from cryptography.x509.oid import ExtensionOID, NameOID
from neurocraft_logging import get_logger
from neurocraft_types import (
    ConfidenceEnum,
    ReconAsset,
    ReconFinding,
    SeverityEnum,
    TlsCertificateInfo,
)

logger = get_logger("neurocraft.recon.tls")


def inspect_tls(
    target: str, timeout_seconds: float = 3.0
) -> tuple[TlsCertificateInfo | None, list[ReconAsset], list[ReconFinding]]:
    """Passive TLS certificate inspection via non-intrusive socket handshake on port 443."""
    assets: list[ReconAsset] = []
    findings: list[ReconFinding] = []
    now = datetime.now(UTC)

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with socket.create_connection((target, 443), timeout=timeout_seconds) as sock:
            with ctx.wrap_socket(sock, server_hostname=target) as ssock:
                cert_bin = ssock.getpeercert(binary_form=True)
                tls_version = ssock.version() or "Unknown"
                cipher_tuple = ssock.cipher()
                cipher_suite = cipher_tuple[0] if cipher_tuple else "Unknown"

                if not cert_bin:
                    return None, assets, findings

                cert = x509.load_der_x509_certificate(cert_bin)

                # Extract Subject Common Name
                common_names = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
                subject_str = common_names[0].value if common_names else cert.subject.rfc4514_string()

                # Extract Issuer Common Name / Organization
                issuer_cns = cert.issuer.get_attributes_for_oid(NameOID.COMMON_NAME)
                issuer_orgs = cert.issuer.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
                if issuer_cns:
                    issuer_str = issuer_cns[0].value
                elif issuer_orgs:
                    issuer_str = issuer_orgs[0].value
                else:
                    issuer_str = cert.issuer.rfc4514_string()

                # Extract SANs
                sans: list[str] = []
                try:
                    san_ext = cert.extensions.get_extension_for_oid(ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                    dns_names = san_ext.value.get_values_for_type(x509.DNSName)
                    for name in dns_names:
                        sans.append(name)
                        if name != target and not name.startswith("*."):
                            assets.append(
                                ReconAsset(
                                    id=f"asset-{uuid.uuid4().hex[:8]}",
                                    hostname=name,
                                    asset_type="SAN_SUBDOMAIN",
                                    source="TLS_CERT",
                                    status="ACTIVE",
                                    observed_at=now,
                                )
                            )
                except x509.ExtensionNotFound:
                    pass

                # Dates
                not_before = cert.not_valid_before_utc
                not_after = cert.not_valid_after_utc
                is_expired = now > not_after

                # Evaluation & Findings
                if is_expired:
                    findings.append(
                        ReconFinding(
                            id="RECON-TLS-002",
                            category="TLS",
                            title="Expired TLS Certificate",
                            severity=SeverityEnum.HIGH,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"valid_to": not_after.isoformat(), "current_time": now.isoformat()},
                            recommendation="Renew the TLS certificate immediately to restore browser trust.",
                            source="TLS",
                            observed_at=now,
                        )
                    )
                elif not_after - now < timedelta(days=14):
                    findings.append(
                        ReconFinding(
                            id="RECON-TLS-003",
                            category="TLS",
                            title="TLS Certificate Expiring Soon (< 14 days)",
                            severity=SeverityEnum.LOW,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"valid_to": not_after.isoformat()},
                            recommendation="Schedule TLS certificate renewal before expiration to avoid service interruption.",
                            source="TLS",
                            observed_at=now,
                        )
                    )

                if tls_version in ("TLSv1", "TLSv1.1", "SSLv3", "SSLv2"):
                    findings.append(
                        ReconFinding(
                            id="RECON-TLS-001",
                            category="TLS",
                            title=f"Outdated Protocol Negotiated ({tls_version})",
                            severity=SeverityEnum.HIGH,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"negotiated_protocol": tls_version},
                            recommendation="Disable legacy SSL/TLS protocols and mandate TLS 1.2 or TLS 1.3.",
                            source="TLS",
                            observed_at=now,
                        )
                    )

                # Check if self-signed (subject == issuer)
                if cert.subject == cert.issuer:
                    findings.append(
                        ReconFinding(
                            id="RECON-TLS-004",
                            category="TLS",
                            title="Self-Signed TLS Certificate",
                            severity=SeverityEnum.MEDIUM,
                            confidence=ConfidenceEnum.HIGH,
                            evidence={"subject": subject_str, "issuer": issuer_str},
                            recommendation="Replace self-signed certificate with a certificate issued by a recognized CA.",
                            source="TLS",
                            observed_at=now,
                        )
                    )

                tls_info = TlsCertificateInfo(
                    subject=subject_str,
                    issuer=issuer_str,
                    san=sans[:50],  # cap list
                    valid_from=not_before.isoformat(),
                    valid_to=not_after.isoformat(),
                    cipher_suite=cipher_suite,
                    tls_version=tls_version,
                    is_expired=is_expired,
                )

                return tls_info, assets, findings

    except Exception as err:
        logger.debug(f"TLS inspection note for {target}:443: {err}")
        return None, assets, findings
