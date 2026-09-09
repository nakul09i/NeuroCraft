"""Database models and asynchronous persistence layer for NeuroCraft."""

import json
import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from neurocraft_config import get_config
from neurocraft_types import (
    ConfidenceEnum,
    QuantumSimulationResponse,
    ReconScanResponse,
    ReportResponse,
    ScanResult,
    UserProfile,
)
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    select,
)
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, selectinload


class Base(DeclarativeBase):
    pass


# ==============================================================================
# 1. User Profiles Table
# ==============================================================================


class ProfileRecord(Base):
    """User profile record mapped to authentication identities."""

    __tablename__ = "profiles"

    id = Column(String(64), primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable when Supabase Auth manages passwords
    display_name = Column(String(120), nullable=False)
    role = Column(String(30), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    scans = relationship("ScanRecord", back_populates="user", cascade="all, delete-orphan")
    recon_scans = relationship("ReconScanRecord", back_populates="user", cascade="all, delete-orphan")
    quantum_simulations = relationship(
        "QuantumSimulationRecord", back_populates="user", cascade="all, delete-orphan"
    )
    reports = relationship("ReportRecord", back_populates="user", cascade="all, delete-orphan")
    sync_items = relationship("SyncQueueRecord", back_populates="user", cascade="all, delete-orphan")


# ==============================================================================
# 2. File Scans, Findings, and Capabilities
# ==============================================================================


class ScanRecord(Base):
    """Database record for an analysis scan."""

    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    sha256 = Column(String(64), index=True, nullable=False)
    filename = Column(String(255), index=True, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(120), nullable=False)
    file_type = Column(String(50), nullable=False)
    status = Column(String(30), default="completed", index=True, nullable=False)
    risk_level = Column(String(20), index=True, nullable=False)
    risk_score = Column(Float, index=True, nullable=False)
    confidence = Column(String(20), default="HIGH", nullable=False)
    engine_status_json = Column(Text, nullable=False)
    raw_result_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user = relationship("ProfileRecord", back_populates="scans")
    findings = relationship("FindingRecord", back_populates="scan", cascade="all, delete-orphan")
    capabilities = relationship(
        "CapabilityRecord", back_populates="scan", cascade="all, delete-orphan"
    )
    integrity = relationship(
        "FileIntegrityRecord", back_populates="scan", uselist=False, cascade="all, delete-orphan"
    )


class FindingRecord(Base):
    """Normalized security findings."""

    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id"), index=True, nullable=False)
    finding_id = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    severity = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    source_engine = Column(String(64), nullable=False)
    weight = Column(Float, default=0.0, nullable=False)
    evidence_json = Column(Text, default="{}")

    scan = relationship("ScanRecord", back_populates="findings")


class CapabilityRecord(Base):
    """Behavioral capability indicators."""

    __tablename__ = "capabilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id"), index=True, nullable=False)
    capability = Column(String(64), nullable=False)
    status = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    evidence_json = Column(Text, default="[]")

    scan = relationship("ScanRecord", back_populates="capabilities")


class FileIntegrityRecord(Base):
    """Cryptographic file integrity, digital signature, and trust assessment."""

    __tablename__ = "file_integrity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    sha256 = Column(String(64), nullable=False)
    sha512 = Column(String(128), nullable=True)
    sha1 = Column(String(40), nullable=True)
    reference_hash = Column(String(128), nullable=True)
    hash_match_status = Column(String(30), nullable=False)
    signature_status = Column(String(30), nullable=False)
    signer = Column(String(255), nullable=True)
    issuer = Column(String(255), nullable=True)
    certificate_valid = Column(Boolean, nullable=True)
    integrity_status = Column(String(30), nullable=False)
    trust_score = Column(Float, nullable=False)
    confidence = Column(String(20), default="HIGH", nullable=False)
    confidence_score = Column(Float, default=0.90, nullable=False)
    evidence_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)

    scan = relationship("ScanRecord", back_populates="integrity")


# ==============================================================================
# 3. Defensive Passive Reconnaissance Tables
# ==============================================================================


