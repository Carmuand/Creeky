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

import webview

# Project imports
from desktop.api.auth_api import require_user
from desktop.config import config
from desktop.core import autostart
from desktop.core.errors import ApiError
from desktop.core.tray import tray
from desktop.database.engine import session_scope
from desktop.database.models import Setting
from desktop.database.serializers import parse_focus
from desktop.utills.window_sizes import WINDOW_SIZE_KEY, normalize_window_size
import webview

THEMES: tuple[str, ...] = ("light", "dark")
LANGUAGES: tuple[str, ...] = ("es", "en")

_THEME_KEY: str = "theme"
_LANGUAGE_KEY: str = "language"
_FOCUS_KEY: str = "focus"
_SIDEBAR_KEY: str = "sidebar_collapsed"
_START_MINIMIZED_KEY: str = "start_minimized"
_MINIMIZE_ON_CLOSE_KEY: str = "minimize_on_close"
_POMODORO_ALARM_ENABLED_KEY: str = "pomodoro_alarm_enabled"
_POMODORO_ALARM_VOLUME_KEY: str = "pomodoro_alarm_volume"
_POMODORO_ALARM_SOUND_KEY: str = "pomodoro_alarm_sound"
_POMODORO_ALARM_REPEAT_KEY: str = "pomodoro_alarm_repeat"
_POMODORO_ALARM_REPEAT_COUNT_KEY: str = "pomodoro_alarm_repeat_count"
_POMODORO_ALARM_REPEAT_DURATION_KEY: str = "pomodoro_alarm_repeat_duration"


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


def read_start_minimized(session: Session) -> bool:
    """Return whether the application should start hidden at Windows sign-in."""
    return read_setting(session, _START_MINIMIZED_KEY, "false") == "true"


def read_minimize_on_close(session: Session) -> bool:
    """Return whether closing the window keeps the application in the tray."""
    return read_setting(session, _MINIMIZE_ON_CLOSE_KEY, "false") == "true"


def get_autostart() -> dict[str, bool]:
    """Return whether the application starts with Windows."""
    return {"enabled": autostart.is_enabled()}


def set_autostart(enabled: bool) -> dict[str, bool]:
    """Register or unregister the application to start with Windows."""
    return {"enabled": autostart.set_enabled(bool(enabled))}


def get_startup_options() -> dict[str, bool]:
    """Return the startup behavior preferences."""
    with session_scope() as session:
        return {
            "startMinimized": read_start_minimized(session),
            "minimizeOnClose": read_minimize_on_close(session),
        }


def set_start_minimized(enabled: bool) -> dict[str, bool]:
    """Persist whether the application should start hidden at Windows sign-in."""
    with session_scope() as session:
        write_setting(
            session, _START_MINIMIZED_KEY, "true" if bool(enabled) else "false"
        )
    return {"startMinimized": bool(enabled)}


def set_minimize_on_close(enabled: bool) -> dict[str, bool]:
    """Persist whether closing the window keeps the application in the tray."""
    with session_scope() as session:
        write_setting(
            session, _MINIMIZE_ON_CLOSE_KEY, "true" if bool(enabled) else "false"
        )
        language: str = read_language(session)
    if enabled:
        window: webview.Window | None = (
            webview.windows[0] if webview.windows else None
        )
        if window is not None:
            if tray.is_running():
                tray.set_close_to_tray(True)
            else:
                tray.start(window, language, close_to_tray=True, visible=True)
    else:
        tray.stop()
    return {"minimizeOnClose": bool(enabled)}


def read_pomodoro_alarm_enabled(session: Session) -> bool:
    """Return whether the Pomodoro alarm plays on session completion."""
    return read_setting(session, _POMODORO_ALARM_ENABLED_KEY, "true") == "true"


def read_pomodoro_alarm_volume(session: Session) -> int:
    """Return the Pomodoro alarm volume, clamped to the 0-100 range."""
    raw: str = read_setting(session, _POMODORO_ALARM_VOLUME_KEY, "80")
    try:
        value: int = int(raw)
    except ValueError:
        return 80
    return max(0, min(100, value))


