"""
Thread-safe console logger filterable by tag and level.
"""

# Standard library
from __future__ import annotations
import threading
from datetime import datetime
from enum import StrEnum, unique
from typing import Final, Literal

# Third-party
from colorama import Fore, Style, init

init(autoreset=True)

_log_lock: threading.Lock = threading.Lock()

ENABLED_TAGS: Final[set[str]] = set()
"""When non-empty, only these tags are printed."""

DISABLED_LEVELS: Final[set[str]] = set()
"""Levels silenced for every tag."""

TAG_LEVEL_RULES: dict[str, set[str]] = {
    "LOADER": {"DEBUG"},
    "WINDOW_CONTROLLER": {"DEBUG"},
}
"""Levels silenced for a specific tag."""

LogLevel = Literal["INFO", "SUCCESS", "WARNING", "ERROR", "DEBUG", "CRITICAL"]

_LEVEL_COLORS: Final[dict[str, str]] = {
    "INFO": Fore.CYAN,
    "SUCCESS": Fore.GREEN,
    "WARNING": Fore.YELLOW,
    "ERROR": Fore.RED,
    "DEBUG": Fore.MAGENTA,
    "CRITICAL": Fore.RED + Style.BRIGHT,
}


@unique
class Tags(StrEnum):
    """Module identifiers used to group log messages."""

    MAIN = "MAIN"
    LOADER = "LOADER"
    WINDOW = "WINDOW"
    BRIDGE = "BRIDGE"
    DATABASE = "DATABASE"
    AUTH = "AUTH"
    EVENTS = "EVENTS"
    NOTIFIER = "NOTIFIER"
    SCHEDULER = "SCHEDULER"
    UNAD = "UNAD"


def log(level: LogLevel, tag: Tags | str, message: str) -> None:
    """
    Print a filtered log message with timestamp, level and tag.

    Args:
        level: Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG, CRITICAL).
        tag: Module tag identifier.
        message: Human-readable message.
    """
    level_up: str = level.upper()
    tag_up: str = str(tag).upper()

    if level_up in DISABLED_LEVELS:
        return
    if ENABLED_TAGS and tag_up not in ENABLED_TAGS:
        return
    if tag_up in TAG_LEVEL_RULES and level_up in TAG_LEVEL_RULES[tag_up]:
        return

    timestamp: str = datetime.now().strftime("%H:%M:%S")
    color: str = _LEVEL_COLORS.get(level_up, Fore.WHITE)
    level_text: str = f"{level_up:^9}"
    tag_text: str = f"{tag_up:^22}"

    with _log_lock:
        try:
            print(
                f"{Style.DIM}{timestamp}{Style.RESET_ALL} "
                f"[{color}{level_text}{Style.RESET_ALL}] "
                f"[{Fore.WHITE}{Style.BRIGHT}{tag_text}{Style.RESET_ALL}] "
                f"{message}"
            )
        except (AttributeError, OSError, ValueError):
            return