class ReconScanRecord(Base):
    """Defensive reconnaissance scan audit record."""

    __tablename__ = "recon_scans"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    target = Column(String(255), index=True, nullable=False)
    target_type = Column(String(30), default="DOMAIN", nullable=False)
    authorization_confirmed = Column(Boolean, default=False, nullable=False)
    status = Column(String(30), nullable=False)
    exposure_score = Column(Float, nullable=False)
    exposure_level = Column(String(20), nullable=False)
    confidence = Column(String(20), default="HIGH", nullable=False)
    confidence_score = Column(Float, default=0.90, nullable=False)
    dns_json = Column(Text, default="[]")
    tls_json = Column(Text, default="{}")
    headers_json = Column(Text, default="{}")
    tech_json = Column(Text, default="[]")
    rdap_json = Column(Text, default="{}")
    limitations_json = Column(Text, default="[]")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("ProfileRecord", back_populates="recon_scans")
    assets = relationship(
        "ReconAssetRecord", back_populates="recon_scan", cascade="all, delete-orphan"
    )
    findings = relationship(
        "ReconFindingRecord", back_populates="recon_scan", cascade="all, delete-orphan"
    )


class ReconAssetRecord(Base):
    """Publicly exposed infrastructure assets."""

    __tablename__ = "recon_assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String(64), nullable=False)
    recon_scan_id = Column(String(64), ForeignKey("recon_scans.id"), index=True, nullable=False)
    hostname = Column(String(255), nullable=False)
    asset_type = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    status = Column(String(30), default="ACTIVE")
    metadata_json = Column(Text, default="{}")
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    recon_scan = relationship("ReconScanRecord", back_populates="assets")


class ReconFindingRecord(Base):
    """Reconnaissance exposure findings."""

    __tablename__ = "recon_findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    finding_id = Column(String(64), nullable=False)
    recon_scan_id = Column(String(64), ForeignKey("recon_scans.id"), index=True, nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    evidence_json = Column(Text, default="{}")
    recommendation = Column(Text, nullable=False)
    source = Column(String(50), default="RECON")
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    recon_scan = relationship("ReconScanRecord", back_populates="findings")


# ==============================================================================
# 4. Quantum Trust Simulation Tables (SIH Key Differentiator)
# ==============================================================================


class QuantumSimulationRecord(Base):
    """Quantum trust simulation execution audit trail."""

    __tablename__ = "quantum_simulations"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    scenario = Column(String(50), nullable=False)
    qubits = Column(Integer, default=2)
    shots = Column(Integer, default=1024)
    noise_level = Column(Float, default=0.0)
    expected_distribution_json = Column(Text, nullable=False)
    observed_distribution_json = Column(Text, nullable=False)
    deviation = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    verdict = Column(String(50), nullable=False)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)

    user = relationship("ProfileRecord", back_populates="quantum_simulations")


# ==============================================================================
# 5. Security Reports Table
# ==============================================================================


class ReportRecord(Base):
    """Consolidated security report records."""

    __tablename__ = "reports"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id"), nullable=True)
    recon_id = Column(String(64), ForeignKey("recon_scans.id"), nullable=True)
    quantum_id = Column(String(64), ForeignKey("quantum_simulations.id"), nullable=True)
    report_type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    content_json = Column(Text, nullable=False)
    report_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)

    user = relationship("ProfileRecord", back_populates="reports")


# ==============================================================================
# 6. Local Settings Table
# ==============================================================================


class SettingRecord(Base):
    """Local user preferences and configuration settings."""

    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    value_json = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user = relationship("ProfileRecord")


# ==============================================================================
# 7. Persistent Local Sync Queue Table
# ==============================================================================


class SyncQueueRecord(Base):
    """Persistent local synchronization queue for offline-first replication to cloud."""

    __tablename__ = "sync_queue"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id", ondelete="CASCADE"), index=True, nullable=True)
    entity_type = Column(String(50), index=True, nullable=False)  # "scan", "report", "setting", "integrity"
    entity_id = Column(String(64), index=True, nullable=False)
    operation = Column(String(20), default="CREATE", nullable=False)  # "CREATE", "UPDATE", "DELETE"
    payload_json = Column(Text, nullable=True)
    status = Column(String(20), default="PENDING", index=True, nullable=False)  # PENDING, SYNCING, SYNCED, FAILED, RETRYING
    attempt_count = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("ProfileRecord", back_populates="sync_items")


