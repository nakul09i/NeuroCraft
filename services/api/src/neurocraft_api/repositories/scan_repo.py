"""Repository layer for Scans, Findings, and Capabilities with strict scan isolation."""

import json
from datetime import UTC, datetime

from neurocraft_types import ScanResult
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from neurocraft_api.database import (
    CapabilityRecord,
    FindingRecord,
    ScanRecord,
    get_session_factory,
)


class ScanRepository:
    """Encapsulates scan persistence, finding retrieval, and boundary isolation."""

    def __init__(self, session_factory=None):
        self._session_factory = session_factory or get_session_factory()

    async def save_scan_result(
        self,
        result: ScanResult,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> ScanRecord:
        """Persist a complete scan result with its findings and capabilities."""

        async def _persist(s: AsyncSession) -> ScanRecord:
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
                created_at=result.scanned_at or datetime.now(UTC),
            )
            s.add(scan_rec)

            # Persist findings tied strictly to this scan_id
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
                s.add(f_rec)

            # Persist capabilities tied strictly to this scan_id
            for cap in result.capabilities:
                c_rec = CapabilityRecord(
                    scan_id=result.scan_id,
                    capability=cap.capability,
                    status=cap.status.value,
                    confidence=cap.confidence.value,
                    evidence_json=json.dumps(cap.evidence),
                )
                s.add(c_rec)

            await s.commit()
            await s.refresh(scan_rec)
            return scan_rec

        if session:
            return await _persist(session)
        async with self._session_factory() as s:
            return await _persist(s)

    async def get_scan_by_id(
        self,
        scan_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> ScanRecord | None:
        """Retrieve scan record by scan_id with strict user boundary check."""

        async def _query(s: AsyncSession) -> ScanRecord | None:
            stmt = select(ScanRecord).where(ScanRecord.scan_id == scan_id)
            if user_id is not None:
                stmt = stmt.where((ScanRecord.user_id == user_id) | (ScanRecord.user_id.is_(None)))
            else:
                stmt = stmt.where(ScanRecord.user_id.is_(None))
            res = await s.execute(stmt)
            return res.scalars().first()

        if session:
            return await _query(session)
        async with self._session_factory() as s:
            return await _query(s)

    async def get_findings_for_scan(
        self,
        scan_id: str,
        session: AsyncSession | None = None,
    ) -> list[FindingRecord]:
        """
        Retrieve findings strictly belonging to the specified scan_id.
        CRITICAL ISOLATION MANDATE: Never allows cross-scan finding leakage.
        """

        async def _query(s: AsyncSession) -> list[FindingRecord]:
            stmt = (
                select(FindingRecord)
                .where(FindingRecord.scan_id == scan_id)
                .order_by(FindingRecord.id.asc())
            )
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session:
            return await _query(session)
        async with self._session_factory() as s:
            return await _query(s)

    async def get_capabilities_for_scan(
        self,
        scan_id: str,
        session: AsyncSession | None = None,
    ) -> list[CapabilityRecord]:
        """Retrieve capabilities strictly belonging to the specified scan_id."""

        async def _query(s: AsyncSession) -> list[CapabilityRecord]:
            stmt = (
                select(CapabilityRecord)
                .where(CapabilityRecord.scan_id == scan_id)
                .order_by(CapabilityRecord.id.asc())
            )
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session:
            return await _query(session)
        async with self._session_factory() as s:
            return await _query(s)

    async def list_scans(
        self,
        user_id: str | None = None,
        limit: int = 50,
        session: AsyncSession | None = None,
    ) -> list[ScanRecord]:
        """List recent scans ordered by creation date with user isolation."""

        async def _query(s: AsyncSession) -> list[ScanRecord]:
            stmt = select(ScanRecord).order_by(ScanRecord.created_at.desc()).limit(limit)
            if user_id is not None:
                stmt = stmt.where(ScanRecord.user_id == user_id)
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session:
            return await _query(session)
        async with self._session_factory() as s:
            return await _query(s)

    async def delete_scan(
        self,
        scan_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> bool:
        """Delete scan and cascade delete its findings and capabilities."""

        async def _delete(s: AsyncSession) -> bool:
            stmt = select(ScanRecord).where(ScanRecord.scan_id == scan_id)
            if user_id is not None:
                stmt = stmt.where((ScanRecord.user_id == user_id) | (ScanRecord.user_id.is_(None)))
            else:
                stmt = stmt.where(ScanRecord.user_id.is_(None))
            res = await s.execute(stmt)
            scan = res.scalars().first()
            if not scan:
                return False
            await s.delete(scan)
            await s.commit()
            return True

        if session:
            return await _delete(session)
        async with self._session_factory() as s:
            return await _delete(s)
