"""SSRF (Server-Side Request Forgery) protection and target validation.

Defensively validates target hosts and resolved IP addresses against private networks,
loopback interfaces, link-local addresses, and cloud metadata endpoints.
"""

import ipaddress
import re
import socket
from urllib.parse import urlparse

import httpx
from neurocraft_logging import get_logger

logger = get_logger("neurocraft.recon.ssrf")

# Disallowed IPv4 CIDR blocks
FORBIDDEN_IPV4_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (only valid as source)
    ipaddress.ip_network("10.0.0.0/8"),          # Private RFC 1918
    ipaddress.ip_network("100.64.0.0/10"),       # Carrier-grade NAT
    ipaddress.ip_network("127.0.0.0/8"),         # Loopback
    ipaddress.ip_network("169.254.0.0/16"),      # Link-local / Cloud metadata
    ipaddress.ip_network("172.16.0.0/12"),       # Private RFC 1918
    ipaddress.ip_network("192.0.0.0/24"),        # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),        # Documentation (TEST-NET-1)
    ipaddress.ip_network("192.88.99.0/24"),      # 6to4 relay anycast
    ipaddress.ip_network("192.168.0.0/16"),      # Private RFC 1918
    ipaddress.ip_network("198.18.0.0/15"),       # Benchmark testing
    ipaddress.ip_network("198.51.100.0/24"),     # Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"),      # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),         # Multicast
    ipaddress.ip_network("240.0.0.0/4"),         # Reserved for future use
    ipaddress.ip_network("255.255.255.255/32"),  # Limited broadcast
]

# Disallowed IPv6 CIDR blocks
FORBIDDEN_IPV6_NETWORKS = [
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("::/128"),              # Unspecified
    ipaddress.ip_network("::ffff:0:0/96"),       # IPv4-mapped IPv6
    ipaddress.ip_network("100::/64"),            # Discard prefix
    ipaddress.ip_network("64:ff9b::/96"),        # IPv4/IPv6 translation
    ipaddress.ip_network("2001:db8::/32"),       # Documentation
    ipaddress.ip_network("fc00::/7"),            # Unique local address (ULA)
    ipaddress.ip_network("fe80::/10"),           # Link-local unicast
    ipaddress.ip_network("ff00::/8"),            # Multicast
]

# Known cloud metadata hostnames
CLOUD_METADATA_HOSTS = {
    "instance-data",
    "metadata.google.internal",
    "metadata.internal",
    "metadata.tencentyun.com",
    "169.254.169.254",
    "100.100.100.200",
}

HOSTNAME_REGEX = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.?$"
)


class SSRFSecurityError(ValueError):
    """Raised when a reconnaissance target violates SSRF perimeter boundaries."""


def normalize_target(target: str) -> tuple[str, str]:
    """Normalize input string to pure hostname/domain/IP and identify type.

    Returns:
        (clean_target, target_type) where target_type is 'DOMAIN', 'IP_ADDRESS', or 'HOSTNAME'.
    """
    clean = target.strip().lower()
    if clean.startswith("http://") or clean.startswith("https://"):
        parsed = urlparse(clean)
        clean = parsed.netloc or parsed.path
    if "/" in clean:
        clean = clean.split("/")[0]
    if ":" in clean:
        # Check if it is an IPv6 literal or host:port
        if clean.startswith("[") and "]" in clean:
            clean = clean[1 : clean.find("]")]
        elif clean.count(":") == 1:
            clean = clean.split(":")[0]

    clean = clean.strip().rstrip(".")

    # Test if target is an IP address
    try:
        ipaddress.ip_address(clean)
        return clean, "IP_ADDRESS"
    except ValueError:
        pass

    if "." in clean and HOSTNAME_REGEX.match(clean):
        return clean, "DOMAIN"
    elif HOSTNAME_REGEX.match(clean):
        return clean, "HOSTNAME"

    return clean, "HOSTNAME"