# ==============================================================================
# Engine & Session Management
# ==============================================================================

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_db_url() -> str:
    """Resolve database URL. Defaults to local SQLite for student/free-first development."""
    cfg = get_config()
    url = cfg.database_url
    is_serverless = bool(
        os.getenv("VERCEL")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("LAMBDA_TASK_ROOT")
    )
    if is_serverless and ("./" in url or (url.startswith("sqlite") and "/tmp" not in url)):  # noqa: S108
        return "sqlite+aiosqlite:////tmp/neurocraft.db"  # noqa: S108

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite://"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    elif not url:
        scratch_db = Path("./scratch/neurocraft.db").resolve()
        scratch_db.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite+aiosqlite:///{scratch_db}"
    return url


def get_engine() -> AsyncEngine:
    """Retrieve or construct the asynchronous SQLAlchemy engine."""
    global _engine
    if _engine is None:
        db_url = get_db_url()
        _engine = create_async_engine(db_url, echo=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve or construct the async sessionmaker."""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    return _session_factory


async def init_db(custom_url: str | None = None) -> None:
    """Initialize database tables safely without data loss."""
    global _engine, _session_factory
    if custom_url:
        _engine = create_async_engine(custom_url, echo=False)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
    engine = _engine if _engine is not None else get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        from neurocraft_api.migrations.runner import run_migrations
        await run_migrations(engine)
    except Exception:
        pass


async def close_db() -> None:
    """Cleanly dispose database engine connections on application shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency generator for FastAPI routes injecting an AsyncSession."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ==============================================================================
# Persistence Helper Functions
# ==============================================================================


async def save_profile(profile: UserProfile, password_hash: str | None = None) -> ProfileRecord:
    """Save or update user profile."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = await session.get(ProfileRecord, profile.id)
        if rec:
            rec.display_name = profile.display_name
            rec.role = profile.role
            rec.updated_at = datetime.now(UTC)
            if password_hash:
                rec.password_hash = password_hash
        else:
            rec = ProfileRecord(
                id=profile.id,
                email=profile.email,
                password_hash=password_hash,
                display_name=profile.display_name,
                role=profile.role,
                created_at=profile.created_at,
                updated_at=profile.updated_at,
            )
            session.add(rec)
        await session.commit()
        await session.refresh(rec)
        return rec


async def get_profile_by_id(user_id: str) -> ProfileRecord | None:
    """Fetch user profile by user_id."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ProfileRecord).where(ProfileRecord.id == user_id)
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_profile_by_email(email: str) -> ProfileRecord | None:
    """Fetch user profile by email."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ProfileRecord).where(ProfileRecord.email == email.lower().strip())
        res = await session.execute(stmt)
        return res.scalars().first()


async def save_scan_result(result: ScanResult, user_id: str | None = None) -> ScanRecord:
    """Persist scan results, findings, and capabilities to database."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        scan_rec = ScanRecord(
            scan_id=result.scan_id,
            user_id=user_id or result.user_id,
            sha256=result.hashes.sha256,
            filename=result.filename,
            file_size_bytes=result.file_size_bytes,
            mime_type=result.mime_type,
            file_type=result.file_type.type.value,
            status=result.status,
            risk_level=result.risk_verdict.level.value,
            risk_score=result.risk_verdict.score,
            confidence=result.risk_verdict.confidence.value,
            engine_status_json=json.dumps(
                {k: (v.value if hasattr(v, "value") else str(v)) for k, v in result.engines.items()}
            ),
            raw_result_json=result.model_dump_json(),
            created_at=result.scanned_at,
            updated_at=datetime.now(UTC),
        )
        session.add(scan_rec)

        for finding in result.findings:
            f_rec = FindingRecord(
                scan_id=result.scan_id,
                finding_id=finding.id,
                category=finding.category,
                title=finding.title,
                description=finding.description or "",
                severity=finding.severity.value,
                confidence=finding.confidence.value,
                source_engine=finding.source_engine,
                weight=finding.weight or 0.0,
                evidence_json=json.dumps(finding.evidence),
            )
            session.add(f_rec)

        for cap in result.capabilities:
            c_rec = CapabilityRecord(
                scan_id=result.scan_id,
                capability=cap.capability,
                status=cap.status.value,
                confidence=cap.confidence.value,
                evidence_json=json.dumps(cap.evidence),
            )
            session.add(c_rec)

        if result.integrity:
            leaf_cert = (
                result.integrity.signature_info.certificates[0]
                if result.integrity.signature_info and result.integrity.signature_info.certificates
                else None
            )
            cert_valid = not leaf_cert.is_expired if leaf_cert else None
            signer = result.integrity.signature_info.signer_name if result.integrity.signature_info else None
            issuer = result.integrity.signature_info.issuer_name if result.integrity.signature_info else None

            int_rec = FileIntegrityRecord(
                scan_id=result.scan_id,
                sha256=result.integrity.sha256,
                sha512=result.integrity.sha512,
                sha1=result.integrity.sha1,
                reference_hash=result.integrity.reference_hash,
                hash_match_status=result.integrity.hash_match_status.value,
                signature_status=(
                    result.integrity.signature_info.status.value
                    if result.integrity.signature_info
                    else "UNSIGNED"
                ),
                signer=signer,
                issuer=issuer,
                certificate_valid=cert_valid,
                integrity_status=result.integrity.integrity_status.value,
                trust_score=result.integrity.trust_score,
                confidence=result.integrity.confidence.value,
                confidence_score=result.integrity.confidence_score,
                evidence_json=json.dumps([e.model_dump() for e in result.integrity.evidence]),
                created_at=result.integrity.created_at,
            )
            session.add(int_rec)

        await session.commit()
        await session.refresh(scan_rec)
        return scan_rec


