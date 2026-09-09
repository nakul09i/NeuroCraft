"""Canonical domain models, findings, capabilities, and data contracts for NeuroCraft."""

from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class VerdictEnum(str, Enum):
    """Legacy/Top-level categorical security verdict."""

    CLEAN = "CLEAN"
    SUSPICIOUS = "SUSPICIOUS"
    MALICIOUS = "MALICIOUS"
    UNKNOWN = "UNKNOWN"


class VerdictLevel(str, Enum):
    """Standardized risk level assessment."""

    SAFE = "SAFE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SeverityEnum(str, Enum):
    """Severity of a finding or indicator."""

    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ConfidenceEnum(str, Enum):
    """Confidence level of a finding, capability, or inference."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CapabilityStatusEnum(str, Enum):
    """Status of an observed behavioral capability."""

    DETECTED = "DETECTED"
    LIKELY = "LIKELY"
    POSSIBLE = "POSSIBLE"
    NOT_DETECTED = "NOT_DETECTED"
    UNKNOWN = "UNKNOWN"


class FileTypeEnum(str, Enum):
    """Normalized file type classification."""

    PE = "PE"
    ELF = "ELF"
    MACH_O = "MACH_O"
    PDF = "PDF"
    ZIP = "ZIP"
    OFFICE = "OFFICE"
    APK = "APK"
    IMAGE = "IMAGE"
    TEXT = "TEXT"
    UNKNOWN = "UNKNOWN"


class EngineStatusEnum(str, Enum):
    """Operational status of an analysis engine."""

    COMPLETED = "COMPLETED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    DISABLED = "DISABLED"
    NOT_SUPPORTED = "NOT_SUPPORTED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class SignatureStatusEnum(str, Enum):
    """Digital signature validation status."""

    SIGNED = "SIGNED"
    VALID = "VALID"
    INVALID = "INVALID"
    INVALID_TAMPERED = "INVALID_TAMPERED"
    SELF_SIGNED = "SELF_SIGNED"
    UNSIGNED = "UNSIGNED"
    CORRUPTED = "CORRUPTED"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class HashMatchStatusEnum(str, Enum):
    """Result of reference hash verification."""

    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    NOT_PROVIDED = "NOT_PROVIDED"
    INVALID_REFERENCE = "INVALID_REFERENCE"


class IntegrityStatusEnum(str, Enum):
    """Deterministic cryptographic integrity evaluation status."""

    VERIFIED = "VERIFIED"
    UNCHANGED = "UNCHANGED"
    MISMATCH = "MISMATCH"
    SIGNED = "SIGNED"
    UNSIGNED = "UNSIGNED"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class TrustLevelEnum(str, Enum):
    """Categorical trust assurance level."""

    VERY_LOW = "VERY_LOW"
    LOW = "LOW"
    NEUTRAL = "NEUTRAL"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class TrustEvidenceItem(BaseModel):
    """Verifiable evidence observation for trust and integrity."""

    type: str = Field(..., description="Evidence category (hash, signature, certificate, reference)")
    algorithm: str | None = Field(default=None, description="Cryptographic algorithm if applicable")
    value: str | None = Field(default=None, description="Observed cryptographic digest or identifier")
    status: str = Field(..., description="Evaluation status (match, mismatch, verified, unsigned, etc.)")
    meaning: str = Field(..., description="Human-readable forensic significance")
    details: dict[str, Any] = Field(default_factory=dict, description="Supplementary evidence metadata")


class CertificateInfo(BaseModel):
    """Parsed X.509 certificate metadata."""

    subject: str = Field(..., description="Certificate Subject Distinguished Name")
    issuer: str = Field(..., description="Certificate Issuer Distinguished Name")
    serial_number: str = Field(..., description="Certificate hex serial number")
    not_before: str | None = Field(default=None, description="Validity start timestamp")
    not_after: str | None = Field(default=None, description="Validity expiration timestamp")
    signature_algorithm: str | None = Field(default=None, description="Cryptographic signature algorithm")
    is_self_signed: bool = Field(default=False, description="True if issuer matches subject")
    is_expired: bool = Field(default=False, description="True if current time exceeds not_after")


class DigitalSignatureInfo(BaseModel):
    """Complete digital signature analysis metadata."""

    is_signed: bool = Field(..., description="True if digital signature structure is present")
    status: SignatureStatusEnum = Field(..., description="Signature verification verdict")
    signer_name: str | None = Field(default=None, description="Common name of leaf certificate")
    issuer_name: str | None = Field(default=None, description="Common name of issuing CA")
    digest_algorithm: str | None = Field(default=None, description="Digest algorithm (SHA256, SHA1)")
    embedded_digest: str | None = Field(default=None, description="Digest stored in Authenticode directory")
    calculated_digest: str | None = Field(default=None, description="Digest recomputed from file content")
    digest_match: bool | None = Field(default=None, description="True if embedded digest equals calculated")
    certificates: list[CertificateInfo] = Field(default_factory=list, description="Extracted certificate chain")
    warnings: list[str] = Field(default_factory=list, description="Signature anomalies or warnings")


class FileIntegrityReport(BaseModel):
    """Deterministic cryptographic integrity assessment report."""

    scan_id: str
    sha256: str
    sha512: str | None = None
    sha1: str | None = None
    reference_hash: str | None = None
    hash_match_status: HashMatchStatusEnum = HashMatchStatusEnum.NOT_PROVIDED
    signature_info: DigitalSignatureInfo | None = None
    integrity_status: IntegrityStatusEnum
    trust_score: float = Field(..., ge=0.0, le=100.0, description="0=untrusted/tampered, 100=cryptographically verified")
    trust_level: TrustLevelEnum
    confidence: ConfidenceEnum = ConfidenceEnum.HIGH
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0)
    evidence: list[TrustEvidenceItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TrustAssessment(BaseModel):
    """Separate trust evaluation distinguishing identity/provenance from risk."""

    scan_id: str
    trust_score: float = Field(..., ge=0.0, le=100.0, description="0=untrusted/tampered, 100=cryptographically verified")
    trust_level: TrustLevelEnum
    confidence: ConfidenceEnum
    confidence_score: float
    integrity_status: IntegrityStatusEnum
    risk_level: VerdictLevel
    risk_score: float
    evidence: list[TrustEvidenceItem] = Field(default_factory=list)
    summary: str = Field(..., description="Clear explanation of trust assessment vs risk")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HashDigest(BaseModel):
    """Cryptographic file hashes."""

    md5: str | None = Field(default=None, description="MD5 hex digest (legacy)")
    sha1: str | None = Field(default=None, description="SHA-1 hex digest (legacy)")
    sha256: str = Field(..., description="Primary SHA-256 hex digest")
    sha512: str | None = Field(default=None, description="SHA-512 hex digest")
    ssdeep: str | None = Field(default=None, description="Fuzzy SSDEEP hash")


class FileTypeInfo(BaseModel):
    """Detected file type metadata."""

    type: FileTypeEnum = Field(..., description="Normalized file format")
    mime: str = Field(..., description="MIME type identifier")
    description: str = Field(..., description="Human-readable format description")
    is_supported: bool = Field(..., description="True if format has dedicated analyzer")
    extension_mismatch: bool = Field(
        default=False, description="True if file extension differs from magic bytes"
    )


class Finding(BaseModel):
    """Normalized security finding or forensic observation."""

    id: str = Field(..., description="Unique finding identifier (e.g. FIND-PE-001)")
    category: str = Field(
        ..., description="Finding category (e.g. STRUCTURE, ENTROPY, SUSPICIOUS_API, EVASION)"
    )
    title: str = Field(..., description="Short finding title")
    description: str = Field(..., description="Detailed explanation of observation")
    severity: SeverityEnum = Field(..., description="Security severity")
    confidence: ConfidenceEnum = Field(..., description="Analytic confidence")
    evidence: dict[str, Any] = Field(
        default_factory=dict, description="Observed structural evidence"
    )
    source_engine: str = Field(..., description="Originating scanner sub-engine")
    weight: float = Field(default=0.0, description="Risk weight contribution")
    recommendation: str | None = Field(None, description="Actionable analyst recommendation")
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Supplementary engine metadata"
    )


# Alias for backwards compatibility
EvidenceItem = Finding


class Capability(BaseModel):
    """Standardized behavioral capability indicator."""

    capability: str = Field(
        ..., description="Capability name (e.g. process_injection_indicator, network_communication)"
    )
    status: CapabilityStatusEnum = Field(..., description="Detection status")
    confidence: ConfidenceEnum = Field(
        default=ConfidenceEnum.MEDIUM, description="Confidence in indicator"
    )
    evidence: list[str] = Field(
        default_factory=list, description="Supporting static evidence observations"
    )


class MLPrediction(BaseModel):
    """Probabilistic output from machine learning inference."""

    model_name: str = Field(..., description="Model identifier")
    model_version: str = Field(..., description="Model release version")
    prediction: str = Field(..., description="Classification prediction")
    probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated risk probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in prediction")
    features_used: list[str] = Field(default_factory=list, description="Features evaluated")
    inference_time_ms: float = Field(default=0.0, description="Inference latency in milliseconds")
    status: EngineStatusEnum = Field(
        default=EngineStatusEnum.NOT_CONFIGURED, description="Engine status"
    )


class ScanFileMetadata(BaseModel):
    """Basic file metadata in scan result."""

    name: str
    size: int
    sha256: str
    type: str
    mime: str


class ScanVerdict(BaseModel):
    """Consolidated risk score, categorical level, and calibrated confidence."""

    level: VerdictLevel
    score: float = Field(..., ge=0.0, le=100.0)
    confidence: ConfidenceEnum = Field(
        default=ConfidenceEnum.HIGH, description="Overall analytic confidence level"
    )
    confidence_score: float = Field(
        default=0.95, ge=0.0, le=1.0, description="Calibrated numeric confidence"
    )
    category_scores: dict[str, float | None] = Field(default_factory=dict)


class RiskAssessment(BaseModel):
    """Consolidated risk assessment (compatible format)."""

    overall_score: float = Field(..., ge=0.0, le=100.0)
    verdict: VerdictEnum
    confidence: float = Field(..., ge=0.0, le=1.0)
    deterministic_override: bool = False
    engine_scores: dict[str, float] = Field(default_factory=dict)


class MerkleProof(BaseModel):
    """Cryptographic Merkle tree inclusion proof."""

    leaf_hash: str
    root_hash: str
    proof_hashes: list[str]
    index: int


class IntegrityProof(BaseModel):
    """Container for complete integrity proof."""

    merkle_proof: MerkleProof
    signature_verified: bool = False
    signer_identity: str | None = None
    blockchain_anchored: bool = False


class ProvenanceRecord(BaseModel):
    """Tamper-evident audit record."""

    record_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    file_sha256: str
    verdict: VerdictEnum
    evidence_merkle_root: str
    anchored_to_blockchain: bool = False
    blockchain_tx_hash: str | None = None


class ScanResponse(BaseModel):
    """Unified, structured scan result output matching user specification."""

    scan_id: str
    user_id: str | None = Field(default=None, description="Owner user ID if authenticated")
    status: str = Field(
        default="completed", description="Analysis status (completed, limited, failed)"
    )
    file: ScanFileMetadata
    verdict: ScanVerdict
    engines: dict[str, str]
    findings: list[Finding] = Field(default_factory=list)
    capabilities: list[Capability] = Field(default_factory=list)
    signature_info: DigitalSignatureInfo | None = Field(
        default=None, description="Digital signature verification metadata"
    )
    integrity_summary: FileIntegrityReport | None = Field(
        default=None, description="Cryptographic integrity and trust summary"
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class ScanResult(BaseModel):
    """Full comprehensive internal scan report."""

    scan_id: str
    user_id: str | None = Field(default=None, description="Owner user ID if authenticated")
    status: str = Field(
        default="completed", description="Scan operational status (completed, limited, failed)"
    )
    filename: str
    file_size_bytes: int
    mime_type: str
    magic_bytes: str
    file_type: FileTypeInfo
    hashes: HashDigest
    evidence: list[Finding] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    capabilities: list[Capability] = Field(default_factory=list)
    signature_info: DigitalSignatureInfo | None = Field(
        default=None, description="Digital signature analysis results"
    )
    integrity: FileIntegrityReport | None = Field(
        default=None, description="Cryptographic integrity and trust assessment"
    )
    engines: dict[str, EngineStatusEnum] = Field(default_factory=dict)
    risk_verdict: ScanVerdict
    risk_assessment: RiskAssessment | None = None
    provenance: ProvenanceRecord | None = None
    diagnostics: dict[str, Any] = Field(default_factory=dict)
    scanned_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def to_response(self) -> ScanResponse:
        """Convert internal ScanResult to public ScanResponse specification."""
        return ScanResponse(
            scan_id=self.scan_id,
            user_id=self.user_id,
            status=self.status,
            file=ScanFileMetadata(
                name=self.filename,
                size=self.file_size_bytes,
                sha256=self.hashes.sha256,
                type=self.file_type.type.value,
                mime=self.mime_type,
            ),
            verdict=self.risk_verdict,
            engines={
                k: (v.value if isinstance(v, EngineStatusEnum) else str(v))
                for k, v in self.engines.items()
            },
            findings=self.findings,
            capabilities=self.capabilities,
            signature_info=self.signature_info,
            integrity_summary=self.integrity,
            metadata={
                "magic_bytes": self.magic_bytes,
                "scanned_at": self.scanned_at.isoformat(),
                "diagnostics": self.diagnostics,
            },
        )


# ==============================================================================
# Authentication & User Profile Models
# ==============================================================================


class UserContext(BaseModel):
    """Authenticated user context extracted from JWT."""

    user_id: str = Field(..., description="Unique user ID (UUID)")
    email: str | None = Field(default=None, description="User email address")
    role: str = Field(default="user", description="Authorization role (user, analyst, admin)")


class UserProfile(BaseModel):
    """User profile record."""

    id: str = Field(..., description="User unique ID")
    email: str = Field(..., description="User email address")
    display_name: str = Field(..., description="Public display name")
    role: str = Field(default="user", description="Account role")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LoginRequest(BaseModel):
    """User authentication login payload."""

    email: str = Field(..., description="User email")
    password: str = Field(..., description="Plaintext password for verification")


class SignupRequest(BaseModel):
    """New user account creation payload."""

    email: str = Field(..., description="User email")
    password: str = Field(..., description="Desired account password")
    display_name: str | None = Field(default=None, description="Optional public display name")


class TokenResponse(BaseModel):
    """JWT bearer token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type (bearer)")
    user: UserProfile = Field(..., description="Authenticated user profile")


