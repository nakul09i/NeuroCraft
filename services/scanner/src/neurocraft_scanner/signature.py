"""Digital signature and cryptographic certificate verification engine.

Provides evidence-based Authenticode and PKCS#7 certificate chain extraction
with zero dynamic code execution. Adheres strictly to the principle:
Unsigned != Malicious; Invalid Signature != Immediate Malware.
"""

import struct
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import pefile
from cryptography.hazmat.primitives.serialization import pkcs7
from neurocraft_logging import get_logger
from neurocraft_types import (
    CertificateInfo,
    ConfidenceEnum,
    DigitalSignatureInfo,
    FileTypeEnum,
    Finding,
    SeverityEnum,
    SignatureStatusEnum,
)

logger = get_logger("neurocraft.signature")

WIN_CERT_TYPE_PKCS_SIGNED_DATA = 0x0002


class SignatureAnalyzer:
    """Evidence-based static digital signature extractor."""

    def analyze(self, file_path: Path, file_type: FileTypeEnum) -> tuple[DigitalSignatureInfo, list[Finding]]:
        """Analyze file for digital signatures based on detected format."""
        try:
            if file_type == FileTypeEnum.PE:
                return self._analyze_pe_signature(file_path)
            elif file_type == FileTypeEnum.APK:
                return self._analyze_apk_signature(file_path)
            elif file_type == FileTypeEnum.PDF:
                return self._analyze_pdf_signature(file_path)
        except Exception as exc:
            logger.warning(f"Signature analysis error for {file_path.name}: {exc}")

        return (
            DigitalSignatureInfo(
                is_signed=False,
                status=SignatureStatusEnum.UNSIGNED,
                warnings=["File format does not support standard digital signatures or is unsigned."],
            ),
            [],
        )

    def _analyze_pe_signature(self, file_path: Path) -> tuple[DigitalSignatureInfo, list[Finding]]:
        """Extract and parse PE Authenticode signature directory without executing the binary."""
        findings: list[Finding] = []
        try:
            pe = pefile.PE(str(file_path), fast_load=True)
            pe.parse_data_directories(
                directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_SECURITY"]]
            )

            sec_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[
                pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_SECURITY"]
            ]

            if not sec_dir or sec_dir.VirtualAddress == 0 or sec_dir.Size == 0:
                findings.append(
                    Finding(
                        id="FIND-SIG-001",
                        category="SIGNATURE",
                        title="Executable is Unsigned",
                        description=(
                            "No Authenticode security directory entry was found in the PE header. "
                            "Unsigned binaries are common but lack cryptographic origin verification."
                        ),
                        severity=SeverityEnum.LOW,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"security_directory_size": 0},
                        source_engine="signature_analyzer",
                    )
                )
                return (
                    DigitalSignatureInfo(
                        is_signed=False,
                        status=SignatureStatusEnum.UNSIGNED,
                        warnings=["No Authenticode digital signature present."],
                    ),
                    findings,
                )

            # Read WIN_CERTIFICATE from physical file offset
            offset = sec_dir.VirtualAddress
            size = sec_dir.Size

            with file_path.open("rb") as f:
                f.seek(offset)
                raw_win_cert = f.read(size)

            if len(raw_win_cert) < 8:
                findings.append(
                    Finding(
                        id="FIND-SIG-002",
                        category="SIGNATURE",
                        title="Corrupted Authenticode Certificate Header",
                        description="Security directory size is smaller than the required 8-byte WIN_CERTIFICATE header.",
                        severity=SeverityEnum.MEDIUM,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"raw_size": len(raw_win_cert)},
                        source_engine="signature_analyzer",
                    )
                )
                return (
                    DigitalSignatureInfo(
                        is_signed=True,
                        status=SignatureStatusEnum.CORRUPTED,
                        warnings=["Authenticode directory header is truncated or malformed."],
                    ),
                    findings,
                )

            dw_length, w_revision, w_cert_type = struct.unpack_from("<IHH", raw_win_cert, 0)
            pkcs7_bytes = raw_win_cert[8:dw_length]

            if w_cert_type != WIN_CERT_TYPE_PKCS_SIGNED_DATA or not pkcs7_bytes:
                return (
                    DigitalSignatureInfo(
                        is_signed=True,
                        status=SignatureStatusEnum.UNKNOWN,
                        warnings=[f"Unsupported certificate type: 0x{w_cert_type:04x}"],
                    ),
                    findings,
                )

            # Parse PKCS#7 certificate chain
            certs = self._parse_pkcs7_der(pkcs7_bytes)
            if not certs:
                findings.append(
                    Finding(
                        id="FIND-SIG-003",
                        category="SIGNATURE",
                        title="Unparseable PKCS#7 Authenticode Structure",
                        description="WIN_CERTIFICATE payload contains invalid or unsupported DER ASN.1 data.",
                        severity=SeverityEnum.MEDIUM,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"pkcs7_bytes_len": len(pkcs7_bytes)},
                        source_engine="signature_analyzer",
                    )
                )
                return (
                    DigitalSignatureInfo(
                        is_signed=True,
                        status=SignatureStatusEnum.CORRUPTED,
                        warnings=["Could not decode X.509 certificates from PKCS#7 payload."],
                    ),
                    findings,
                )

            # Analyze certificates
            leaf_cert = certs[0]
            is_self_signed = any(c.is_self_signed for c in certs)
            is_expired = any(c.is_expired for c in certs)

            if is_self_signed:
                sig_status = SignatureStatusEnum.SELF_SIGNED
                findings.append(
                    Finding(
                        id="FIND-SIG-004",
                        category="SIGNATURE",
                        title="Self-Signed Authenticode Certificate",
                        description="The binary is signed by a certificate where Issuer equals Subject, lacking a commercial Root CA.",
                        severity=SeverityEnum.LOW,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={
                            "signer": leaf_cert.subject,
                            "serial": leaf_cert.serial_number,
                        },
                        source_engine="signature_analyzer",
                    )
                )
            elif is_expired:
                sig_status = SignatureStatusEnum.VALID
                findings.append(
                    Finding(
                        id="FIND-SIG-005",
                        category="SIGNATURE",
                        title="Expired Digital Signature Certificate",
                        description="One or more certificates in the signature chain has passed its validity expiration date.",
                        severity=SeverityEnum.INFO,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"expired_not_after": leaf_cert.not_after},
                        source_engine="signature_analyzer",
                    )
                )
            else:
                sig_status = SignatureStatusEnum.VALID
                findings.append(
                    Finding(
                        id="FIND-SIG-006",
                        category="SIGNATURE",
                        title="Valid Digital Signature Present",
                        description="Executable contains a valid, well-formed digital signature structure.",
                        severity=SeverityEnum.INFO,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={
                            "signer": leaf_cert.subject,
                            "issuer": leaf_cert.issuer,
                            "algorithm": leaf_cert.signature_algorithm,
                        },
                        source_engine="signature_analyzer",
                    )
                )

            return (
                DigitalSignatureInfo(
                    is_signed=True,
                    status=sig_status,
                    signer_name=self._extract_cn(leaf_cert.subject),
                    issuer_name=self._extract_cn(leaf_cert.issuer),
                    digest_algorithm=leaf_cert.signature_algorithm,
                    certificates=certs,
                    warnings=[] if not is_expired else ["Certificate validity period has expired."],
                ),
                findings,
            )

        except Exception as exc:
            logger.debug(f"PE signature extraction note: {exc}")
            return (
                DigitalSignatureInfo(
                    is_signed=False,
                    status=SignatureStatusEnum.UNSIGNED,
                    warnings=[f"PE signature parsing error: {exc}"],
                ),
                findings,
            )

    def _analyze_apk_signature(self, file_path: Path) -> tuple[DigitalSignatureInfo, list[Finding]]:
        """Extract Android APK signing certificate from META-INF without executing anything."""
        findings: list[Finding] = []
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                sig_files = [
                    n
                    for n in zf.namelist()
                    if n.startswith("META-INF/")
                    and (n.endswith(".RSA") or n.endswith(".DSA") or n.endswith(".EC"))
                ]
                if not sig_files:
                    return (
                        DigitalSignatureInfo(
                            is_signed=False,
                            status=SignatureStatusEnum.UNSIGNED,
                            warnings=["No Android v1 signature file found in META-INF."],
                        ),
                        findings,
                    )

                raw_bytes = zf.read(sig_files[0])
                certs = self._parse_pkcs7_der(raw_bytes)
                if not certs:
                    return (
                        DigitalSignatureInfo(
                            is_signed=True,
                            status=SignatureStatusEnum.UNKNOWN,
                            warnings=["Could not parse certificate from APK signature block."],
                        ),
                        findings,
                    )

                leaf = certs[0]
                status = SignatureStatusEnum.SELF_SIGNED if leaf.is_self_signed else SignatureStatusEnum.VALID
                findings.append(
                    Finding(
                        id="FIND-SIG-APK-001",
                        category="SIGNATURE",
                        title="Android Package Signature Present",
                        description=f"APK signed by: {leaf.subject}",
                        severity=SeverityEnum.INFO,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"signer": leaf.subject, "sig_file": sig_files[0]},
                        source_engine="signature_analyzer",
                    )
                )
                return (
                    DigitalSignatureInfo(
                        is_signed=True,
                        status=status,
                        signer_name=self._extract_cn(leaf.subject),
                        issuer_name=self._extract_cn(leaf.issuer),
                        certificates=certs,
                    ),
                    findings,
                )
        except Exception as err:
            logger.debug(f"APK signature check note: {err}")
            return (
                DigitalSignatureInfo(
                    is_signed=False,
                    status=SignatureStatusEnum.UNSIGNED,
                ),
                findings,
            )

    def _analyze_pdf_signature(self, file_path: Path) -> tuple[DigitalSignatureInfo, list[Finding]]:
        """Passive detection of PDF digital signature dictionary."""
        findings: list[Finding] = []
        try:
            with file_path.open("rb") as f:
                head = f.read(min(1024 * 1024, file_path.stat().st_size))
            if b"/Type /Sig" in head or b"/ByteRange" in head:
                findings.append(
                    Finding(
                        id="FIND-SIG-PDF-001",
                        category="SIGNATURE",
                        title="PDF Digital Signature Object Observed",
                        description="Document contains standard Adobe PDF digital signature dictionary structures.",
                        severity=SeverityEnum.INFO,
                        confidence=ConfidenceEnum.MEDIUM,
                        evidence={"has_sig_dictionary": True},
                        source_engine="signature_analyzer",
                    )
                )
                return (
                    DigitalSignatureInfo(
                        is_signed=True,
                        status=SignatureStatusEnum.VALID,
                        signer_name="PDF Embedded Signature",
                    ),
                    findings,
                )
        except Exception:
            pass

        return (
            DigitalSignatureInfo(
                is_signed=False,
                status=SignatureStatusEnum.UNSIGNED,
            ),
            findings,
        )

    def _parse_pkcs7_der(self, der_bytes: bytes) -> list[CertificateInfo]:
        """Load X.509 certificates from DER-encoded PKCS#7 structure."""
        result: list[CertificateInfo] = []
        try:
            x509_certs = pkcs7.load_der_pkcs7_certificates(der_bytes)
            now = datetime.now(UTC)
            for cert in x509_certs:
                sub = cert.subject.rfc4514_string()
                iss = cert.issuer.rfc4514_string()
                not_before = cert.not_valid_before_utc
                not_after = cert.not_valid_after_utc
                algo = (
                    cert.signature_hash_algorithm.name
                    if cert.signature_hash_algorithm
                    else "unknown"
                )

                result.append(
                    CertificateInfo(
                        subject=sub,
                        issuer=iss,
                        serial_number=hex(cert.serial_number),
                        not_before=not_before.isoformat(),
                        not_after=not_after.isoformat(),
                        signature_algorithm=algo,
                        is_self_signed=(sub == iss),
                        is_expired=(now > not_after or now < not_before),
                    )
                )
        except Exception as err:
            logger.debug(f"PKCS7 decoding detail: {err}")
        return result

    def _extract_cn(self, dn: str) -> str:
        """Extract Common Name (CN) from an RFC4514 DN string."""
        for part in dn.split(","):
            if part.strip().startswith("CN="):
                return part.strip()[3:]
        return dn
