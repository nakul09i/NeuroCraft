"""Database models and asynchronous persistence layer for NeuroCraft."""

import json
from datetime import UTC, datetime
from pathlib import Path

from neurocraft_config import get_config
from neurocraft_types import (
    QuantumSimulationResponse,
    ReconScanResponse,
    ReportResponse,
    ScanResult,
    UserProfile,
)
from sqlalchemy import (
    BigInteger,
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
from sqlalchemy.orm import DeclarativeBase, relationship


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
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(120), nullable=False)
    file_type = Column(String(50), nullable=False)
    risk_level = Column(String(20), nullable=False)
    risk_score = Column(Float, nullable=False)
    engine_status_json = Column(Text, nullable=False)
    raw_result_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user = relationship("ProfileRecord", back_populates="scans")
    findings = relationship("FindingRecord", back_populates="scan", cascade="all, delete-orphan")
    capabilities = relationship(
        "CapabilityRecord", back_populates="scan", cascade="all, delete-orphan"
    )


class FindingRecord(Base):
    """Normalized security findings."""

    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), ForeignKey("scans.scan_id"), index=True, nullable=False)
    finding_id = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    source_engine = Column(String(64), nullable=False)
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


# ==============================================================================
# 3. Defensive Passive Reconnaissance Tables
# ==============================================================================


class ReconScanRecord(Base):
    """Defensive reconnaissance scan audit record."""

    __tablename__ = "recon_scans"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("profiles.id"), index=True, nullable=True)
    target = Column(String(255), index=True, nullable=False)
    status = Column(String(30), nullable=False)
    exposure_score = Column(Float, nullable=False)
    exposure_level = Column(String(20), nullable=False)
    dns_json = Column(Text, default="[]")
    tls_json = Column(Text, default="{}")
    headers_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
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

    id = Column(String(64), primary_key=True)
    recon_scan_id = Column(String(64), ForeignKey("recon_scans.id"), index=True, nullable=False)
    hostname = Column(String(255), nullable=False)
    asset_type = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    status = Column(String(30), default="ACTIVE")
    metadata_json = Column(Text, default="{}")

    recon_scan = relationship("ReconScanRecord", back_populates="assets")


class ReconFindingRecord(Base):
    """Reconnaissance exposure findings."""

    __tablename__ = "recon_findings"

    id = Column(String(64), primary_key=True)
    recon_scan_id = Column(String(64), ForeignKey("recon_scans.id"), index=True, nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=False)
    evidence_json = Column(Text, default="{}")
    recommendation = Column(Text, nullable=False)

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user = relationship("ProfileRecord", back_populates="reports")


# ==============================================================================
# Engine & Session Management
# ==============================================================================

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_db_url() -> str:
    """Resolve database URL. Defaults to local SQLite for student/free-first development."""
    cfg = get_config()
    url = cfg.database_url
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
    """Initialize database tables."""
    global _engine, _session_factory
    if custom_url:
        _engine = create_async_engine(custom_url, echo=False)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)
    engine = _engine if _engine is not None else get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
            risk_level=result.risk_verdict.level.value,
            risk_score=result.risk_verdict.score,
            engine_status_json=json.dumps(
                {k: (v.value if hasattr(v, "value") else str(v)) for k, v in result.engines.items()}
            ),
            raw_result_json=result.model_dump_json(),
            created_at=result.scanned_at,
        )
        session.add(scan_rec)

        for finding in result.findings:
            f_rec = FindingRecord(
                scan_id=result.scan_id,
                finding_id=finding.id,
                category=finding.category,
                title=finding.title,
                severity=finding.severity.value,
                confidence=finding.confidence.value,
                source_engine=finding.source_engine,
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

        await session.commit()
        await session.refresh(scan_rec)
        return scan_rec


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
            status=recon.status,
            exposure_score=recon.exposure_score,
            exposure_level=recon.exposure_level.value,
            dns_json=json.dumps([d.model_dump() for d in recon.dns_records]),
            tls_json=json.dumps(recon.tls_info.model_dump() if recon.tls_info else {}),
            headers_json=json.dumps(
                recon.security_headers.model_dump() if recon.security_headers else {}
            ),
            created_at=recon.created_at,
            completed_at=recon.completed_at,
        )
        session.add(scan_rec)

        for asset in recon.assets:
            a_rec = ReconAssetRecord(
                id=asset.id,
                recon_scan_id=recon.id,
                hostname=asset.hostname,
                asset_type=asset.asset_type,
                source=asset.source,
                status=asset.status,
                metadata_json=json.dumps(asset.metadata),
            )
            session.add(a_rec)

        for finding in recon.findings:
            f_rec = ReconFindingRecord(
                id=finding.id,
                recon_scan_id=recon.id,
                category=finding.category,
                title=finding.title,
                severity=finding.severity.value,
                confidence=finding.confidence.value,
                evidence_json=json.dumps(finding.evidence),
                recommendation=finding.recommendation,
            )
            session.add(f_rec)

        await session.commit()
        await session.refresh(scan_rec)
        return scan_rec


async def get_recon_scan_by_id(recon_id: str, user_id: str | None = None) -> ReconScanRecord | None:
    """Retrieve reconnaissance scan record enforcing user isolation."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = select(ReconScanRecord).where(ReconScanRecord.id == recon_id)
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
            created_at=report.created_at,
        )
        session.add(rec)
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
