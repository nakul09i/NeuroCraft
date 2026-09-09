"""Synchronization API routes for offline-first queue management and cloud replication."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from neurocraft_types import UserContext
from pydantic import BaseModel, ConfigDict

from neurocraft_api.auth import get_optional_user
from neurocraft_api.sync.service import get_sync_service

router = APIRouter(prefix="/api/v1/sync", tags=["Sync"])


class SyncItemResponse(BaseModel):
    id: str
    user_id: str | None = None
    entity_type: str
    entity_id: str
    operation: str
    status: str
    attempt_count: int
    max_attempts: int
    last_attempt_at: str | None = None
    next_attempt_at: str | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class SyncSummaryResponse(BaseModel):
    counts: dict[str, int]
    pending_count: int
    failed_count: int
    synced_count: int
    last_synced_at: str | None = None
    is_syncing: bool
    status: str  # "online", "offline", "syncing", "synced"


class FlushResultResponse(BaseModel):
    processed: int
    synced: int
    retrying: int
    failed: int


@router.get(
    "/status",
    response_model=SyncSummaryResponse,
    summary="Get offline sync queue status and metrics",
)
async def get_sync_status(
    user: UserContext | None = Depends(get_optional_user),
) -> SyncSummaryResponse:
    """Retrieve summary of local sync queue, pending uploads, and retry statistics."""
    user_id = user.user_id if user else None
    svc = get_sync_service()
    summary = await svc.get_summary(user_id=user_id)

    # Compute overall status indicator
    if summary["is_syncing"]:
        status_label = "syncing"
    elif summary["failed_count"] > 0:
        status_label = "failed"
    elif summary["pending_count"] > 0:
        status_label = "pending"
    else:
        status_label = "synced"

    return SyncSummaryResponse(
        counts=summary["counts"],
        pending_count=summary["pending_count"],
        failed_count=summary["failed_count"],
        synced_count=summary["synced_count"],
        last_synced_at=summary["last_synced_at"],
        is_syncing=summary["is_syncing"],
        status=status_label,
    )


@router.get(
    "/queue",
    response_model=list[SyncItemResponse],
    summary="List local sync queue items",
)
async def list_sync_queue(
    status_filter: str | None = Query(None, alias="status", description="Filter by status (PENDING, SYNCING, SYNCED, RETRYING, FAILED)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: UserContext | None = Depends(get_optional_user),
) -> list[SyncItemResponse]:
    """List persistent synchronization queue items for the authenticated user."""
    user_id = user.user_id if user else None
    svc = get_sync_service()
    items = await svc.get_queue(
        user_id=user_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )

    return [
        SyncItemResponse(
            id=item.id,
            user_id=item.user_id,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            operation=item.operation,
            status=item.status,
            attempt_count=item.attempt_count,
            max_attempts=item.max_attempts,
            last_attempt_at=item.last_attempt_at.isoformat() if item.last_attempt_at else None,
            next_attempt_at=item.next_attempt_at.isoformat() if item.next_attempt_at else None,
            error_message=item.error_message,
            created_at=item.created_at.isoformat() if item.created_at else "",
            updated_at=item.updated_at.isoformat() if item.updated_at else "",
        )
        for item in items
    ]


@router.post(
    "/flush",
    response_model=FlushResultResponse,
    summary="Flush eligible pending items to cloud replication",
)
async def flush_sync_queue(
    user: UserContext | None = Depends(get_optional_user),
) -> FlushResultResponse:
    """Manually or reactively trigger a synchronization pass for ready queue items."""
    user_id = user.user_id if user else None
    svc = get_sync_service()
    res = await svc.process_ready_items(user_id=user_id, limit=50)
    return FlushResultResponse(**res)


@router.post(
    "/retry/{item_id}",
    response_model=SyncItemResponse,
    summary="Retry a specific failed sync item",
)
async def retry_sync_item(
    item_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> SyncItemResponse:
    """Reset a failed or retrying queue item to PENDING for immediate retry."""
    user_id = user.user_id if user else None
    svc = get_sync_service()
    item = await svc.retry_item(item_id, user_id=user_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sync queue item '{item_id}' not found or access denied.",
        )

    return SyncItemResponse(
        id=item.id,
        user_id=item.user_id,
        entity_type=item.entity_type,
        entity_id=item.entity_id,
        operation=item.operation,
        status=item.status,
        attempt_count=item.attempt_count,
        max_attempts=item.max_attempts,
        last_attempt_at=item.last_attempt_at.isoformat() if item.last_attempt_at else None,
        next_attempt_at=item.next_attempt_at.isoformat() if item.next_attempt_at else None,
        error_message=item.error_message,
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
    )


@router.post(
    "/retry-all",
    summary="Retry all failed or retrying items for the user",
)
async def retry_all_failed_items(
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, int]:
    """Reset all FAILED and RETRYING items in user's queue to PENDING."""
    user_id = user.user_id if user else None
    svc = get_sync_service()
    count = await svc.retry_all_failed(user_id=user_id)
    return {"retried_count": count}
