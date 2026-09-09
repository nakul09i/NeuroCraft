"""Unit tests for offline-first sync queue, dependency ordering, bounded backoff, and crash recovery."""

from datetime import UTC, datetime, timedelta

import pytest
from neurocraft_api.database import (
    Base,
    ScanRecord,
    SyncQueueRecord,
)
from neurocraft_api.sync.recovery import run_crash_recovery
from neurocraft_api.sync.service import (
    MockCloudSyncAdapter,
    SyncService,
    calculate_backoff,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest.fixture
async def test_session():
    """In-memory SQLite session for isolated unit tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    yield session_factory
    await engine.dispose()


def test_bounded_exponential_backoff_calculation():
    """Verify bounded exponential backoff schedule (2s, 4s, 8s, 16s, 32s, bounded at 60s)."""
    assert calculate_backoff(1) == 2.0
    assert calculate_backoff(2) == 4.0
    assert calculate_backoff(3) == 8.0
    assert calculate_backoff(4) == 16.0
    assert calculate_backoff(5) == 32.0
    assert calculate_backoff(6) == 60.0
    assert calculate_backoff(10) == 60.0


@pytest.mark.anyio
async def test_enqueue_and_idempotent_deduplication(test_session):
    """Verify enqueueing is idempotent and never creates duplicate queue rows for the same entity."""
    mock_adapter = MockCloudSyncAdapter()
    svc = SyncService(session_factory=test_session, cloud_adapter=mock_adapter)

    # First enqueue
    item1 = await svc.enqueue(
        entity_type="scan",
        entity_id="scan-001",
        operation="CREATE",
        user_id="user_alpha",
        payload={"filename": "sample.exe", "verdict": "SAFE"},
    )
    assert item1.status == "PENDING"
    assert item1.attempt_count == 0

    # Second enqueue for same entity (e.g. updated verdict or re-save)
    item2 = await svc.enqueue(
        entity_type="scan",
        entity_id="scan-001",
        operation="UPDATE",
        user_id="user_alpha",
        payload={"filename": "sample.exe", "verdict": "SUSPICIOUS"},
    )
    assert item2.id == item1.id
    assert item2.operation == "UPDATE"

    # Verify database table contains exactly 1 row
    async with test_session() as s:
        res = await s.execute(select(SyncQueueRecord))
        rows = res.scalars().all()
        assert len(rows) == 1
        assert rows[0].id == item1.id


@pytest.mark.anyio
async def test_dependency_aware_replication_order(test_session):
    """Verify topological ordering: Parent scans must replicate before dependent integrity, reports, and settings."""
    mock_adapter = MockCloudSyncAdapter()
    svc = SyncService(session_factory=test_session, cloud_adapter=mock_adapter)

    # Insert mock records in database so payload extraction succeeds
    async with test_session() as s:
        scan_rec = ScanRecord(
            scan_id="scan-dep-1",
            user_id="user_alpha",
            sha256="abcdef1234567890",
            filename="test.bin",
            file_size_bytes=1024,
            mime_type="application/octet-stream",
            file_type="BINARY",
            status="completed",
            risk_level="SAFE",
            risk_score=5.0,
            engine_status_json="{}",
            raw_result_json="{}",
        )
        s.add(scan_rec)
        await s.commit()

    # Enqueue items in reverse dependency order: setting, report, scan
    await svc.enqueue(entity_type="setting", entity_id="pref_dark_mode", user_id="user_alpha", payload={"dark": True})
    await svc.enqueue(entity_type="report", entity_id="rep-1", user_id="user_alpha", payload={"title": "Summary"})
    await svc.enqueue(entity_type="scan", entity_id="scan-dep-1", user_id="user_alpha")

    # Process batch
    result = await svc.process_ready_items(user_id="user_alpha", limit=10)
    assert result["processed"] == 3
    assert result["synced"] == 3

    # Check order recorded by MockCloudSyncAdapter
    attempts = mock_adapter.sync_attempts
    assert len(attempts) == 3
    assert attempts[0]["entity_type"] == "scan"
    assert attempts[1]["entity_type"] == "report"
    assert attempts[2]["entity_type"] == "setting"


@pytest.mark.anyio
async def test_exponential_backoff_and_failure_transition(test_session):
    """Verify failed replication transitions through RETRYING with backoff and finally FAILED at max_attempts."""
    failing_adapter = MockCloudSyncAdapter(should_fail=True, fail_message="Simulated offline network timeout")
    svc = SyncService(session_factory=test_session, cloud_adapter=failing_adapter)

    # Enqueue a setting
    await svc.enqueue(entity_type="setting", entity_id="timeout_test", user_id="user_beta", payload={"val": 1})

    # First attempt -> RETRYING, attempt_count=1, next_attempt scheduled in future
    res1 = await svc.process_ready_items(user_id="user_beta")
    assert res1["retrying"] == 1
    assert res1["failed"] == 0

    async with test_session() as s:
        rec = (await s.execute(select(SyncQueueRecord).where(SyncQueueRecord.entity_id == "timeout_test"))).scalars().first()
        assert rec.status == "RETRYING"
        assert rec.attempt_count == 1
        assert rec.next_attempt_at is not None
        next_ts = rec.next_attempt_at.replace(tzinfo=UTC) if rec.next_attempt_at.tzinfo is None else rec.next_attempt_at
        assert next_ts > datetime.now(UTC) - timedelta(seconds=5)
        assert "Simulated offline network timeout" in rec.error_message

        # Fast-forward attempt count to 4 and reset next_attempt_at to now
        rec.attempt_count = 4
        rec.next_attempt_at = datetime.now(UTC) - timedelta(seconds=1)
        await s.commit()

    # Next attempt reaches max_attempts (5) -> FAILED
    res2 = await svc.process_ready_items(user_id="user_beta")
    assert res2["failed"] == 1

    async with test_session() as s:
        rec = (await s.execute(select(SyncQueueRecord).where(SyncQueueRecord.entity_id == "timeout_test"))).scalars().first()
        assert rec.status == "FAILED"
        assert rec.attempt_count == 5


@pytest.mark.anyio
async def test_manual_retry_and_retry_all(test_session):
    """Verify manual single-item retry and bulk retry-all reset items to PENDING."""
    svc = SyncService(session_factory=test_session)

    item1 = await svc.enqueue(entity_type="setting", entity_id="k1", user_id="user_gamma", payload={"v": 1})
    item2 = await svc.enqueue(entity_type="setting", entity_id="k2", user_id="user_gamma", payload={"v": 2})

    async with test_session() as s:
        r1 = await s.get(SyncQueueRecord, item1.id)
        r2 = await s.get(SyncQueueRecord, item2.id)
        r1.status = "FAILED"
        r1.attempt_count = 5
        r2.status = "RETRYING"
        r2.attempt_count = 3
        await s.commit()

    # Test single retry
    retried_single = await svc.retry_item(item1.id, user_id="user_gamma")
    assert retried_single is not None
    assert retried_single.status == "PENDING"
    assert retried_single.attempt_count == 0

    # Test retry-all
    retried_count = await svc.retry_all_failed(user_id="user_gamma")
    assert retried_count == 1  # item2 was in RETRYING

    summary = await svc.get_summary(user_id="user_gamma")
    assert summary["pending_count"] == 2
    assert summary["failed_count"] == 0


@pytest.mark.anyio
async def test_crash_recovery(test_session):
    """Verify run_crash_recovery cleans up stranded in-flight scans and resets orphaned SYNCING items."""
    async with test_session() as s:
        # Create an in-flight scan stranded by crash
        stuck_scan = ScanRecord(
            scan_id="stuck-scan-99",
            user_id="user_delta",
            sha256="deadbeef12345678",
            filename="interrupted.bin",
            file_size_bytes=4096,
            mime_type="application/octet-stream",
            file_type="BINARY",
            status="processing",  # stranded
            risk_level="UNKNOWN",
            risk_score=0.0,
            engine_status_json="{}",
            raw_result_json="{}",
        )
        s.add(stuck_scan)

        # Create an orphaned SYNCING item
        stuck_sync = SyncQueueRecord(
            id="sync-stuck-1",
            user_id="user_delta",
            entity_type="setting",
            entity_id="pref_key",
            operation="UPDATE",
            status="SYNCING",  # stranded mid-flight
            attempt_count=1,
            max_attempts=5,
            next_attempt_at=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        s.add(stuck_sync)
        await s.commit()

    # Execute crash recovery in our isolated test_session fixture
    async with test_session() as s:
        stats = await run_crash_recovery(session=s)
        assert stats["recovered_scans"] == 1
        assert stats["recovered_sync_items"] == 1

        recovered_scan = (await s.execute(select(ScanRecord).where(ScanRecord.scan_id == "stuck-scan-99"))).scalars().first()
        assert recovered_scan.status == "failed"
        assert "Scan interrupted" in recovered_scan.raw_result_json

        recovered_sync = (await s.execute(select(SyncQueueRecord).where(SyncQueueRecord.id == "sync-stuck-1"))).scalars().first()
        assert recovered_sync.status == "RETRYING"
        assert "interrupted by process restart" in recovered_sync.error_message


@pytest.mark.anyio
async def test_tenant_isolation(test_session):
    """Verify strict tenant isolation: User A cannot see or retry User B's sync queue items."""
    svc = SyncService(session_factory=test_session)

    item_a = await svc.enqueue(entity_type="setting", entity_id="user_a_key", user_id="tenant_a", payload={"a": 1})
    item_b = await svc.enqueue(entity_type="setting", entity_id="user_b_key", user_id="tenant_b", payload={"b": 2})

    # User A queue list
    queue_a = await svc.get_queue(user_id="tenant_a")
    assert len(queue_a) == 1
    assert queue_a[0].id == item_a.id

    # User B queue list
    queue_b = await svc.get_queue(user_id="tenant_b")
    assert len(queue_b) == 1
    assert queue_b[0].id == item_b.id

    # User A attempting to retry User B's item must return None (access denied)
    retry_result = await svc.retry_item(item_b.id, user_id="tenant_a")
    assert retry_result is None