async def get_file_integrity_by_scan_id(scan_id: str) -> FileIntegrityRecord | None:
    """Fetch file integrity and trust record for a scan."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(FileIntegrityRecord).where(FileIntegrityRecord.scan_id == scan_id)
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_scan_by_id(scan_id: str) -> ScanRecord | None:
    """Retrieve scan record by unique scan_id."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ScanRecord).where(ScanRecord.scan_id == scan_id)
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_scan_by_id_and_user(scan_id: str, user_id: str | None) -> ScanRecord | None:
    """Retrieve scan record enforcing user ownership."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ScanRecord).where(ScanRecord.scan_id == scan_id)
        if user_id is not None:
            stmt = stmt.where((ScanRecord.user_id == user_id) | (ScanRecord.user_id.is_(None)))
        else:
            stmt = stmt.where(ScanRecord.user_id.is_(None))
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_scans_for_user(user_id: str | None = None, limit: int = 50) -> list[ScanRecord]:
    """Retrieve recent scans filtered by user."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ScanRecord).order_by(ScanRecord.created_at.desc()).limit(limit)
        if user_id:
            stmt = stmt.where(ScanRecord.user_id == user_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def save_recon_scan(recon: ReconScanResponse, user_id: str | None = None) -> ReconScanRecord:
    """Persist defensive reconnaissance scan report to database."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        scan_rec = ReconScanRecord(
            id=recon.id,
            user_id=user_id or recon.user_id,
            target=recon.target,
            target_type=getattr(recon, "target_type", "DOMAIN"),
            authorization_confirmed=getattr(recon, "authorization_confirmed", True),
            status=recon.status,
            exposure_score=recon.exposure_score,
            exposure_level=recon.exposure_level.value,
            confidence=getattr(recon, "confidence", ConfidenceEnum.HIGH).value
            if hasattr(getattr(recon, "confidence", None), "value")
            else str(getattr(recon, "confidence", "HIGH")),
            confidence_score=getattr(recon, "confidence_score", 0.90),
            dns_json=json.dumps([d.model_dump() for d in recon.dns_records]),
            tls_json=json.dumps(recon.tls_info.model_dump()) if recon.tls_info else None,
            headers_json=(
                json.dumps(recon.security_headers.model_dump())
                if recon.security_headers
                else None
            ),
            tech_json=json.dumps(getattr(recon, "technologies", [])),
            rdap_json=json.dumps(getattr(recon, "rdap_info", {}) or {}),
            limitations_json=json.dumps(getattr(recon, "limitations", [])),
            created_at=recon.created_at,
            completed_at=recon.completed_at,
        )
        session.add(scan_rec)

        for asset in recon.assets:
            a_rec = ReconAssetRecord(
                asset_id=asset.id,
                recon_scan_id=recon.id,
                hostname=asset.hostname,
                asset_type=asset.asset_type,
                source=asset.source,
                status=asset.status,
                metadata_json=json.dumps(asset.metadata),
                observed_at=getattr(asset, "observed_at", datetime.now(UTC)),
            )
            session.add(a_rec)

        for finding in recon.findings:
            f_rec = ReconFindingRecord(
                finding_id=finding.id,
                recon_scan_id=recon.id,
                category=finding.category,
                title=finding.title,
                severity=finding.severity.value,
                confidence=finding.confidence.value,
                evidence_json=json.dumps(finding.evidence),
                recommendation=finding.recommendation,
                source=getattr(finding, "source", "RECON"),
                observed_at=getattr(finding, "observed_at", datetime.now(UTC)),
            )
            session.add(f_rec)

        await session.commit()
        await session.refresh(scan_rec)
        return scan_rec


async def get_recon_scan_by_id(recon_id: str, user_id: str | None = None) -> ReconScanRecord | None:
    """Retrieve reconnaissance scan record enforcing user isolation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = (
            select(ReconScanRecord)
            .options(
                selectinload(ReconScanRecord.assets),
                selectinload(ReconScanRecord.findings),
            )
            .where(ReconScanRecord.id == recon_id)
        )
        if user_id is not None:
            stmt = stmt.where((ReconScanRecord.user_id == user_id) | (ReconScanRecord.user_id.is_(None)))
        else:
            stmt = stmt.where(ReconScanRecord.user_id.is_(None))
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_recon_scans_for_user(user_id: str | None = None, limit: int = 50) -> list[ReconScanRecord]:
    """List reconnaissance scans for authenticated user."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReconScanRecord).order_by(ReconScanRecord.created_at.desc()).limit(limit)
        if user_id is not None:
            stmt = stmt.where(ReconScanRecord.user_id == user_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def save_quantum_simulation(
    sim: QuantumSimulationResponse, user_id: str | None = None
) -> QuantumSimulationRecord:
    """Persist quantum trust simulation result."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = QuantumSimulationRecord(
            id=sim.id,
            user_id=user_id or sim.user_id,
            scenario=sim.scenario.value,
            expected_distribution_json=json.dumps(sim.expected_distribution),
            observed_distribution_json=json.dumps(sim.observed_distribution),
            deviation=sim.deviation,
            threshold=sim.threshold,
            verdict=sim.verdict,
            explanation=sim.explanation,
            created_at=sim.created_at,
        )
        session.add(rec)
        await session.commit()
        await session.refresh(rec)
        return rec


