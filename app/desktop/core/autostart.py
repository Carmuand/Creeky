"""
Start-with-Windows switch.

The application registers itself under the current user's Run key, so the
registry is the single source of truth for whether it starts at sign-in.
"""

# Standard library
from __future__ import annotations
import sys
import winreg
from pathlib import Path

# Project imports
from desktop.config import config
from desktop.core.errors import ApiError
from desktop.utills.logger import log, Tags

_RUN_KEY: str = r"Software\Microsoft\Windows\CurrentVersion\Run"


def _launch_command() -> str:
    """
    Return the command Windows runs at sign-in.

    A packaged build launches its own executable. A source checkout
    launches the entry script with the windowless interpreter when it is
    available next to the running one.
    """
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}"'
    interpreter: Path = Path(sys.executable)
    windowless: Path = interpreter.with_name("pythonw.exe")
    entry: Path = Path(__file__).resolve().parent.parent / "main.py"
    return f'"{windowless if windowless.exists() else interpreter}" "{entry}"'


def is_enabled() -> bool:
    """Return whether the application is registered to start with Windows."""
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY, 0, winreg.KEY_READ) as key:
            winreg.QueryValueEx(key, config.app_name)
            return True
    except FileNotFoundError:
        return False
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not read the startup entry: {error!r}")
        return False


def set_enabled(enabled: bool) -> bool:
    """
    Register or unregister the application to start with Windows.

    Args:
        enabled: Whether the application should start at sign-in.

    Returns:
        The resulting state.
    """
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                winreg.SetValueEx(key, config.app_name, 0, winreg.REG_SZ, _launch_command())
            else:
                try:
                    winreg.DeleteValue(key, config.app_name)
                except FileNotFoundError:
                    return False
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not update the startup entry: {error!r}")
        raise ApiError("autostart_failed") from error
    log("INFO", Tags.MAIN, f"Start with Windows {'enabled' if enabled else 'disabled'}")
    return enabled
