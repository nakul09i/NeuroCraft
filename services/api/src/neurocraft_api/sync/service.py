"""NeuroCraft Synchronization Engine - Offline-first queue management and cloud replication."""

from __future__ import annotations

import json
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from neurocraft_api.database import (
    FileIntegrityRecord,
    ReportRecord,
    ScanRecord,
    SettingRecord,
    SyncQueueRecord,
    get_session_factory,
)

logger = logging.getLogger(__name__)

# Topological dependency weight: Parent scan first, then integrity, report, setting
ENTITY_DEPENDENCY_WEIGHT = {
    "scan": 1,
    "integrity": 2,
    "report": 3,
    "setting": 4,
}


def calculate_backoff(attempt: int, base: float = 2.0, max_delay: float = 60.0) -> float:
    """Calculate bounded exponential backoff delay in seconds."""
    return min(base ** max(1, attempt), max_delay)


class CloudSyncAdapter(ABC):
    """Abstract interface for cloud replication backends."""

    @abstractmethod
    async def sync_document(
        self,
        entity_type: str,
        entity_id: str,
        user_id: str | None,
        payload: dict[str, Any],
        operation: str = "CREATE",
    ) -> bool:
        """Replicate a document to the cloud layer.

        Raises an Exception on network failure.
        """
        pass


