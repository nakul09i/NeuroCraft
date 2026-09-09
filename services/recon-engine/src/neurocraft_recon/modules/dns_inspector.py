"""Passive DNS records and domain spoofing protections inspector."""

import uuid
from datetime import UTC, datetime

import dns.resolver
from neurocraft_logging import get_logger
from neurocraft_types import (
    ConfidenceEnum,
    DnsRecord,
    ReconAsset,
    ReconFinding,
    SeverityEnum,
)

logger = get_logger("neurocraft.recon.dns")


def inspect_dns(
    target: str, timeout_seconds: float = 3.0
) -> tuple[list[DnsRecord], list[ReconAsset], list[ReconFinding]]:
    """Passive DNS inspection for public records (A, AAAA, MX, NS, TXT, CNAME, SPF, DMARC)."""
    records: list[DnsRecord] = []
    assets: list[ReconAsset] = []
    findings: list[ReconFinding] = []
    now = datetime.now(UTC)

    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout_seconds
    resolver.lifetime = timeout_seconds

    # Primary target domain asset
    assets.append(
        ReconAsset(
            id=f"asset-{uuid.uuid4().hex[:8]}",
            hostname=target,
            asset_type="DOMAIN",
            source="DNS",
            status="ACTIVE",
            metadata={"domain": target},
            observed_at=now,
        )
    )

    has_spf = False
    has_dmarc = False
    spf_record_text = ""

    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]
    for rtype in record_types:
        try:
            answers = resolver.resolve(target, rtype)
            for ans in answers:
                val = ans.to_text().strip('"')
                records.append(DnsRecord(record_type=rtype, value=val, ttl=answers.ttl))

                # Track infrastructure assets
                if rtype in ("A", "AAAA"):
                    assets.append(
                        ReconAsset(
                            id=f"asset-{uuid.uuid4().hex[:8]}",
                            hostname=val,
                            asset_type="IP_ADDRESS",
                            source=f"DNS_{rtype}",
                            status="ACTIVE",
                            observed_at=now,
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
                            observed_at=now,
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
                            observed_at=now,
                        )
                    )
                elif rtype == "TXT" and "v=spf1" in val.lower():
                    has_spf = True
                    spf_record_text = val
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass
        except Exception as err:
            logger.debug(f"DNS {rtype} query note for {target}: {err}")

    # Check DMARC
    try:
        dmarc_answers = resolver.resolve(f"_dmarc.{target}", "TXT")
        for ans in dmarc_answers:
            val = ans.to_text().strip('"')
            if "v=dmarc1" in val.lower():
                has_dmarc = True
                records.append(DnsRecord(record_type="DMARC", value=val, ttl=dmarc_answers.ttl))
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
                source="DNS",
                observed_at=now,
            )
        )
    elif "+all" in spf_record_text.lower():
        findings.append(
            ReconFinding(
                id="RECON-DNS-003",
                category="DNS",
                title="Permissive SPF Policy (+all)",
                severity=SeverityEnum.HIGH,
                confidence=ConfidenceEnum.HIGH,
                evidence={"spf_record": spf_record_text},
                recommendation="Change '+all' to '~all' or '-all' in SPF record to prevent spoofing from any IP.",
                source="DNS",
                observed_at=now,
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
                recommendation="Configure a DMARC policy at _dmarc.<domain> to instruct mail servers to reject/quarantine spoofed emails.",
                source="DNS",
                observed_at=now,
            )
        )

    return records, assets, findings
