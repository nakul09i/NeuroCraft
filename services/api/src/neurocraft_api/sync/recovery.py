"""Crash recovery for NeuroCraft backend startup.

Safely handles interrupted operations when backend restarts after an unexpected termination.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from neurocraft_api.database import ScanRecord, SyncQueueRecord, get_session_factory

logger = logging.getLogger(__name__)


async def run_crash_recovery(session: AsyncSession | None = None) -> dict[str, Any]:
    """Recover from in-flight scan interruptions and orphaned sync tasks.

    1. In-flight scans: Any scan in 'processing' or 'pending' state was interrupted
       by an abrupt backend restart or crash. Transition these to 'failed' with a clear explanation.
    2. Stuck sync queue items: Any sync item in 'SYNCING' state was interrupted mid-flight.
       Reset its status to 'RETRYING' so it will be retried cleanly.
    """
    recovered_scans = 0
    recovered_sync_items = 0
    now = datetime.now(UTC)

    async def _execute_recovery(s: AsyncSession) -> tuple[int, int]:
        nonlocal recovered_scans, recovered_sync_items

        # 1. Recover in-flight scans
        scan_stmt = select(ScanRecord).where(ScanRecord.status.in_(["processing", "pending"]))
        scan_res = await s.execute(scan_stmt)
        stuck_scans = list(scan_res.scalars().all())

        for scan in stuck_scans:
            scan.status = "failed"
            scan.updated_at = now
            try:
                raw_data = json.loads(scan.raw_result_json) if scan.raw_result_json else {}
                raw_data["status"] = "failed"
                raw_data["error"] = "Scan interrupted: Process terminated or crashed before completion."
                raw_data["recovered_at"] = now.isoformat()
                scan.raw_result_json = json.dumps(raw_data)
            except Exception:
                pass
            recovered_scans += 1
            logger.warning(f"[Crash Recovery] Recovered interrupted scan: {scan.scan_id} -> failed")

        # 2. Recover orphaned SYNCING items
        sync_stmt = select(SyncQueueRecord).where(SyncQueueRecord.status == "SYNCING")
        sync_res = await s.execute(sync_stmt)
        stuck_items = list(sync_res.scalars().all())

        for item in stuck_items:
            item.status = "RETRYING"
            item.next_attempt_at = now
            item.updated_at = now
            item.error_message = "Previous sync attempt interrupted by process restart."
            recovered_sync_items += 1
            logger.warning(
                f"[Crash Recovery] Reset orphaned sync item: {item.id} "
                f"({item.entity_type}:{item.entity_id}) -> RETRYING"
            )

        if recovered_scans > 0 or recovered_sync_items > 0:
            await s.commit()

        return recovered_scans, recovered_sync_items

    if session:
        scans_count, sync_count = await _execute_recovery(session)
    else:
        session_factory = get_session_factory()
        async with session_factory() as s:
            scans_count, sync_count = await _execute_recovery(s)

    logger.info(
        f"[Crash Recovery] Complete. Scans recovered: {scans_count}, Sync items reset: {sync_count}."
    )
    return {
        "recovered_scans": scans_count,
        "recovered_sync_items": sync_count,
    }