class MockCloudSyncAdapter(CloudSyncAdapter):
    """In-memory mock adapter for deterministic testing and local headless operation."""

    def __init__(self, should_fail: bool = False, fail_message: str = "Cloud endpoint unreachable"):
        self.should_fail = should_fail
        self.fail_message = fail_message
        self.synced_documents: dict[str, dict[str, Any]] = {}
        self.sync_attempts: list[dict[str, Any]] = []

    async def sync_document(
        self,
        entity_type: str,
        entity_id: str,
        user_id: str | None,
        payload: dict[str, Any],
        operation: str = "CREATE",
    ) -> bool:
        self.sync_attempts.append(
            {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "user_id": user_id,
                "operation": operation,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        if self.should_fail:
            raise ConnectionError(self.fail_message)

        key = f"{user_id or 'anon'}/{entity_type}/{entity_id}"
        if operation == "DELETE":
            self.synced_documents.pop(key, None)
        else:
            self.synced_documents[key] = payload
        return True


class DefaultCloudSyncAdapter(CloudSyncAdapter):
    """Production Cloud Sync Adapter replicating to Firebase Firestore when reachable."""

    def __init__(self):
        self._firebase_app = None

    async def sync_document(
        self,
        entity_type: str,
        entity_id: str,
        user_id: str | None,
        payload: dict[str, Any],
        operation: str = "CREATE",
    ) -> bool:
        # Determine cloud path: users/{userId}/{collection}/{docId}
        target_user = user_id or "anonymous"
        subcollection = f"{entity_type}s" if not entity_type.endswith("s") else entity_type

        # Check if environment is configured for real cloud sync
        import os
        has_creds = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_PROJECT_ID"))

        if not has_creds:
            # Offline / unconfigured development environment
            raise ConnectionError(
                "Cloud replication deferred: Firebase credentials not configured or network unreachable."
            )

        # In production with credentials, write via firebase_admin firestore
        try:
            import firebase_admin
            from firebase_admin import firestore

            if not firebase_admin._apps:
                firebase_admin.initialize_app()

            client = firestore.client()
            doc_ref = client.collection("users").document(target_user).collection(subcollection).document(entity_id)

            if operation == "DELETE":
                doc_ref.delete()
            else:
                doc_ref.set(payload, merge=True)
            return True
        except Exception as err:
            logger.warning(f"[CloudSync] Direct cloud write failed: {err}")
            raise ConnectionError(f"Cloud write failed: {err}") from err


class SyncService:
    """Core synchronization engine for offline-first local queue and cloud replication."""

    def __init__(
        self,
        session_factory=None,
        cloud_adapter: CloudSyncAdapter | None = None,
    ):
        self.session_factory = session_factory or get_session_factory()
        self.cloud_adapter = cloud_adapter or DefaultCloudSyncAdapter()

    def set_cloud_adapter(self, adapter: CloudSyncAdapter) -> None:
        """Override cloud adapter (useful for testing and simulated offline/online states)."""
        self.cloud_adapter = adapter

    async def enqueue(
        self,
        entity_type: str,
        entity_id: str,
        operation: str = "CREATE",
        user_id: str | None = None,
        payload: dict[str, Any] | None = None,
        session: AsyncSession | None = None,
    ) -> SyncQueueRecord:
        """Enqueue or update an item in the persistent sync queue."""
        now = datetime.now(UTC)
        payload_str = json.dumps(payload) if payload is not None else None

        async def _do_enqueue(s: AsyncSession) -> SyncQueueRecord:
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
                if existing.status in ("PENDING", "RETRYING", "FAILED"):
                    existing.operation = operation
                    if payload_str:
                        existing.payload_json = payload_str
                    existing.status = "PENDING"
                    existing.error_message = None
                    existing.next_attempt_at = now
                    existing.updated_at = now
                    return existing
                elif existing.status == "SYNCED":
                    existing.operation = "UPDATE" if operation == "CREATE" else operation
                    if payload_str:
                        existing.payload_json = payload_str
                    existing.status = "PENDING"
                    existing.attempt_count = 0
                    existing.error_message = None
                    existing.next_attempt_at = now
                    existing.updated_at = now
                    return existing
                return existing

            record = SyncQueueRecord(
                id=f"sync-{uuid.uuid4().hex[:16]}",
                user_id=user_id,
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                payload_json=payload_str,
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

        async with self.session_factory() as s:
            async with s.begin():
                return await _do_enqueue(s)

    async def get_queue(
        self,
        user_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
        session: AsyncSession | None = None,
    ) -> list[SyncQueueRecord]:
        """Retrieve sync queue items with strict tenant isolation."""

        async def _query(s: AsyncSession) -> list[SyncQueueRecord]:
            stmt = select(SyncQueueRecord)
            if user_id is not None:
                stmt = stmt.where(SyncQueueRecord.user_id == user_id)
            else:
                stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

            if status and status.upper() != "ALL":
                statuses = [st.strip().upper() for st in status.split(",") if st.strip()]
                if statuses:
                    stmt = stmt.where(SyncQueueRecord.status.in_(statuses))

            stmt = stmt.order_by(SyncQueueRecord.created_at.desc()).offset(offset).limit(limit)
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session:
            return await _query(session)
        async with self.session_factory() as s:
            return await _query(s)

    async def get_summary(
        self,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Retrieve aggregated sync queue statistics with user isolation."""

        async def _query(s: AsyncSession) -> dict[str, Any]:
            stmt = select(SyncQueueRecord)
            if user_id is not None:
                stmt = stmt.where(SyncQueueRecord.user_id == user_id)
            else:
                stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

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

        if session:
            return await _query(session)
        async with self.session_factory() as s:
            return await _query(s)

    async def retry_item(
        self,
        item_id: str,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> SyncQueueRecord | None:
        """Reset a failed or retrying item to PENDING for immediate processing."""
        now = datetime.now(UTC)

        async def _retry(s: AsyncSession) -> SyncQueueRecord | None:
            stmt = select(SyncQueueRecord).where(SyncQueueRecord.id == item_id)
            if user_id is not None:
                stmt = stmt.where(SyncQueueRecord.user_id == user_id)
            else:
                stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

            res = await s.execute(stmt)
            item = res.scalars().first()
            if not item:
                return None

            item.status = "PENDING"
            item.attempt_count = 0
            item.next_attempt_at = now
            item.error_message = None
            item.updated_at = now
            await s.commit()
            await s.refresh(item)
            return item

        if session:
            return await _retry(session)
        async with self.session_factory() as s:
            return await _retry(s)

    async def retry_all_failed(
        self,
        user_id: str | None = None,
        session: AsyncSession | None = None,
    ) -> int:
        """Reset all FAILED and RETRYING items to PENDING with user boundary isolation."""
        now = datetime.now(UTC)

        async def _retry_all(s: AsyncSession) -> int:
            stmt = select(SyncQueueRecord).where(SyncQueueRecord.status.in_(["FAILED", "RETRYING"]))
            if user_id is not None:
                stmt = stmt.where(SyncQueueRecord.user_id == user_id)
            else:
                stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

            res = await s.execute(stmt)
            items = list(res.scalars().all())
            for item in items:
                item.status = "PENDING"
                item.attempt_count = 0
                item.next_attempt_at = now
                item.error_message = None
                item.updated_at = now

            if items:
                await s.commit()
            return len(items)

        if session:
            return await _retry_all(session)
        async with self.session_factory() as s:
            return await _retry_all(s)

    async def _extract_sanitized_payload(
        self,
        item: SyncQueueRecord,
        session: AsyncSession,
    ) -> dict[str, Any]:
        """Extract sanitized metadata payload for entity. NEVER includes raw binary bytes."""
        if item.payload_json:
            try:
                return json.loads(item.payload_json)
            except Exception:
                pass

        now_iso = datetime.now(UTC).isoformat()

        if item.entity_type == "scan":
            stmt = select(ScanRecord).options(selectinload(ScanRecord.findings)).where(
                ScanRecord.scan_id == item.entity_id
            )
            res = await session.execute(stmt)
            scan = res.scalars().first()
            if not scan:
                raise ValueError(f"Scan '{item.entity_id}' not found in local database.")

            return {
                "scanId": scan.scan_id,
                "userId": scan.user_id,
                "fileName": scan.filename,
                "fileSize": scan.file_size_bytes,
                "fileType": scan.file_type,
                "sha256": scan.sha256,
                "status": scan.status,
                "riskLevel": scan.risk_level,
                "riskScore": scan.risk_score,
                "confidence": scan.confidence,
                "findingsCount": len(scan.findings) if scan.findings else 0,
                "engineStatus": json.loads(scan.engine_status_json) if scan.engine_status_json else {},
                "createdAt": scan.created_at.isoformat() if scan.created_at else now_iso,
                "updatedAt": scan.updated_at.isoformat() if scan.updated_at else now_iso,
                "syncStatus": "synced",
            }

        elif item.entity_type == "report":
            stmt = select(ReportRecord).where(ReportRecord.id == item.entity_id)
            res = await session.execute(stmt)
            report = res.scalars().first()
            if not report:
                raise ValueError(f"Report '{item.entity_id}' not found in local database.")

            return {
                "reportId": report.id,
                "scanId": report.scan_id,
                "userId": report.user_id,
                "reportType": report.report_type,
                "title": report.title,
                "summary": report.summary,
                "reportHash": report.report_hash,
                "createdAt": report.created_at.isoformat() if report.created_at else now_iso,
                "updatedAt": now_iso,
                "syncStatus": "synced",
            }

        elif item.entity_type == "setting":
            stmt = select(SettingRecord).where(SettingRecord.key == item.entity_id)
            res = await session.execute(stmt)
            setting = res.scalars().first()
            if not setting:
                raise ValueError(f"Setting '{item.entity_id}' not found in local database.")

            return {
                "key": setting.key,
                "userId": setting.user_id,
                "value": json.loads(setting.value_json) if setting.value_json else None,
                "updatedAt": setting.updated_at.isoformat() if setting.updated_at else now_iso,
                "syncStatus": "synced",
            }

        elif item.entity_type == "integrity":
            stmt = select(FileIntegrityRecord).where(FileIntegrityRecord.scan_id == item.entity_id)
            res = await session.execute(stmt)
            integrity = res.scalars().first()
            if not integrity:
                raise ValueError(f"File integrity for scan '{item.entity_id}' not found in local database.")

            return {
                "scanId": integrity.scan_id,
                "sha256": integrity.sha256,
                "sha512": integrity.sha512,
                "hashMatchStatus": integrity.hash_match_status,
                "signatureStatus": integrity.signature_status,
                "signer": integrity.signer,
                "issuer": integrity.issuer,
                "integrityStatus": integrity.integrity_status,
                "trustScore": integrity.trust_score,
                "confidence": integrity.confidence,
                "createdAt": integrity.created_at.isoformat() if integrity.created_at else now_iso,
                "updatedAt": now_iso,
                "syncStatus": "synced",
            }

        return {"entityType": item.entity_type, "entityId": item.entity_id, "updatedAt": now_iso}

    async def process_ready_items(
        self,
        user_id: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """Process eligible pending/retrying items according to dependency order and backoff."""
        now = datetime.now(UTC)
        synced_count = 0
        retrying_count = 0
        failed_count = 0

        async with self.session_factory() as session:
            # Fetch eligible items whose next_attempt_at <= now
            stmt = select(SyncQueueRecord).where(
                SyncQueueRecord.status.in_(["PENDING", "RETRYING"]),
                (SyncQueueRecord.next_attempt_at.is_(None)) | (SyncQueueRecord.next_attempt_at <= now),
            )
            if user_id is not None:
                stmt = stmt.where(SyncQueueRecord.user_id == user_id)
            else:
                stmt = stmt.where(SyncQueueRecord.user_id.is_(None))

            res = await session.execute(stmt)
            candidates = list(res.scalars().all())

            # Sort deterministically by dependency weight (scans first), then created_at
            candidates.sort(
                key=lambda x: (
                    ENTITY_DEPENDENCY_WEIGHT.get(x.entity_type, 99),
                    x.created_at or datetime.min.replace(tzinfo=UTC),
                )
            )

            batch = candidates[:limit]

            for item in batch:
                # Mark in-flight
                item.status = "SYNCING"
                item.last_attempt_at = now
                item.updated_at = now
                await session.commit()

                try:
                    payload = await self._extract_sanitized_payload(item, session)
                    await self.cloud_adapter.sync_document(
                        entity_type=item.entity_type,
                        entity_id=item.entity_id,
                        user_id=item.user_id,
                        payload=payload,
                        operation=item.operation,
                    )

                    # Cloud sync successful
                    item.status = "SYNCED"
                    item.error_message = None
                    item.updated_at = datetime.now(UTC)
                    synced_count += 1
                except Exception as exc:
                    logger.warning(f"[Sync] Replication failed for item {item.id}: {exc}")
                    item.attempt_count += 1
                    item.error_message = str(exc)
                    item.updated_at = datetime.now(UTC)

                    if item.attempt_count >= item.max_attempts:
                        item.status = "FAILED"
                        failed_count += 1
                    else:
                        item.status = "RETRYING"
                        delay = calculate_backoff(item.attempt_count)
                        item.next_attempt_at = datetime.now(UTC) + timedelta(seconds=delay)
                        retrying_count += 1

                await session.commit()

        return {
            "processed": len(batch),
            "synced": synced_count,
            "retrying": retrying_count,
            "failed": failed_count,
        }


# Global singleton
_sync_service: SyncService | None = None


def get_sync_service() -> SyncService:
    """Retrieve or construct the global SyncService instance."""
    global _sync_service
    if _sync_service is None:
        _sync_service = SyncService()
    return _sync_service
