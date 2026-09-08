"""Canonical domain models and data contracts for NeuroCraft."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class VerdictEnum(str, Enum):
    """Categorical security verdict."""
    CLEAN = "CLEAN"
    SUSPICIOUS = "SUSPICIOUS"
    MALICIOUS = "MALICIOUS"
    UNKNOWN = "UNKNOWN"


class SeverityEnum(str, Enum):
    """Severity of an evidence item."""
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HashDigest(BaseModel):
    """Cryptographic file hashes."""
    md5: str = Field(..., description="MD5 hex digest")
    sha1: str = Field(..., description="SHA-1 hex digest")
    sha256: str = Field(..., description="SHA-256 hex digest")
    sha512: Optional[str] = Field(None, description="SHA-512 hex digest")
    ssdeep: Optional[str] = Field(None, description="Fuzzy SSDEEP hash")


class EvidenceItem(BaseModel):
    """Individual forensic observation from a scanner engine."""
    id: str = Field(..., description="Unique evidence identifier")
    engine: str = Field(..., description="Engine that generated this evidence (e.g. yara, clamav, pe_parser)")
    rule_or_check_name: str = Field(..., description="Name of rule or heuristic check")
    severity: SeverityEnum = Field(default=SeverityEnum.INFO)
    description: str = Field(..., description="Human-readable description of observation")
    offset: Optional[int] = Field(None, description="Byte offset in file if applicable")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Arbitrary engine metadata")


class MLPrediction(BaseModel):
    """Probabilistic output from machine learning inference."""
    model_id: str = Field(..., description="Model identifier")
    model_version: str = Field(..., description="Model release version")
    probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated risk probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in prediction")
    is_uncertain: bool = Field(default=False, description="True if prediction falls in uncertainty band")
    top_contributing_features: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Top features influencing this prediction"
    )


class RiskAssessment(BaseModel):
    """Consolidated risk assessment synthesized by the risk engine."""
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Consolidated risk score (0-100)")
    verdict: VerdictEnum = Field(..., description="Final categorical assessment")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence level")
    deterministic_override: bool = Field(default=False, description="True if a hard signature overrode ML")
    engine_scores: dict[str, float] = Field(
        default_factory=dict,
        description="Individual score contributions by engine"
    )


class MerkleProof(BaseModel):
    """Cryptographic Merkle tree inclusion proof."""
    leaf_hash: str
    root_hash: str
    proof_hashes: list[str]
    index: int


class IntegrityProof(BaseModel):
    """Container for complete integrity proof and optional anchoring."""
    merkle_proof: MerkleProof
    signature_verified: bool = False
    signer_identity: Optional[str] = None
    blockchain_anchored: bool = False



class ProvenanceRecord(BaseModel):
    """Tamper-evident audit record."""
    record_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    file_sha256: str
    verdict: VerdictEnum
    evidence_merkle_root: str
    anchored_to_blockchain: bool = False
    blockchain_tx_hash: Optional[str] = None


class ScanResult(BaseModel):
    """Comprehensive analysis report for an examined artifact."""
    scan_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    magic_bytes: str
    hashes: HashDigest
    evidence: list[EvidenceItem] = Field(default_factory=list)
    ml_prediction: Optional[MLPrediction] = None
    risk_assessment: RiskAssessment
    provenance: Optional[ProvenanceRecord] = None
    scanned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