async def get_quantum_simulation_by_id(
    sim_id: str, user_id: str | None = None
) -> QuantumSimulationRecord | None:
    """Retrieve quantum simulation record enforcing user isolation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(QuantumSimulationRecord).where(QuantumSimulationRecord.id == sim_id)
        if user_id is not None:
            stmt = stmt.where(
                (QuantumSimulationRecord.user_id == user_id)
                | (QuantumSimulationRecord.user_id.is_(None))
            )
        else:
            stmt = stmt.where(QuantumSimulationRecord.user_id.is_(None))
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_quantum_simulations_for_user(
    user_id: str | None = None, limit: int = 50
) -> list[QuantumSimulationRecord]:
    """List quantum simulations for authenticated user."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(QuantumSimulationRecord).order_by(QuantumSimulationRecord.created_at.desc()).limit(limit)
        if user_id is not None:
            stmt = stmt.where(QuantumSimulationRecord.user_id == user_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def save_report(report: ReportResponse, user_id: str | None = None) -> ReportRecord:
    """Persist consolidated security report."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = ReportRecord(
            id=report.id,
            user_id=user_id or report.user_id,
            scan_id=report.scan_id,
            recon_id=report.recon_id,
            quantum_id=report.quantum_id,
            report_type=report.report_type.value,
            title=report.title,
            summary=report.summary,
            content_json=json.dumps(report.content),
            report_hash=report.report_hash,
            created_at=report.created_at,
        )
        session.add(rec)
        await enqueue_sync_record(
            entity_type="report",
            entity_id=report.id,
            operation="CREATE",
            user_id=user_id or report.user_id,
            session=session,
        )
        await session.commit()
        await session.refresh(rec)
        return rec


async def get_report_by_id(report_id: str, user_id: str | None = None) -> ReportRecord | None:
    """Retrieve report by ID enforcing user isolation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReportRecord).where(ReportRecord.id == report_id)
        if user_id is not None:
            stmt = stmt.where((ReportRecord.user_id == user_id) | (ReportRecord.user_id.is_(None)))
        else:
            stmt = stmt.where(ReportRecord.user_id.is_(None))
        res = await session.execute(stmt)
        return res.scalars().first()


