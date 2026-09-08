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


class HashDigest(BaseModel):
    """Cryptographic file hashes."""

    md5: str | None = Field(None, description="MD5 hex digest (legacy)")
    sha1: str | None = Field(None, description="SHA-1 hex digest (legacy)")
    sha256: str = Field(..., description="Primary SHA-256 hex digest")
    sha512: str | None = Field(None, description="SHA-512 hex digest")
    ssdeep: str | None = Field(None, description="Fuzzy SSDEEP hash")


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
    """Consolidated risk score and level."""

    level: VerdictLevel
    score: float = Field(..., ge=0.0, le=100.0)
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
    file: ScanFileMetadata
    verdict: ScanVerdict
    engines: dict[str, str]
    findings: list[Finding] = Field(default_factory=list)
    capabilities: list[Capability] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ScanResult(BaseModel):
    """Full comprehensive internal scan report."""

    scan_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    magic_bytes: str
    file_type: FileTypeInfo
    hashes: HashDigest
    evidence: list[Finding] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    capabilities: list[Capability] = Field(default_factory=list)
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
            metadata={
                "magic_bytes": self.magic_bytes,
                "scanned_at": self.scanned_at.isoformat(),
                "diagnostics": self.diagnostics,
            },
        )
