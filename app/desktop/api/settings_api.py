"""
Application preferences API: theme, language, window size, sidebar state,
start with Windows and the Pomodoro focus task of each user.
"""

# Standard library
from __future__ import annotations
import json
from typing import Any

# Third-party
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import require_user
from desktop.config import config
from desktop.core import autostart
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import Setting
from desktop.database.serializers import parse_focus
from desktop.utills.window_sizes import WINDOW_SIZE_KEY, normalize_window_size

THEMES: tuple[str, ...] = ("light", "dark")
LANGUAGES: tuple[str, ...] = ("es", "en")

_THEME_KEY: str = "theme"
_LANGUAGE_KEY: str = "language"
_FOCUS_KEY: str = "focus"
_SIDEBAR_KEY: str = "sidebar_collapsed"


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


def _focus_key(user_id: str) -> str:
    """Return the preference key that stores a user's Pomodoro focus task."""
    return f"{_FOCUS_KEY}:{user_id}"


def read_focus(session: Session, user_id: str) -> dict[str, str] | None:
    """Return the task a user focused in the Pomodoro view, when any."""
    return parse_focus(read_setting(session, _focus_key(user_id)))


def set_focus(focus: dict[str, Any] | None) -> None:
    """Persist or clear the task the signed-in user focused in the Pomodoro view."""
    with session_scope() as session:
        key: str = _focus_key(require_user(session).id)
        if focus is None:
            write_setting(session, key, "")
            return
        payload: dict[str, str] = {
            "id": str(focus.get("id") or ""),
            "title": str(focus.get("title") or ""),
        }
        write_setting(session, key, json.dumps(payload))


def read_sidebar_collapsed(session: Session) -> bool:
    """Return whether the sidebar was left collapsed, collapsed being the default."""
    return read_setting(session, _SIDEBAR_KEY, "true") != "false"


def set_sidebar_collapsed(collapsed: bool) -> dict[str, bool]:
    """Persist whether the sidebar is collapsed."""
    with session_scope() as session:
        write_setting(session, _SIDEBAR_KEY, "true" if collapsed else "false")
    return {"collapsed": bool(collapsed)}


def get_autostart() -> dict[str, bool]:
    """Return whether the application starts with Windows."""
    return {"enabled": autostart.is_enabled()}


def set_autostart(enabled: bool) -> dict[str, bool]:
    """Register or unregister the application to start with Windows."""
    return {"enabled": autostart.set_enabled(bool(enabled))}