async def get_reports_for_user(user_id: str | None = None, limit: int = 50) -> list[ReportRecord]:
    """List security reports for authenticated user."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReportRecord).order_by(ReportRecord.created_at.desc()).limit(limit)
        if user_id:
            stmt = stmt.where(ReportRecord.user_id == user_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())


async def delete_scan_for_user(scan_id: str, user_id: str | None = None) -> bool:
    """Delete a scan record and cascade its findings and capabilities."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ScanRecord).where(ScanRecord.scan_id == scan_id)
        if user_id is not None:
            stmt = stmt.where((ScanRecord.user_id == user_id) | (ScanRecord.user_id.is_(None)))
        res = await session.execute(stmt)
        scan = res.scalars().first()
        if not scan:
            return False
        await session.delete(scan)
        await session.commit()
        return True


async def delete_report_for_user(report_id: str, user_id: str | None = None) -> bool:
    """Delete a report record."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReportRecord).where(ReportRecord.id == report_id)
        if user_id is not None:
            stmt = stmt.where((ReportRecord.user_id == user_id) | (ReportRecord.user_id.is_(None)))
        res = await session.execute(stmt)
        rep = res.scalars().first()
        if not rep:
            return False
        await session.delete(rep)
        await session.commit()
        return True


async def delete_recon_scan_for_user(recon_id: str, user_id: str | None = None) -> bool:
    """Delete a recon scan and cascaded assets/findings."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReconScanRecord).where(ReconScanRecord.id == recon_id)
        if user_id is not None:
            stmt = stmt.where((ReconScanRecord.user_id == user_id) | (ReconScanRecord.user_id.is_(None)))
        else:
            stmt = stmt.where(ReconScanRecord.user_id.is_(None))
        res = await session.execute(stmt)
        rec = res.scalars().first()
        if not rec:
            return False
        await session.delete(rec)
        await session.commit()
        return True


# ==============================================================================
# Settings Persistence Helper Functions
# ==============================================================================


async def save_setting(key: str, value: Any, user_id: str | None = None) -> SettingRecord:
    """Save or update a local configuration setting."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = await session.get(SettingRecord, key)
        if rec:
            rec.value_json = json.dumps(value)
            rec.user_id = user_id
            rec.updated_at = datetime.now(UTC)
        else:
            rec = SettingRecord(key=key, user_id=user_id, value_json=json.dumps(value))
            session.add(rec)
        await enqueue_sync_record(
            entity_type="setting",
            entity_id=key,
            operation="UPDATE",
            user_id=user_id,
            session=session,
        )
        await session.commit()
        await session.refresh(rec)
        return rec


async def get_setting(key: str, user_id: str | None = None) -> Any | None:
    """Fetch setting value by key."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = await session.get(SettingRecord, key)
        if not rec:
            return None
        if user_id is not None and rec.user_id is not None and rec.user_id != user_id:
            return None
        return json.loads(rec.value_json)


async def delete_setting(key: str, user_id: str | None = None) -> bool:
    """Delete setting by key."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        rec = await session.get(SettingRecord, key)
        if not rec:
            return False
        if user_id is not None and rec.user_id is not None and rec.user_id != user_id:
            return False
        await session.delete(rec)
        await session.commit()
        return True


async def list_settings(user_id: str | None = None) -> dict[str, Any]:
    """List all configured settings."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(SettingRecord)
        if user_id is not None:
            stmt = stmt.where((SettingRecord.user_id == user_id) | (SettingRecord.user_id.is_(None)))
        res = await session.execute(stmt)
        return {r.key: json.loads(r.value_json) for r in res.scalars().all()}


# ==============================================================================
# Sync Queue Database Operations
# ==============================================================================


