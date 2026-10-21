"""
Start-with-Windows switch.

The application registers itself under the current user's Run key, so the
registry is the single source of truth for whether it starts at sign-in. The
command also carries a flag so the application can tell when Windows
launched it at sign-in, which enables starting minimized.
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
_AUTOSTART_FLAG: str = "--autostart"


def _entry_path() -> Path:
    """Return the script or executable that Windows should launch."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable)
    return Path(__file__).resolve().parent.parent / "main.py"


def _launch_command() -> str:
    """
    Return the command Windows runs at sign-in.

    A packaged build launches its own executable. A source checkout
    launches the entry script with the windowless interpreter when it is
    available next to the running one. The sign-in flag is always appended
    so the application can detect a sign-in launch.

    Returns:
        The registry command line.
    """
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}" {_AUTOSTART_FLAG}'
    interpreter: Path = Path(sys.executable)
    windowless: Path = interpreter.with_name("pythonw.exe")
    entry: Path = _entry_path()
    return f'"{windowless if windowless.exists() else interpreter}" "{entry}" {_AUTOSTART_FLAG}'


def started_at_login() -> bool:
    """
    Return whether the current process was launched at Windows sign-in.

    Returns:
        ``True`` when the sign-in flag is present in the command line.
    """
    return _AUTOSTART_FLAG in sys.argv[1:]


def sync_command() -> None:
    """
    Add the sign-in flag to an existing registry entry of this installation.

    Older entries created before the flag existed are upgraded in place, as
    long as the command still points at this same installation.
    """
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, _RUN_KEY, 0, winreg.KEY_READ | winreg.KEY_SET_VALUE
        ) as key:
            current: str
            current, _ = winreg.QueryValueEx(key, config.app_name)
            expected: str = _launch_command()
            if current == expected:
                return
            if str(_entry_path().resolve()).lower() not in current.lower():
                return
            winreg.SetValueEx(key, config.app_name, 0, winreg.REG_SZ, expected)
    except FileNotFoundError:
        return
    except OSError as error:
        log("ERROR", Tags.MAIN, f"Could not update the startup entry: {error!r}")
        return
    log("INFO", Tags.MAIN, "Startup entry updated")


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