def is_forbidden_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check whether an IP address falls into restricted or private network ranges."""
    if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
        return True

    if isinstance(ip_obj, ipaddress.IPv4Address):
        for net in FORBIDDEN_IPV4_NETWORKS:
            if ip_obj in net:
                return True
    elif isinstance(ip_obj, ipaddress.IPv6Address):
        # Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
        if ip_obj.ipv4_mapped:
            return is_forbidden_ip(ip_obj.ipv4_mapped)
        for net in FORBIDDEN_IPV6_NETWORKS:
            if ip_obj in net:
                return True

    return False


def validate_target_safety(
    raw_target: str,
    allow_private: bool = False,
    timeout_seconds: float = 3.0,
) -> tuple[str, str, list[str]]:
    """Validate target hostname/IP against SSRF vulnerabilities.

    Args:
        raw_target: User-supplied domain, hostname, or IP.
        allow_private: If True, bypass checks (for development testing only).
        timeout_seconds: Socket resolution timeout.

    Returns:
        tuple of (normalized_target, target_type, resolved_ip_list)

    Raises:
        SSRFSecurityError: If the target is unsafe, private, loopback, or metadata endpoint.
    """
    clean_target, target_type = normalize_target(raw_target)

    if not clean_target:
        raise SSRFSecurityError("Target must not be empty.")

    # 1. Check cloud metadata names
    if clean_target in CLOUD_METADATA_HOSTS:
        raise SSRFSecurityError(f"Target '{clean_target}' is a restricted cloud metadata service.")

    # 2. Check localhost / loopback aliases
    if clean_target in ("localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"):
        raise SSRFSecurityError(f"Target '{clean_target}' points to local host.")

    if not allow_private:
        # Check if direct IP address
        try:
            ip_obj = ipaddress.ip_address(clean_target)
            if is_forbidden_ip(ip_obj):
                raise SSRFSecurityError(
                    f"Direct target IP {clean_target} is in a reserved or private network range."
                )
            return clean_target, target_type, [str(ip_obj)]
        except ValueError:
            pass

        # 3. Validate hostname format
        if not HOSTNAME_REGEX.match(clean_target):
            raise SSRFSecurityError(f"Target '{clean_target}' is not a valid hostname or domain.")

        # 4. Resolve hostname via DNS to verify resolved IPs
        try:
            old_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(timeout_seconds)
            try:
                addr_info = socket.getaddrinfo(clean_target, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            finally:
                socket.setdefaulttimeout(old_timeout)

            resolved_ips: set[str] = set()
            for _family, _, _, _, sockaddr in addr_info:
                ip_str = sockaddr[0]
                resolved_ips.add(ip_str)
                ip_obj = ipaddress.ip_address(ip_str)
                if is_forbidden_ip(ip_obj):
                    logger.warning(
                        f"SSRF violation: Hostname '{clean_target}' resolves to restricted IP {ip_str}"
                    )
                    raise SSRFSecurityError(
                        f"Target '{clean_target}' resolves to a restricted internal/private address ({ip_str})."
                    )

            if not resolved_ips:
                raise SSRFSecurityError(f"Target '{clean_target}' could not be resolved.")

            return clean_target, target_type, sorted(resolved_ips)

        except socket.gaierror as err:
            logger.debug(f"DNS resolution failure for '{clean_target}': {err}")
            # If resolution fails, it might be unresolvable/offline, which is fine for passive testing
            # but we record it safely
            return clean_target, target_type, []

    return clean_target, target_type, []


async def safe_redirect_hook(response: httpx.Response) -> None:
    """Async event hook for httpx to inspect redirect location headers against SSRF."""
    if response.is_redirect and "location" in response.headers:
        loc = response.headers["location"]
        try:
            validate_target_safety(loc)
        except SSRFSecurityError as err:
            logger.warning(f"Blocked unsafe redirect to {loc}: {err}")
            raise SSRFSecurityError(f"Unsafe redirect destination blocked: {loc}") from err
