"""Database models and asynchronous persistence layer for NeuroCraft."""

import json
from datetime import UTC, datetime
from pathlib import Path

from neurocraft_config import get_config
from neurocraft_types import ScanResult
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


class ScanRecord(Base):
    """Database record for an analysis scan."""

    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(64), unique=True, index=True, nullable=False)
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
    global _engine
    if _engine is None:
        db_url = get_db_url()
        try:
            _engine = create_async_engine(db_url, echo=False)
        except Exception:
            scratch_db = Path("./scratch/neurocraft.db").resolve()
            scratch_db.parent.mkdir(parents=True, exist_ok=True)
            fallback_url = f"sqlite+aiosqlite:///{scratch_db}"
            _engine = create_async_engine(fallback_url, echo=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
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


async def save_scan_result(result: ScanResult) -> ScanRecord:
    """Persist scan results, findings, and capabilities to database."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        scan_rec = ScanRecord(
            scan_id=result.scan_id,
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
        record = res.scalars().first()
        return record


async def get_scan_by_sha256(sha256: str) -> ScanRecord | None:
    """Retrieve most recent scan record by file SHA-256."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        stmt = (
            select(ScanRecord)
            .where(ScanRecord.sha256 == sha256)
            .order_by(ScanRecord.created_at.desc())
        )
        res = await session.execute(stmt)
        record = res.scalars().first()
        return record

