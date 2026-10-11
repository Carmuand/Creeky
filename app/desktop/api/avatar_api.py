"""
Profile photo API.

Photos are files stored per user next to the database. The frontend asks
the backend to pick one through a native dialog and loads it back as a
data URL.
"""

# Standard library
from __future__ import annotations
import base64
import shutil
from pathlib import Path
from typing import Any

# Third-party
import webview

# Project imports
from desktop.api.auth_api import require_user
from desktop.config import config
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import User
from desktop.database.serializers import serialize_user
from desktop.utills.logger import log, Tags

MAX_AVATAR_BYTES: int = 2 * 1024 * 1024
_MIME_TYPES: dict[str, str] = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}
_FILE_TYPES: tuple[str, ...] = ("Images (*.png;*.jpg;*.jpeg;*.gif;*.webp;*.bmp)",)


def _stored_path(user: User) -> Path | None:
    """Return the photo file of a user when it exists."""
    if not user.avatar:
        return None
    path: Path = config.avatars_dir / Path(user.avatar).name
    return path if path.is_file() else None


def _remove_file(user: User) -> None:
    """Delete the photo file of a user, ignoring a missing or locked file."""
    path: Path | None = _stored_path(user)
    if path is None:
        return
    try:
        path.unlink()
    except OSError as error:
        log("WARNING", Tags.AUTH, f"Could not delete avatar {path.name}: {error!r}")


def pick_avatar() -> dict[str, Any]:
    """
    Let the signed-in user choose a photo through a native dialog and store it.

    Returns:
        ``cancelled`` when the dialog was dismissed, otherwise the updated user.
    """
    with session_scope() as session:
        require_user(session)
    if not webview.windows:
        raise ApiError("dialog_unavailable")
    chosen: Any = webview.windows[0].create_file_dialog(
        webview.FileDialog.OPEN, file_types=_FILE_TYPES
    )
    if not chosen:
        return {"cancelled": True}
    source: Path = Path(chosen if isinstance(chosen, str) else chosen[0])
    extension: str = source.suffix.lower()
    if extension not in _MIME_TYPES:
        raise ApiError("avatar_invalid_type")
    try:
        size: int = source.stat().st_size
    except OSError as error:
        raise ApiError("avatar_unreadable") from error
    if size > MAX_AVATAR_BYTES:
        raise ApiError("avatar_too_large")
    with session_scope() as session:
        user: User = require_user(session)
        _remove_file(user)
        config.avatars_dir.mkdir(parents=True, exist_ok=True)
        filename: str = f"{user.id}{extension}"
        try:
            shutil.copyfile(source, config.avatars_dir / filename)
        except OSError as error:
            log("ERROR", Tags.AUTH, f"Could not store avatar: {error!r}")
            raise ApiError("avatar_unreadable") from error
        user.avatar = filename
        log("SUCCESS", Tags.AUTH, f"Avatar stored for {user.id}")
        return {"cancelled": False, "user": serialize_user(user)}


def get_avatar() -> dict[str, str | None]:
    """Return the photo of the signed-in user as a data URL, or None when there is none."""
    with session_scope() as session:
        user: User = require_user(session)
        path: Path | None = _stored_path(user)
    if path is None:
        return {"dataUrl": None}
    try:
        encoded: str = base64.b64encode(path.read_bytes()).decode("ascii")
    except OSError as error:
        raise ApiError("avatar_unreadable") from error
    return {"dataUrl": f"data:{_MIME_TYPES.get(path.suffix.lower(), 'image/png')};base64,{encoded}"}


def remove_avatar() -> dict[str, Any]:
    """Remove the photo of the signed-in user."""
    with session_scope() as session:
        user: User = require_user(session)
        _remove_file(user)
        user.avatar = None
        return serialize_user(user)


def delete_avatar_file(user: User) -> None:
    """Delete the photo file of an account that is being removed."""
    _remove_file(user)
