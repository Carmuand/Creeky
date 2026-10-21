"""Sound storage and playback helpers for application alarms."""

# Standard library
from __future__ import annotations
import base64
import json
import shutil
import uuid
from pathlib import Path
from typing import Any

# Third-party
import webview

# Project imports
from desktop.config import config
from desktop.core.errors import ApiError
from desktop.utills.logger import log, Tags


_MIME_TYPES: dict[str, str] = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}
_FILE_TYPES: tuple[str, ...] = ("Audio (*.wav;*.mp3;*.ogg;*.flac)",)
_MAX_SOUND_BYTES: int = 10 * 1024 * 1024
_LABELS_FILE: str = "_labels.json"


def _sounds_dir() -> Path:
    """Return the directory that stores imported alarm sounds."""
    return config.sounds_dir


def _builtin_dir() -> Path | None:
    """Return the directory that ships built-in alarm sounds, when available."""
    candidates: tuple[Path, ...] = (
        Path(__file__).resolve().parent.parent.parent / "public" / "assets" / "sounds",
        Path(__file__).resolve().parent.parent.parent / "dist" / "assets" / "sounds",
    )
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return None


def _labels_path() -> Path:
    """Return the path of the sidecar file that stores display labels."""
    return _sounds_dir() / _LABELS_FILE


def _read_labels() -> dict[str, dict[str, Any]]:
    """Read the metadata of imported sounds."""
    path: Path = _labels_path()
    if not path.is_file():
        return {}
    try:
        data: Any = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    result: dict[str, dict[str, Any]] = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[str(key)] = {"label": value, "trimStart": 0.0, "trimEnd": 0.0}
        elif isinstance(value, dict):
            result[str(key)] = {
                "label": str(value.get("label") or Path(str(key)).stem),
                "trimStart": float(value.get("trimStart") or 0.0),
                "trimEnd": float(value.get("trimEnd") or 0.0),
            }
    return result


def _write_labels(labels: dict[str, dict[str, Any]]) -> None:
    """Persist the metadata of imported sounds."""
    _sounds_dir().mkdir(parents=True, exist_ok=True)
    _labels_path().write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _label_for(name: str) -> str:
    """Return the display label of a sound."""
    labels: dict[str, dict[str, Any]] = _read_labels()
    if name in labels:
        return str(labels[name].get("label") or Path(name).stem)
    return Path(name).stem


def _trim_for(name: str) -> tuple[float, float]:
    """Return the trim range of a sound."""
    labels: dict[str, dict[str, Any]] = _read_labels()
    if name in labels:
        entry: dict[str, Any] = labels[name]
        return float(entry.get("trimStart") or 0.0), float(entry.get("trimEnd") or 0.0)
    return 0.0, 0.0


def _resolve_sound(name: str) -> Path | None:
    """Return the path of a sound, built-in or imported."""
    imported: Path = _sounds_dir() / name
    if imported.is_file():
        return imported
    directory: Path | None = _builtin_dir()
    if directory is None:
        return None
    path: Path = directory / name
    return path if path.is_file() else None


def _builtin_dir() -> Path | None:
    """Return the directory that ships built-in alarm sounds, when available."""
    candidates: tuple[Path, ...] = (
        Path(__file__).resolve().parent.parent.parent / "public" / "assets" / "sounds",
        Path(__file__).resolve().parent.parent.parent / "dist" / "assets" / "sounds",
    )
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return None


def list_sounds() -> list[dict[str, Any]]:
    """Return the available alarm sounds."""
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    directory: Path | None = _builtin_dir()
    if directory is not None:
        for path in sorted(directory.iterdir()):
            if path.is_file() and path.suffix.lower() in _MIME_TYPES:
                if path.name not in seen:
                    result.append(
                        {"name": path.name, "label": path.stem, "trimStart": 0.0, "trimEnd": 0.0}
                    )
                    seen.add(path.name)
    imported_dir: Path = _sounds_dir()
    if imported_dir.is_dir():
        for path in sorted(imported_dir.iterdir()):
            if not path.is_file() or path.suffix.lower() not in _MIME_TYPES:
                continue
            if path.name in seen:
                continue
            trim_start: float
            trim_end: float
            trim_start, trim_end = _trim_for(path.name)
            result.append(
                {
                    "name": path.name,
                    "label": _label_for(path.name),
                    "trimStart": trim_start,
                    "trimEnd": trim_end,
                    "builtin": False,
                }
            )
            seen.add(path.name)
    if not result:
        result.append({"name": "default.wav", "label": "default", "trimStart": 0.0, "trimEnd": 0.0, "builtin": True})
    return result