async def enqueue_sync_record(
    entity_type: str,
    entity_id: str,
    operation: str = "CREATE",
    user_id: str | None = None,
    payload_json: str | None = None,
    session: AsyncSession | None = None,
) -> SyncQueueRecord:
    """
    Idempotently enqueue or update a sync queue record.
    If an existing pending or retrying sync record exists for the entity, it updates the payload and resets status to PENDING.
    """
    import uuid

    async def _do_enqueue(s: AsyncSession) -> SyncQueueRecord:
        now = datetime.now(UTC)
        stmt = select(SyncQueueRecord).where(
            SyncQueueRecord.entity_type == entity_type,
            SyncQueueRecord.entity_id == entity_id,
        )
        if user_id is not None:
            stmt = stmt.where(SyncQueueRecord.user_id == user_id)
        else:
            stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

        res = await s.execute(stmt)
        existing = res.scalars().first()

        if existing:
            # If not yet synced or failed, update payload and reset to PENDING
            if existing.status in ("PENDING", "RETRYING", "FAILED"):
                existing.operation = operation
                existing.payload_json = payload_json or existing.payload_json
                existing.status = "PENDING"
                existing.error_message = None
                existing.next_attempt_at = now
                existing.updated_at = now
                return existing
            elif existing.status == "SYNCED":
                # For an update after it was synced, re-open as PENDING with UPDATE operation
                existing.operation = "UPDATE" if operation == "CREATE" else operation
                existing.payload_json = payload_json or existing.payload_json
                existing.status = "PENDING"
                existing.attempt_count = 0
                existing.error_message = None
                existing.next_attempt_at = now
                existing.updated_at = now
                return existing
            return existing

        # Create new record
        sync_id = f"sync-{uuid.uuid4().hex[:16]}"
        record = SyncQueueRecord(
            id=sync_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            operation=operation,
            payload_json=payload_json,
            status="PENDING",
            attempt_count=0,
            max_attempts=5,
            next_attempt_at=now,
            created_at=now,
            updated_at=now,
        )
        s.add(record)
        return record

    if session:
        return await _do_enqueue(session)

    session_factory = get_session_factory()
    async with session_factory() as s:
        async with s.begin():
            return await _do_enqueue(s)


async def get_pending_sync_records(
    user_id: str | None = None,
    limit: int = 50,
    session: AsyncSession | None = None,
) -> list[SyncQueueRecord]:
    """Retrieve items in PENDING or RETRYING status whose next_attempt_at has elapsed."""
    now = datetime.now(UTC)

    async def _query(s: AsyncSession) -> list[SyncQueueRecord]:
        stmt = (
            select(SyncQueueRecord)
            .where(
                SyncQueueRecord.status.in_(["PENDING", "RETRYING"]),
                (SyncQueueRecord.next_attempt_at.is_(None)) | (SyncQueueRecord.next_attempt_at <= now),
            )
            .order_by(SyncQueueRecord.created_at.asc())
            .limit(limit)
        )
        if user_id is not None:
            stmt = stmt.where((SyncQueueRecord.user_id == user_id) | (SyncQueueRecord.user_id.is_(None)))
        res = await s.execute(stmt)
        return list(res.scalars().all())

    if session:
        return await _query(session)

    session_factory = get_session_factory()
    async with session_factory() as s:
        return await _query(s)


async def get_sync_queue_summary(user_id: str | None = None) -> dict[str, Any]:
    """Get aggregated metrics and counts for the synchronization queue."""
    session_factory = get_session_factory()
    async with session_factory() as s:
        stmt = select(SyncQueueRecord)
        if user_id is not None:
            stmt = stmt.where((SyncQueueRecord.user_id == user_id) | (SyncQueueRecord.user_id.is_(None)))

        res = await s.execute(stmt)
        records = res.scalars().all()

        counts = {
            "pending": 0,
            "syncing": 0,
            "synced": 0,
            "failed": 0,
            "retrying": 0,
            "total": len(records),
        }
        last_synced_at = None

        for r in records:
            st = (r.status or "PENDING").lower()
            if st in counts:
                counts[st] += 1
            if r.status == "SYNCED":
                if last_synced_at is None or (r.updated_at and r.updated_at > last_synced_at):
                    last_synced_at = r.updated_at

        return {
            "counts": counts,
            "pending_count": counts["pending"] + counts["retrying"],
            "failed_count": counts["failed"],
            "synced_count": counts["synced"],
            "last_synced_at": last_synced_at.isoformat() if last_synced_at else None,
            "is_syncing": counts["syncing"] > 0,
        }



