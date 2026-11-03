from __future__ import annotations

import sqlite3

from app.schemas import TaskCreateRequest

TASK_COLUMNS = "id, title, description, status, owner, priority, created_at"


def list_tasks_by_owner(
    connection: sqlite3.Connection, owner: str
) -> list[sqlite3.Row]:
    query = f"SELECT {TASK_COLUMNS} FROM tasks WHERE owner = ? ORDER BY id"
    return connection.execute(query, (owner,)).fetchall()


def insert_task(
    connection: sqlite3.Connection, task: TaskCreateRequest, owner: str
) -> int:
    cursor = connection.execute(
        "INSERT INTO tasks(title, description, status, owner, priority, created_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'))",
        (task.title, task.description, task.status, owner, task.priority),
    )
    connection.commit()
    task_id = cursor.lastrowid
    if task_id is None:
        raise sqlite3.DatabaseError("Inserted task has no generated ID")
    return task_id


def find_task(connection: sqlite3.Connection, task_id: int) -> sqlite3.Row | None:
    query = f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?"
    return connection.execute(query, (task_id,)).fetchone()


def summarize_owner_tasks(
    connection: sqlite3.Connection, owner: str
) -> list[sqlite3.Row]:
    return connection.execute(
        "SELECT status, priority FROM tasks WHERE owner = ?", (owner,)
    ).fetchall()
