"""Repository layer for Scans, Findings, and Capabilities with strict scan isolation."""

import json
from datetime import UTC, datetime
from typing import Any

from neurocraft_types import ScanResult
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from neurocraft_api.database import (
    CapabilityRecord,
    FileIntegrityRecord,
    FindingRecord,
    ScanRecord,
    enqueue_sync_record,
    get_session_factory,
)


class ScanRepository:
    """Encapsulates scan persistence, finding retrieval, and boundary isolation."""

    def __init__(self, session_factory=None):
        self._custom_session_factory = session_factory

    @property
    def session_factory(self):
        return self._custom_session_factory or get_session_factory()

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
                status=result.status,
                risk_level=result.risk_verdict.level.value,
                risk_score=result.risk_verdict.score,
                confidence=result.risk_verdict.confidence.value,
                engine_status_json=json.dumps(
                    {k: (v.value if hasattr(v, "value") else str(v)) for k, v in result.engines.items()}
                ),
                raw_result_json=result.model_dump_json(),
                created_at=result.scanned_at or datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            s.add(scan_rec)

            # Persist findings tied strictly to this scan_id
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

            # Persist file integrity and trust assessment
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
                s.add(int_rec)

            # Atomically enqueue in local sync queue for cloud replication
            await enqueue_sync_record(
                entity_type="scan",
                entity_id=result.scan_id,
                operation="CREATE",
                user_id=user_id or result.user_id,
                session=s,
            )

            await s.commit()
            await s.refresh(scan_rec)
            return scan_rec

        if session:
            return await _persist(session)
        async with self.session_factory() as s:
            return await _persist(s)

    async def get_scan_by_id(
        self,
        scan_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> ScanRecord | None:
        """Retrieve scan record by scan_id with strict user boundary check."""

        async def _query(s: AsyncSession) -> ScanRecord | None:
            stmt = (
                select(ScanRecord)
                .options(selectinload(ScanRecord.integrity))
                .where(ScanRecord.scan_id == scan_id)
            )
            if user_id is not None:
                stmt = stmt.where((ScanRecord.user_id == user_id) | (ScanRecord.user_id.is_(None)))
            else:
                stmt = stmt.where(ScanRecord.user_id.is_(None))
            res = await s.execute(stmt)
            return res.scalars().first()

        if session:
            return await _query(session)
        async with self.session_factory() as s:
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
        async with self.session_factory() as s:
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
        async with self.session_factory() as s:
            return await _query(s)

    def _build_filter_conditions(
        self,
        user_id: str | None = None,
        q: str | None = None,
        risk_level: str | None = None,
        status: str | None = None,
    ) -> list:
        """Construct SQL filter clauses enforcing user isolation."""
        conditions = []
        if user_id is not None:
            conditions.append(ScanRecord.user_id == user_id)
        else:
            conditions.append(ScanRecord.user_id.is_(None))

        if q and q.strip():
            term = f"%{q.strip()}%"
            conditions.append(
                (ScanRecord.filename.ilike(term)) | (ScanRecord.sha256.ilike(term))
            )

        if risk_level and risk_level.upper() != "ALL":
            levels = [lvl.strip().upper() for lvl in risk_level.split(",") if lvl.strip()]
            if levels:
                conditions.append(ScanRecord.risk_level.in_(levels))

        if status and status.upper() != "ALL":
            statuses = [st.strip().lower() for st in status.split(",") if st.strip()]
            if statuses:
                conditions.append(ScanRecord.status.in_(statuses))

        return conditions

    async def count_scans(
        self,
        user_id: str | None = None,
        q: str | None = None,
        risk_level: str | None = None,
        status: str | None = None,
        session: AsyncSession | None = None,
    ) -> int:
        """Count total matching scans with user isolation."""
        conditions = self._build_filter_conditions(
            user_id=user_id, q=q, risk_level=risk_level, status=status
        )

        async def _count(s: AsyncSession) -> int:
            stmt = select(func.count(ScanRecord.id)).where(*conditions)
            res = await s.execute(stmt)
            return res.scalar_one() or 0

        if session:
            return await _count(session)
        async with self.session_factory() as s:
            return await _count(s)

    async def list_scans(
        self,
        user_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
        q: str | None = None,
        risk_level: str | None = None,
        status: str | None = None,
        sort_by: str = "newest",
        session: AsyncSession | None = None,
    ) -> list[ScanRecord]:
        """List scans with user isolation, search, filtering, and deterministic sorting."""
        conditions = self._build_filter_conditions(
            user_id=user_id, q=q, risk_level=risk_level, status=status
        )

        order_by_clauses = []
        if sort_by == "oldest":
            order_by_clauses.append(ScanRecord.created_at.asc())
        elif sort_by == "highest_risk":
            order_by_clauses.extend([ScanRecord.risk_score.desc(), ScanRecord.created_at.desc()])
        elif sort_by == "lowest_risk":
            order_by_clauses.extend([ScanRecord.risk_score.asc(), ScanRecord.created_at.desc()])
        else:  # "newest"
            order_by_clauses.append(ScanRecord.created_at.desc())

        async def _query(s: AsyncSession) -> list[ScanRecord]:
            stmt = (
                select(ScanRecord)
                .options(selectinload(ScanRecord.integrity))
                .where(*conditions)
                .order_by(*order_by_clauses)
                .offset(offset)
                .limit(limit)
            )
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session:
            return await _query(session)
        async with self.session_factory() as s:
            return await _query(s)

    async def get_scan_recon(
        self,
        scan_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Retrieve correlated recon data for a scan, or return empty correlation."""
        scan = await self.get_scan_by_id(scan_id, user_id=user_id, session=session)
        if not scan:
            return {
                "scan_id": scan_id,
                "recon_available": False,
                "target": None,
                "exposure_score": None,
                "exposure_level": None,
                "technologies": [],
                "dns": [],
                "tls": {},
                "headers": {},
            }

        async def _find_recon(s: AsyncSession) -> dict[str, Any]:
            from neurocraft_api.database import ReconScanRecord, ReportRecord

            stmt = select(ReportRecord).where(ReportRecord.scan_id == scan_id)
            if user_id is not None:
                stmt = stmt.where((ReportRecord.user_id == user_id) | (ReportRecord.user_id.is_(None)))
            rep = (await s.execute(stmt)).scalars().first()

            recon_rec = None
            if rep and rep.recon_id:
                recon_stmt = select(ReconScanRecord).where(ReconScanRecord.id == rep.recon_id)
                recon_rec = (await s.execute(recon_stmt)).scalars().first()

            if not recon_rec and scan.raw_result_json:
                try:
                    raw = json.loads(scan.raw_result_json)
                    for f in raw.get("findings", []):
                        ev = f.get("evidence", {})
                        dom = ev.get("domain") or ev.get("hostname")
                        if dom:
                            r_stmt = select(ReconScanRecord).where(ReconScanRecord.target == dom)
                            if user_id is not None:
                                r_stmt = r_stmt.where(
                                    (ReconScanRecord.user_id == user_id) | (ReconScanRecord.user_id.is_(None))
                                )
                            recon_rec = (await s.execute(r_stmt)).scalars().first()
                            if recon_rec:
                                break
                except Exception:
                    pass

            if recon_rec:
                return {
                    "scan_id": scan_id,
                    "recon_available": True,
                    "recon_id": recon_rec.id,
                    "target": recon_rec.target,
                    "exposure_score": recon_rec.exposure_score,
                    "exposure_level": recon_rec.exposure_level,
                    "technologies": (
                        json.loads(recon_rec.tech_json)
                        if getattr(recon_rec, "tech_json", None)
                        else []
                    ),
                    "dns": (
                        json.loads(recon_rec.dns_json)
                        if getattr(recon_rec, "dns_json", None)
                        else []
                    ),
                    "tls": (
                        json.loads(recon_rec.tls_json)
                        if getattr(recon_rec, "tls_json", None)
                        else {}
                    ),
                    "headers": (
                        json.loads(recon_rec.headers_json)
                        if getattr(recon_rec, "headers_json", None)
                        else {}
                    ),
                }
            return {
                "scan_id": scan_id,
                "recon_available": False,
                "target": None,
                "exposure_score": None,
                "exposure_level": None,
                "technologies": [],
                "dns": [],
                "tls": {},
                "headers": {},
            }

        if session:
            return await _find_recon(session)
        async with self.session_factory() as s:
            return await _find_recon(s)

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
        async with self.session_factory() as s:
            return await _delete(s)

    async def get_file_integrity(
        self,
        scan_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> FileIntegrityRecord | None:
        """Retrieve file integrity record with user isolation check."""

        async def _query(s: AsyncSession) -> FileIntegrityRecord | None:
            # First check scan access
            scan = await self.get_scan_by_id(scan_id, user_id=user_id, session=s)
            if not scan:
                return None
            stmt = select(FileIntegrityRecord).where(FileIntegrityRecord.scan_id == scan_id)
            res = await s.execute(stmt)
            return res.scalars().first()

        if session:
            return await _query(session)
        async with self.session_factory() as s:
            return await _query(s)
