from __future__ import annotations

import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
CHUNK_SIZE = 64 * 1024
MAX_FILENAME_LENGTH = 255
ALLOWED_EXTENSIONS = frozenset({".txt", ".md"})
INVALID_UPLOAD_STATUS = 400
UPLOAD_TOO_LARGE_STATUS = 413
INVALID_UPLOAD_MESSAGE = "Invalid upload"
UPLOAD_TOO_LARGE_MESSAGE = "Uploaded file is too large"


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )

    normalized_separators = filename.replace("\\", "/")
    if "/" in normalized_separators:
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )

    normalized_name = re.sub(r"[^A-Za-z0-9._-]", "_", normalized_separators)
    if normalized_name in {"", ".", ".."}:
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )
    if len(normalized_name) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )
    return normalized_name


def ensure_allowed_extension(filename: str) -> None:
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )


def resolve_target(upload_dir: str, filename: str) -> Path:
    base_directory = Path(upload_dir).resolve()
    target = (base_directory / filename).resolve()
    if not target.is_relative_to(base_directory):
        raise HTTPException(
            status_code=INVALID_UPLOAD_STATUS, detail=INVALID_UPLOAD_MESSAGE
        )
    return target


async def read_limited(upload: UploadFile) -> bytes:
    chunks: list[bytes] = []
    total_size = 0

    while chunk := await upload.read(CHUNK_SIZE):
        total_size += len(chunk)
        if total_size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=UPLOAD_TOO_LARGE_STATUS,
                detail=UPLOAD_TOO_LARGE_MESSAGE,
            )
        chunks.append(chunk)

    return b"".join(chunks)


async def store_uploaded_file(
    upload_dir: str, upload: UploadFile
) -> tuple[str, Path, int]:
    filename = sanitize_filename(upload.filename)
    ensure_allowed_extension(filename)
    target = resolve_target(upload_dir, filename)
    content = await read_limited(upload)
    target.write_bytes(content)
    return filename, target, len(content)
