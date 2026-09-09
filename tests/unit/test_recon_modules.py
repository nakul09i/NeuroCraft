"""Unit tests for passive reconnaissance modular inspectors."""

import time
from datetime import UTC, datetime, timedelta

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from neurocraft_recon.modules.cache import ReconCache
from neurocraft_recon.modules.tech_detector import detect_technologies


def test_recon_cache_operations():
    """Verify in-memory TTL cache set, get, expiry, and normalization."""
    cache = ReconCache(default_ttl_seconds=1)

    cache.set("Example.COM", {"data": 123})

    # Normalized get
    hit = cache.get("example.com")
    assert hit == {"data": 123}

    # TTL expiry
    time.sleep(1.1)
    miss = cache.get("example.com")
    assert miss is None

    # Clear
    cache.set("test.org", "val")
    cache.clear()
    assert cache.get("test.org") is None


def test_detect_technologies_heuristics():
    """Verify conservative passive technology detection from banners and HTML."""
    raw_headers = {
        "server": "nginx/1.24.0",
        "x-powered-by": "Express",
        "cf-ray": "89ab12cd-IAD",
    }
    sample_html = """
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="generator" content="WordPress 6.4.2" />
        <link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css" />
      </head>
      <body>
        <div id="__next">Hello Next</div>
      </body>
    </html>
    """

    technologies = detect_technologies(raw_headers, sample_html)
    tech_names = {t["name"] for t in technologies}

    assert "Cloudflare Edge / CDN" in tech_names
    assert "Nginx" in tech_names
    assert "Express.js / Node.js" in tech_names
    assert "WordPress" in tech_names
    assert "WordPress 6.4.2" in tech_names

    for t in technologies:
        assert 0.0 <= t["confidence"] <= 1.0
        assert len(t["source"]) > 0


def generate_test_x509_cert(expired: bool = False, self_signed: bool = True) -> bytes:
    """Helper to generate a safe in-memory DER-encoded X.509 test certificate."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "test.example.com"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Test Org"),
    ])

    now = datetime.now(UTC)
    if expired:
        not_before = now - timedelta(days=60)
        not_after = now - timedelta(days=1)
    else:
        not_before = now - timedelta(days=1)
        not_after = now + timedelta(days=365)

    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name if self_signed else x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Root CA")]))
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(not_before)
        .not_valid_after(not_after)
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName("test.example.com"), x509.DNSName("sub.example.com")]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )
    from cryptography.hazmat.primitives import serialization
    return cert.public_bytes(serialization.Encoding.DER)


def test_tls_cert_parsing_logic():
    """Verify X.509 cert extraction parses dates, SANs, and expiration correctly."""
    cert_der = generate_test_x509_cert(expired=True)
    cert = x509.load_der_x509_certificate(cert_der)

    common_names = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
    assert common_names[0].value == "test.example.com"

    now = datetime.now(UTC)
    assert now > cert.not_valid_after_utc  # Expired

    san_ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
    dns_names = san_ext.value.get_values_for_type(x509.DNSName)
    assert "test.example.com" in dns_names
    assert "sub.example.com" in dns_names
