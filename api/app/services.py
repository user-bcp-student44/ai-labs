from __future__ import annotations

import sqlite3
from collections.abc import Sequence

from fastapi import HTTPException

from app.schemas import TaskResponse, TaskSummaryResponse

COMPLETED_STATUSES = frozenset({"DONE", "ARCHIVED"})
TRAINER_ROLE = "TRAINER"
FORBIDDEN_OWNER_STATUS = 403
FORBIDDEN_OWNER_MESSAGE = "Forbidden owner"


def resolve_read_owner(
    identity: dict[str, str], requested_owner: str | None
) -> str:
    authenticated_owner = identity["username"]
    if not requested_owner:
        return authenticated_owner
    if identity["role"] == TRAINER_ROLE:
        return requested_owner
    _ensure_owner_matches_identity(authenticated_owner, requested_owner)
    return authenticated_owner


def resolve_create_owner(
    identity: dict[str, str], requested_owner: str | None
) -> str:
    authenticated_owner = identity["username"]
    _ensure_owner_matches_identity(authenticated_owner, requested_owner)
    return authenticated_owner


def _ensure_owner_matches_identity(
    authenticated_owner: str, requested_owner: str | None
) -> None:
    if requested_owner is None or requested_owner == authenticated_owner:
        return
    raise HTTPException(
        status_code=FORBIDDEN_OWNER_STATUS, detail=FORBIDDEN_OWNER_MESSAGE
    )


def to_task_response(row: sqlite3.Row) -> TaskResponse:
    return TaskResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        owner=row["owner"],
        priority=row["priority"],
        created_at=row["created_at"],
    )


def summarize_tasks(
    owner: str, rows: Sequence[sqlite3.Row]
) -> TaskSummaryResponse:
    status_counts: dict[str, int] = {}
    high_priority_open = 0

    for row in rows:
        status = row["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
        if row["priority"] == "HIGH" and status not in COMPLETED_STATUSES:
            high_priority_open += 1

    return TaskSummaryResponse(
        owner=owner,
        total=len(rows),
        by_status=status_counts,
        high_priority_open=high_priority_open,
    )