def read_pomodoro_alarm_sound(session: Session) -> str:
    """Return the file name of the Pomodoro alarm sound."""
    value: str = read_setting(session, _POMODORO_ALARM_SOUND_KEY, "default.wav")
    return value or "default.wav"


def read_pomodoro_alarm_repeat(session: Session) -> bool:
    """Return whether the Pomodoro alarm repeats."""
    return read_setting(session, _POMODORO_ALARM_REPEAT_KEY, "false") == "true"


def read_pomodoro_alarm_repeat_count(session: Session) -> int:
    """Return the number of alarm repetitions."""
    raw: str = read_setting(session, _POMODORO_ALARM_REPEAT_COUNT_KEY, "3")
    try:
        value: int = int(raw)
    except ValueError:
        return 3
    return max(1, min(20, value))


def read_pomodoro_alarm_repeat_duration(session: Session) -> int:
    """Return the alarm repeat duration in seconds (0 means use the count)."""
    raw: str = read_setting(session, _POMODORO_ALARM_REPEAT_DURATION_KEY, "0")
    try:
        value: int = int(raw)
    except ValueError:
        return 0
    return max(0, min(300, value))


def get_pomodoro_alarm() -> dict[str, Any]:
    """Return the Pomodoro alarm preferences."""
    with session_scope() as session:
        return {
            "enabled": read_pomodoro_alarm_enabled(session),
            "volume": read_pomodoro_alarm_volume(session),
            "sound": read_pomodoro_alarm_sound(session),
            "repeat": read_pomodoro_alarm_repeat(session),
            "repeatCount": read_pomodoro_alarm_repeat_count(session),
            "repeatDuration": read_pomodoro_alarm_repeat_duration(session),
        }


def set_pomodoro_alarm_enabled(enabled: bool) -> dict[str, bool]:
    """Persist whether the Pomodoro alarm plays on session completion."""
    with session_scope() as session:
        write_setting(
            session, _POMODORO_ALARM_ENABLED_KEY, "true" if bool(enabled) else "false"
        )
    return {"enabled": bool(enabled)}


def set_pomodoro_alarm_volume(volume: int) -> dict[str, int]:
    """Persist the Pomodoro alarm volume, clamped to the 0-100 range."""
    clamped: int = max(0, min(100, int(volume)))
    with session_scope() as session:
        write_setting(session, _POMODORO_ALARM_VOLUME_KEY, str(clamped))
    return {"volume": clamped}


def set_pomodoro_alarm_sound(sound: str) -> dict[str, str]:
    """Persist the file name of the Pomodoro alarm sound."""
    with session_scope() as session:
        write_setting(session, _POMODORO_ALARM_SOUND_KEY, sound)
    return {"sound": sound}


def set_pomodoro_alarm_repeat(enabled: bool) -> dict[str, bool]:
    """Persist whether the Pomodoro alarm repeats."""
    with session_scope() as session:
        write_setting(
            session, _POMODORO_ALARM_REPEAT_KEY, "true" if bool(enabled) else "false"
        )
    return {"repeat": bool(enabled)}


def set_pomodoro_alarm_repeat_count(count: int) -> dict[str, int]:
    """Persist the number of alarm repetitions."""
    clamped: int = max(1, min(20, int(count)))
    with session_scope() as session:
        write_setting(session, _POMODORO_ALARM_REPEAT_COUNT_KEY, str(clamped))
    return {"repeatCount": clamped}


def set_pomodoro_alarm_repeat_duration(seconds: int) -> dict[str, int]:
    """Persist the alarm repeat duration in seconds."""
    clamped: int = max(0, min(300, int(seconds)))
    with session_scope() as session:
        write_setting(session, _POMODORO_ALARM_REPEAT_DURATION_KEY, str(clamped))
    return {"repeatDuration": clamped}
