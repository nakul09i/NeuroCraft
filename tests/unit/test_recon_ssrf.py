"""Unit tests for SSRF protection and target perimeter validation."""

import ipaddress

import httpx
import pytest
from neurocraft_recon.ssrf import (
    SSRFSecurityError,
    is_forbidden_ip,
    normalize_target,
    safe_redirect_hook,
    validate_target_safety,
)


def test_normalize_target_variations():
    """Verify target sanitization across schemes, ports, and paths."""
    # HTTP and HTTPS URLs
    assert normalize_target("https://example.com/some/path?q=1") == ("example.com", "DOMAIN")
    assert normalize_target("http://sub.domain.org:8080/v1") == ("sub.domain.org", "DOMAIN")
    assert normalize_target("  https://WWW.TARGET.COM/  ") == ("www.target.com", "DOMAIN")

    # Pure hostnames and domains
    assert normalize_target("api.service.internal") == ("api.service.internal", "DOMAIN")
    assert normalize_target("singlehost") == ("singlehost", "HOSTNAME")

    # IPv4 targets
    assert normalize_target("192.168.1.1") == ("192.168.1.1", "IP_ADDRESS")
    assert normalize_target("http://8.8.8.8:53/") == ("8.8.8.8", "IP_ADDRESS")

    # IPv6 targets
    assert normalize_target("[2001:4860:4860::8888]:443") == ("2001:4860:4860::8888", "IP_ADDRESS")


def test_is_forbidden_ip_ranges():
    """Ensure all private, loopback, link-local, and reserved ranges are caught."""
    # Loopback
    assert is_forbidden_ip(ipaddress.ip_address("127.0.0.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("127.100.50.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("::1")) is True

    # RFC 1918 Private
    assert is_forbidden_ip(ipaddress.ip_address("10.0.0.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("10.255.255.254")) is True
    assert is_forbidden_ip(ipaddress.ip_address("172.16.0.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("172.31.255.255")) is True
    assert is_forbidden_ip(ipaddress.ip_address("192.168.0.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("192.168.254.254")) is True

    # Link-local & Cloud metadata
    assert is_forbidden_ip(ipaddress.ip_address("169.254.169.254")) is True
    assert is_forbidden_ip(ipaddress.ip_address("169.254.1.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("fe80::1")) is True

    # IPv4-mapped IPv6 loopback
    assert is_forbidden_ip(ipaddress.ip_address("::ffff:127.0.0.1")) is True
    assert is_forbidden_ip(ipaddress.ip_address("::ffff:192.168.1.1")) is True

    # Public allowed IPs
    assert is_forbidden_ip(ipaddress.ip_address("8.8.8.8")) is False
    assert is_forbidden_ip(ipaddress.ip_address("1.1.1.1")) is False
    assert is_forbidden_ip(ipaddress.ip_address("93.184.216.34")) is False  # example.com


def test_validate_target_safety_blocks_prohibited_destinations():
    """Verify validate_target_safety raises SSRFSecurityError on dangerous targets."""
    # Localhost names
    with pytest.raises(SSRFSecurityError, match="points to local host"):
        validate_target_safety("localhost")

    with pytest.raises(SSRFSecurityError, match="points to local host"):
        validate_target_safety("http://localhost:8000/admin")

    # Cloud metadata endpoints
    with pytest.raises(SSRFSecurityError, match="restricted cloud metadata"):
        validate_target_safety("169.254.169.254")

    with pytest.raises(SSRFSecurityError, match="restricted cloud metadata"):
        validate_target_safety("http://metadata.google.internal/computeMetadata/v1/")

    with pytest.raises(SSRFSecurityError, match="restricted cloud metadata"):
        validate_target_safety("instance-data")

    # Private IP addresses
    with pytest.raises(SSRFSecurityError, match=r"(reserved or private network|restricted internal/private address)"):
        validate_target_safety("192.168.1.100")

    with pytest.raises(SSRFSecurityError, match=r"(reserved or private network|restricted internal/private address)"):
        validate_target_safety("10.0.0.5")

    with pytest.raises(SSRFSecurityError, match=r"(reserved or private network|restricted internal/private address)"):
        validate_target_safety("127.0.0.1")

    # Empty target
    with pytest.raises(SSRFSecurityError, match="must not be empty"):
        validate_target_safety("   ")


@pytest.mark.anyio
async def test_safe_redirect_hook_blocks_ssrf():
    """Verify HTTP redirect hook catches redirect to internal endpoint."""
    request = httpx.Request("GET", "https://public-service.com")

    # Safe redirect
    safe_resp = httpx.Response(302, headers={"Location": "https://example.com/new"}, request=request)
    # Should not raise
    await safe_redirect_hook(safe_resp)

    # Malicious redirect to 169.254.169.254
    bad_resp = httpx.Response(302, headers={"Location": "http://169.254.169.254/latest/meta-data"}, request=request)
    with pytest.raises(SSRFSecurityError, match="Unsafe redirect destination blocked"):
        await safe_redirect_hook(bad_resp)

    # Malicious redirect to localhost
    bad_resp_localhost = httpx.Response(302, headers={"Location": "http://localhost:8000/internal"}, request=request)
    with pytest.raises(SSRFSecurityError, match="Unsafe redirect destination blocked"):
        await safe_redirect_hook(bad_resp_localhost)
