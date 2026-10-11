"""
Application preferences API: theme, language and Pomodoro focus task.
"""

# Standard library
from __future__ import annotations
import json
from typing import Any

# Third-party
from sqlalchemy.orm import Session

# Project imports
from desktop.config import config
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import Setting
from desktop.utills.window_sizes import WINDOW_SIZE_KEY, normalize_window_size

THEMES: tuple[str, ...] = ("light", "dark")
LANGUAGES: tuple[str, ...] = ("es", "en")

_THEME_KEY: str = "theme"
_LANGUAGE_KEY: str = "language"
_FOCUS_KEY: str = "focus"


def read_setting(session: Session, key: str, default: str = "") -> str:
    """Return a stored preference or the default when it is missing."""
    setting: Setting | None = session.get(Setting, key)
    return setting.value if setting is not None else default


def write_setting(session: Session, key: str, value: str) -> None:
    """Create or update a stored preference."""
    setting: Setting | None = session.get(Setting, key)
    if setting is None:
        session.add(Setting(key=key, value=value))
    else:
        setting.value = value


def read_theme(session: Session) -> str:
    """Return the stored theme, falling back to the default one."""
    theme: str = read_setting(session, _THEME_KEY, config.default_theme)
    return theme if theme in THEMES else config.default_theme


def read_language(session: Session) -> str:
    """Return the stored language, falling back to the default one."""
    language: str = read_setting(session, _LANGUAGE_KEY, config.default_language)
    return language if language in LANGUAGES else config.default_language


def read_window_size(session: Session) -> dict[str, int]:
    """Return the stored window size, falling back to the default one."""
    raw_value: str = read_setting(session, WINDOW_SIZE_KEY, "")
    parsed: Any = None
    try:
        parsed = json.loads(raw_value) if raw_value else None
    except ValueError:
        parsed = None
    width: int
    height: int
    width, height = normalize_window_size(parsed)
    return {"width": width, "height": height}


def write_window_size(session: Session, width: int, height: int) -> dict[str, int]:
    """Persist the window size after normalizing it to an allowed value."""
    normalized_width: int
    normalized_height: int
    normalized_width, normalized_height = normalize_window_size(
        {"width": width, "height": height}
    )
    write_setting(
        session, WINDOW_SIZE_KEY, json.dumps({"width": normalized_width, "height": normalized_height})
    )
    return {"width": normalized_width, "height": normalized_height}


def get_theme() -> dict[str, str]:
    """Return the active theme."""
    with session_scope() as session:
        return {"theme": read_theme(session)}


def set_theme(theme: str) -> dict[str, str]:
    """Persist the active theme."""
    if theme not in THEMES:
        raise ApiError("invalid_theme")
    with session_scope() as session:
        write_setting(session, _THEME_KEY, theme)
    return {"theme": theme}


def get_language() -> dict[str, str]:
    """Return the active language."""
    with session_scope() as session:
        return {"language": read_language(session)}


def set_language(language: str) -> dict[str, str]:
    """Persist the active language."""
    if language not in LANGUAGES:
        raise ApiError("invalid_language")
    with session_scope() as session:
        write_setting(session, _LANGUAGE_KEY, language)
    return {"language": language}


def set_focus(focus: dict[str, Any] | None) -> None:
    """Persist or clear the task focused in the Pomodoro view."""
    with session_scope() as session:
        if focus is None:
            write_setting(session, _FOCUS_KEY, "")
            return
        payload: dict[str, str] = {
            "id": str(focus.get("id") or ""),
            "title": str(focus.get("title") or ""),
        }
        write_setting(session, _FOCUS_KEY, json.dumps(payload))