def get_sound_data_url(name: str) -> dict[str, Any]:
    """Return a sound file as a base64 data URL for playback."""
    path: Path | None = _resolve_sound(name)
    if path is None:
        raise ApiError("sound_not_found")
    mime: str = _MIME_TYPES.get(path.suffix.lower(), "audio/wav")
    try:
        encoded: str = base64.b64encode(path.read_bytes()).decode("ascii")
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not read sound {path.name}: {error!r}")
        raise ApiError("sound_unreadable") from error
    trim_start: float
    trim_end: float
    trim_start, trim_end = _trim_for(name)
    return {
        "dataUrl": f"data:{mime};base64,{encoded}",
        "trimStart": trim_start,
        "trimEnd": trim_end,
    }


def pick_sound() -> dict[str, Any]:
    """Let the user choose an audio file and store it under a unique name."""
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
        raise ApiError("sound_invalid_type")
    try:
        size: int = source.stat().st_size
    except OSError as error:
        raise ApiError("sound_unreadable") from error
    if size > _MAX_SOUND_BYTES:
        raise ApiError("sound_too_large")
    _sounds_dir().mkdir(parents=True, exist_ok=True)
    stored_name: str = f"{uuid.uuid4().hex}{extension}"
    target: Path = _sounds_dir() / stored_name
    try:
        shutil.copyfile(source, target)
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not store sound: {error!r}")
        raise ApiError("sound_unreadable") from error
    labels: dict[str, dict[str, Any]] = _read_labels()
    labels[stored_name] = {"label": source.stem, "trimStart": 0.0, "trimEnd": 0.0}
    _write_labels(labels)
    log("INFO", Tags.MAIN, f"Sound stored: {stored_name}")
    return {"name": stored_name, "label": source.stem, "trimStart": 0.0, "trimEnd": 0.0, "builtin": False}


def rename_sound(name: str, label: str) -> dict[str, str]:
    """Rename the display label of an imported sound."""
    path: Path | None = _resolve_sound(name)
    if path is None or _resolve_imported(name) is None:
        raise ApiError("sound_not_found")
    clean: str = label.strip()
    if not clean:
        raise ApiError("sound_invalid_name")
    labels: dict[str, dict[str, Any]] = _read_labels()
    entry: dict[str, Any] = labels.get(name, {"trimStart": 0.0, "trimEnd": 0.0})
    entry["label"] = clean
    labels[name] = entry
    _write_labels(labels)
    return {"name": name, "label": clean}


def set_sound_trim(name: str, trim_start: float, trim_end: float) -> dict[str, Any]:
    """Persist the trim range of an imported sound."""
    path: Path | None = _resolve_sound(name)
    if path is None or _resolve_imported(name) is None:
        raise ApiError("sound_not_found")
    labels: dict[str, dict[str, Any]] = _read_labels()
    entry: dict[str, Any] = labels.get(name, {"label": Path(name).stem})
    entry["trimStart"] = max(0.0, float(trim_start))
    entry["trimEnd"] = max(0.0, float(trim_end))
    labels[name] = entry
    _write_labels(labels)
    return {"name": name, "trimStart": entry["trimStart"], "trimEnd": entry["trimEnd"]}


def delete_sound(name: str) -> dict[str, bool]:
    """Delete an imported sound and its metadata."""
    if _resolve_imported(name) is None:
        raise ApiError("sound_not_found")
    if _resolve_builtin(name) is not None:
        raise ApiError("sound_builtin")
    try:
        path.unlink()
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not delete sound {name}: {error!r}")
        raise ApiError("sound_unreadable") from error
    labels: dict[str, dict[str, Any]] = _read_labels()
    labels.pop(name, None)
    _write_labels(labels)
    log("INFO", Tags.MAIN, f"Sound deleted: {name}")
    return {"deleted": True}


def _resolve_imported(name: str) -> Path | None:
    """Return the path of an imported sound, or None when it is missing."""
    path: Path = _sounds_dir() / name
    return path if path.is_file() else None
