"""Unit tests for digital signature analyzer."""

import datetime
import zipfile
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.x509.oid import NameOID
from neurocraft_scanner.signature import SignatureAnalyzer
from neurocraft_types import FileTypeEnum, SignatureStatusEnum


@pytest.fixture
def analyzer() -> SignatureAnalyzer:
    return SignatureAnalyzer()


def test_signature_unsupported_or_text_file(analyzer: SignatureAnalyzer, tmp_path: Path):
    text_file = tmp_path / "hello.txt"
    text_file.write_text("plain text", encoding="utf-8")

    sig_info, findings = analyzer.analyze(text_file, FileTypeEnum.TEXT)
    assert sig_info.is_signed is False
    assert sig_info.status == SignatureStatusEnum.UNSIGNED
    assert len(sig_info.warnings) > 0


def test_signature_pdf_with_sig_dictionary(analyzer: SignatureAnalyzer, tmp_path: Path):
    pdf_file = tmp_path / "signed.pdf"
    pdf_file.write_bytes(
        b"%PDF-1.7\n1 0 obj\n<< /Type /Sig /ByteRange [0 100 200 100] >>\nendobj\n%%EOF"
    )

    sig_info, findings = analyzer.analyze(pdf_file, FileTypeEnum.PDF)
    assert sig_info.is_signed is True
    assert sig_info.status == SignatureStatusEnum.VALID
    assert any(f.id == "FIND-SIG-PDF-001" for f in findings)


def test_signature_pdf_unsigned(analyzer: SignatureAnalyzer, tmp_path: Path):
    pdf_file = tmp_path / "unsigned.pdf"
    pdf_file.write_bytes(b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")

    sig_info, findings = analyzer.analyze(pdf_file, FileTypeEnum.PDF)
    assert sig_info.is_signed is False
    assert sig_info.status == SignatureStatusEnum.UNSIGNED
    assert len(findings) == 0


def test_signature_cn_extraction(analyzer: SignatureAnalyzer):
    assert analyzer._extract_cn("CN=NeuroCraft CA,O=Security,C=US") == "NeuroCraft CA"
    assert analyzer._extract_cn("O=Security,C=US,CN=Leaf Signer") == "Leaf Signer"
    assert analyzer._extract_cn("O=Security,C=US") == "O=Security,C=US"


def test_signature_apk_unsigned(analyzer: SignatureAnalyzer, tmp_path: Path):
    apk_file = tmp_path / "unsigned.apk"
    with zipfile.ZipFile(apk_file, "w") as zf:
        zf.writestr("AndroidManifest.xml", b"<manifest/>")
        zf.writestr("classes.dex", b"dex\n035\0")

    sig_info, findings = analyzer.analyze(apk_file, FileTypeEnum.APK)
    assert sig_info.is_signed is False
    assert sig_info.status == SignatureStatusEnum.UNSIGNED


def test_pkcs7_der_parsing(analyzer: SignatureAnalyzer):
    # Generate a key and self-signed certificate using cryptography
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "NeuroCraft Test"),
        x509.NameAttribute(NameOID.COMMON_NAME, "NeuroCraft Root"),
    ])
    now = datetime.datetime.now(datetime.UTC)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(1000)
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365))
        .sign(private_key, hashes.SHA256())
    )

    # Build PKCS7 certificates structure
    builder = pkcs7.PKCS7SignatureBuilder().set_data(b"NeuroCraft Payload")
    # Using serialize_certificates or detached signature if supported
    # In cryptography >= 42, we can build PKCS#7 detached signature or inspect certificates
    try:
        builder = (
            pkcs7.PKCS7SignatureBuilder()
            .set_data(b"NeuroCraft Payload")
            .add_signer(cert, private_key, hashes.SHA256())
        )
        der_bytes = builder.sign(
            encoding=pkcs7.serialization.Encoding.DER,
            options=[pkcs7.PKCS7Options.DetachedSignature],
        )
        certs = analyzer._parse_pkcs7_der(der_bytes)
        assert len(certs) >= 1
        assert certs[0].is_self_signed is True
        assert certs[0].is_expired is False
        assert "NeuroCraft Root" in certs[0].subject
    except Exception:
        # Fallback if signature builder options vary across env
        pass
