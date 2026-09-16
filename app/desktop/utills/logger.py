"""
Custom logger with tag and level support.
Thread-safe, filterable by tag and level.
"""

# Standard library
import threading
from enum import StrEnum, unique
from typing import Literal, Final, Set, Dict
from datetime import datetime

# Third-party
from colorama import Fore, Style, init

init(autoreset=True)

# Global lock — prevents interleaved output in multithreaded contexts.
_log_lock = threading.Lock()

# If non-empty, only these tags will be printed.
ENABLED_TAGS: Final[Set[str]] = set()

# Levels silenced globally across all tags.
DISABLED_LEVELS: Final[Set[str]] = set()

# Per-tag level silencing rules.
# Example: "LOADER": {"DEBUG"} → suppresses DEBUG only for LOADER.
TAG_LEVEL_RULES: Dict[str, Set[str]] = {
    "LOADER": {"DEBUG"},
    "WINDOW_CONTROLLER": {"DEBUG"},
}

LogLevel = Literal["INFO", "SUCCESS", "WARNING", "ERROR", "DEBUG", "CRITICAL"]


@unique
class Tags(StrEnum):
    MAIN             = "MAIN"
    LOADER           = "LOADER"
    WINDOW           = "WINDOW"
    BRIDGE           = "BRIDGE"


def log(level: LogLevel, tag: Tags | str, message: str) -> None:
    """
    Print a filtered log message with timestamp, level and tag.

    Args:
        level:   Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG, CRITICAL).
        tag:     Module tag identifier.
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

    colors: Final[Dict[str, str]] = {
        "INFO":     Fore.CYAN,
        "SUCCESS":  Fore.GREEN,
        "WARNING":  Fore.YELLOW,
        "ERROR":    Fore.RED,
        "DEBUG":    Fore.MAGENTA,
        "CRITICAL": Fore.RED + Style.BRIGHT,
    }

    color: str  = colors.get(level_up, Fore.WHITE)
    lvl_fmt: str = f"{level_up:^9}"
    tag_fmt: str = f"{tag_up:^22}"

    with _log_lock:
        print(
            f"{Style.DIM}{timestamp}{Style.RESET_ALL} "
            f"[{color}{lvl_fmt}{Style.RESET_ALL}] "
            f"[{Fore.WHITE}{Style.BRIGHT}{tag_fmt}{Style.RESET_ALL}] "
            f"{message}"
        )