# ==============================================================================
# Reconnaissance (Recon) Models
# ==============================================================================


class DnsRecord(BaseModel):
    """Extracted public DNS record."""

    record_type: str = Field(..., description="DNS record type (A, AAAA, MX, NS, TXT)")
    value: str = Field(..., description="DNS record resolved value")
    ttl: int | None = Field(default=None, description="TTL in seconds")


class TlsCertificateInfo(BaseModel):
    """Public TLS/HTTPS certificate metadata."""

    subject: str = Field(..., description="Certificate subject DN")
    issuer: str = Field(..., description="Certificate issuer DN")
    san: list[str] = Field(default_factory=list, description="Subject Alternative Names")
    valid_from: str | None = Field(default=None, description="Validity start")
    valid_to: str | None = Field(default=None, description="Validity expiry")
    cipher_suite: str | None = Field(default=None, description="Negotiated cipher suite")
    tls_version: str | None = Field(default=None, description="Negotiated TLS protocol version")
    is_expired: bool = Field(default=False, description="True if certificate has expired")


class HttpSecurityHeaders(BaseModel):
    """Analysis of HTTP/HTTPS defense-in-depth headers."""

    hsts: bool = Field(default=False, description="Strict-Transport-Security present")
    csp: bool = Field(default=False, description="Content-Security-Policy present")
    x_frame_options: str | None = Field(default=None, description="X-Frame-Options value")
    x_content_type_options: bool = Field(default=False, description="nosniff present")
    referrer_policy: str | None = Field(default=None, description="Referrer-Policy header")
    raw_headers: dict[str, str] = Field(default_factory=dict, description="Captured headers")


