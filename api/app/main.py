from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import os
import sqlite3
from pathlib import Path

import urllib3
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.repository import (
    find_task,
    insert_task,
    list_tasks_by_owner,
    summarize_owner_tasks,
)
from app.schemas import (
    BackendHealthResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskSummaryResponse,
    UploadResponse,
)
from app.security import validate_jwt_configuration, verified_identity
from app.services import (
    resolve_create_owner,
    resolve_read_owner,
    summarize_tasks,
    to_task_response,
)
from app.uploads import store_uploaded_file

TASK_CREATION_FAILED_STATUS = 500
TASK_CREATION_FAILED_MESSAGE = "Task could not be created"


def create_app(db_path: str | None = None, upload_dir: str | None = None) -> FastAPI:
    selected_db = db_path or os.getenv("WORKSHOP_DB_PATH", "./data/workshop.db")
    selected_uploads = upload_dir or os.getenv("WORKSHOP_UPLOAD_DIR", "./uploads")
    Path(selected_db).parent.mkdir(parents=True, exist_ok=True)
    Path(selected_uploads).mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(selected_db, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, owner TEXT NOT NULL, priority TEXT NOT NULL, created_at TEXT NOT NULL)")
    count = connection.execute("SELECT COUNT(*) AS total FROM tasks").fetchone()["total"]
    if count == 0:
        connection.execute("INSERT INTO tasks(title,description,status,owner,priority,created_at) VALUES ('Refactor login','Separar responsabilidades en frontend','TODO','student','HIGH',datetime('now'))")
        connection.execute("INSERT INTO tasks(title,description,status,owner,priority,created_at) VALUES ('Review API','Revisar seguridad de endpoints','IN_PROGRESS','student','MEDIUM',datetime('now'))")
        connection.execute("INSERT INTO tasks(title,description,status,owner,priority,created_at) VALUES ('Trainer notes','Preparar retrospectiva','TODO','trainer','LOW',datetime('now'))")
        connection.commit()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        try:
            validate_jwt_configuration()
        except RuntimeError:
            connection.close()
            raise
        try:
            yield
        finally:
            connection.close()

    app = FastAPI(
        title="Workshop Requirements API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.connection = connection
    app.state.upload_dir = selected_uploads
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/tasks", response_model=list[TaskResponse])
    def list_tasks(
        owner: str | None = Query(default=None),
        identity: dict[str, str] = Depends(verified_identity),
    ) -> list[TaskResponse]:
        requested_owner = resolve_read_owner(identity, owner)
        rows = list_tasks_by_owner(connection, requested_owner)
        return [to_task_response(row) for row in rows]

    @app.post("/api/tasks", status_code=201, response_model=TaskResponse)
    def create_task(
        payload: TaskCreateRequest,
        identity: dict[str, str] = Depends(verified_identity),
    ) -> TaskResponse:
        requested_owner = (
            payload.owner if "owner" in payload.model_fields_set else None
        )
        task_owner = resolve_create_owner(identity, requested_owner)
        task_id = insert_task(connection, payload, task_owner)
        row = find_task(connection, task_id)
        if row is None:
            raise HTTPException(
                status_code=TASK_CREATION_FAILED_STATUS,
                detail=TASK_CREATION_FAILED_MESSAGE,
            )
        return to_task_response(row)

    @app.get("/api/summary", response_model=TaskSummaryResponse)
    def summary(
        owner: str | None = Query(default=None),
        identity: dict[str, str] = Depends(verified_identity),
    ) -> TaskSummaryResponse:
        requested_owner = resolve_read_owner(identity, owner)
        rows = summarize_owner_tasks(connection, requested_owner)
        return summarize_tasks(requested_owner, rows)

    @app.post("/api/requirements", status_code=201, response_model=UploadResponse)
    async def upload_requirement(
        file: UploadFile = File(...),
        identity: dict[str, str] = Depends(verified_identity),
    ) -> UploadResponse:
        filename, target, file_size = await store_uploaded_file(selected_uploads, file)
        return UploadResponse(
            owner=identity["username"],
            file_name=filename,
            stored_at=str(target),
            size=file_size,
        )

    @app.get("/api/backend-health", response_model=BackendHealthResponse)
    def backend_health(
        identity: dict[str, str] = Depends(verified_identity),
    ) -> BackendHealthResponse:
        url = os.getenv("AUTH_HEALTH_URL", "http://localhost:8080/q/health")
        try:
            response = urllib3.PoolManager().request("GET", url, timeout=3.0)
            return BackendHealthResponse(
                requested_by=identity["username"],
                status=response.status,
                body=response.data.decode("utf-8"),
            )
        except Exception as error:
            return BackendHealthResponse(
                requested_by=identity["username"], status=0, body=str(error)
            )

    return app


app = create_app()