class ReconAsset(BaseModel):
    """Publicly exposed digital asset."""

    id: str = Field(..., description="Asset identifier")
    hostname: str = Field(..., description="Domain or hostname")
    asset_type: str = Field(..., description="Asset category (DOMAIN, IP, NAMESERVER, MAILSERVER)")
    source: str = Field(..., description="Data source (DNS, TLS, HTTP)")
    status: str = Field(default="ACTIVE", description="Asset operational status")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Observed asset metadata")
    observed_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Observation timestamp")


class ReconFinding(BaseModel):
    """Security exposure observation discovered during passive recon."""

    id: str = Field(..., description="Finding identifier (e.g. RECON-TLS-001)")
    category: str = Field(..., description="Exposure category (DNS, TLS, HEADERS, EXPOSURE)")
    title: str = Field(..., description="Short finding summary")
    severity: SeverityEnum = Field(..., description="Severity level")
    confidence: ConfidenceEnum = Field(..., description="Analytic confidence")
    evidence: dict[str, Any] = Field(default_factory=dict, description="Observed structural evidence")
    recommendation: str = Field(..., description="Remediation guidance")
    source: str = Field(default="RECON", description="Observation source (e.g. DNS, TLS, HEADERS, ROBOTS)")
    observed_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Observation timestamp")


class ReconScanRequest(BaseModel):
    """Defensive reconnaissance scan request."""

    target: str = Field(..., description="Target domain or hostname (e.g. example.com)")
    authorization_confirmed: bool = Field(
        default=False,
        description="User confirmation of assessment authorization for defensive reconnaissance",
    )
    target_type: str = Field(default="DOMAIN", description="Target type (DOMAIN, HOSTNAME, IP_ADDRESS)")


class ReconScanResponse(BaseModel):
    """Completed defensive reconnaissance scan report."""

    id: str = Field(..., description="Recon scan identifier")
    user_id: str | None = Field(default=None, description="Owner user ID")
    target: str = Field(..., description="Scanned target hostname")
    target_type: str = Field(default="DOMAIN", description="Target classification")
    authorization_confirmed: bool = Field(default=True, description="Authorization state")
    status: str = Field(..., description="Scan status (COMPLETED, FAILED, LIMITED)")
    exposure_score: float = Field(..., description="Calculated exposure score (0.0=minimal, 100.0=critical)")
    exposure_level: VerdictLevel = Field(..., description="Exposure level assessment")
    confidence: ConfidenceEnum = Field(default=ConfidenceEnum.HIGH, description="Overall scan confidence")
    confidence_score: float = Field(default=0.90, description="Confidence score 0.0 to 1.0")
    dns_records: list[DnsRecord] = Field(default_factory=list, description="Resolved DNS records")
    tls_info: TlsCertificateInfo | None = Field(default=None, description="TLS certificate metadata")
    security_headers: HttpSecurityHeaders | None = Field(
        default=None, description="HTTP security headers evaluation"
    )
    assets: list[ReconAsset] = Field(default_factory=list, description="Discovered infrastructure assets")
    findings: list[ReconFinding] = Field(default_factory=list, description="Exposure findings")
    technologies: list[dict[str, Any]] = Field(
        default_factory=list, description="Passively observed web technologies and banners"
    )
    rdap_info: dict[str, Any] | None = Field(
        default=None, description="Passive domain registration/RDAP information"
    )
    cached: bool = Field(default=False, description="True if response was served from cache")
    limitations: list[str] = Field(
        default_factory=list, description="Documented operational limitations during scan"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = Field(default=None)


# ==============================================================================
# Quantum Trust Simulation Models (SIH Key Differentiator)
# ==============================================================================


class QuantumScenarioEnum(str, Enum):
    """Controlled quantum-channel simulation scenarios."""

    LEGITIMATE = "LEGITIMATE"
    FORGERY = "FORGERY"
    REPLAY = "REPLAY"
    IMPERSONATION = "IMPERSONATION"
    CHANNEL_MANIPULATION = "CHANNEL_MANIPULATION"


class QuantumSimulationRequest(BaseModel):
    """Quantum trust simulation execution request."""

    scenario: QuantumScenarioEnum = Field(
        default=QuantumScenarioEnum.LEGITIMATE, description="Simulation attack/baseline scenario"
    )
    qubits: int = Field(default=2, ge=2, le=8, description="Number of simulated entangled qubits")
    shots: int = Field(default=1024, ge=128, le=8192, description="Number of projective measurements")
    noise_level: float = Field(default=0.0, ge=0.0, le=1.0, description="Simulated channel noise probability")


class QuantumSimulationResponse(BaseModel):
    """Quantum trust simulation measurement and threat verdict."""

    id: str = Field(..., description="Unique simulation execution ID")
    user_id: str | None = Field(default=None, description="Owner user ID")
    scenario: QuantumScenarioEnum = Field(..., description="Evaluated quantum scenario")
    is_simulated: bool = Field(default=True, description="Always True: explicitly declares simulation")
    environment_badge: str = Field(
        default="SIMULATED QUANTUM ENVIRONMENT", description="Mandatory environment disclaimer"
    )
    expected_distribution: dict[str, float] = Field(
        ..., description="Theoretical Bell-state probability distribution"
    )
    observed_distribution: dict[str, float] = Field(
        ..., description="Simulated measurement outcomes from channel"
    )
    deviation: float = Field(..., description="Statistical distance (total variation / trace distance)")
    threshold: float = Field(..., description="Tolerance threshold for channel disturbance")
    verdict: str = Field(..., description="Threat verdict: ATTACK DETECTED or NO ATTACK DETECTED")
    explanation: str = Field(..., description="Transparent mathematical and physical explanation")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ==============================================================================
# Security Reports Models
# ==============================================================================


class ReportTypeEnum(str, Enum):
    """Security report classification."""

    EXECUTIVE = "EXECUTIVE"
    TECHNICAL = "TECHNICAL"
    FORENSIC = "FORENSIC"
    COMPLIANCE = "COMPLIANCE"
    EXECUTIVE_SUMMARY = "EXECUTIVE_SUMMARY"
    EXECUTIVE_AUDIT = "EXECUTIVE_AUDIT"
    TECHNICAL_DEEP_DIVE = "TECHNICAL_DEEP_DIVE"
    CRYPTOGRAPHIC_ANALYSIS = "CRYPTOGRAPHIC_ANALYSIS"
    FULL_SECURITY_AUDIT = "FULL_SECURITY_AUDIT"
    COMPLIANCE_CERTIFICATE = "COMPLIANCE_CERTIFICATE"


class ReportRequest(BaseModel):
    """Payload to generate a consolidated security report."""

    scan_id: str | None = Field(default=None, description="File scan ID to include")
    recon_id: str | None = Field(default=None, description="Recon scan ID to include")
    quantum_id: str | None = Field(default=None, description="Quantum simulation ID to include")
    report_type: ReportTypeEnum = Field(
        default=ReportTypeEnum.TECHNICAL, description="Target report format and audience"
    )


class ReportResponse(BaseModel):
    """Consolidated multi-engine security report."""

    id: str = Field(..., description="Unique report ID")
    user_id: str | None = Field(default=None, description="Owner user ID")
    scan_id: str | None = Field(default=None)
    recon_id: str | None = Field(default=None)
    quantum_id: str | None = Field(default=None)
    report_type: ReportTypeEnum = Field(..., description="Report category")
    title: str = Field(..., description="Report title")
    summary: str = Field(..., description="Executive summary of posture")
    content: dict[str, Any] = Field(..., description="Full structured audit sections")
    report_hash: str | None = Field(default=None, description="Cryptographic SHA-256 integrity hash")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
