"""
Bootstrap helpers for the desktop host.

Centralizes database setup, window creation, URL resolution and boot
wiring so main.py stays minimal.
"""

# Standard library
from __future__ import annotations
import ctypes
import sys
from pathlib import Path

# Third-party
import webview
from dotenv import load_dotenv
from screeninfo import get_monitors

APP_ROOT: Path = Path(__file__).resolve().parent.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

load_dotenv(APP_ROOT / ".env")

# Project imports
from desktop.api import settings_api, window_api
from desktop.config import config
from desktop.core.api import Api
from desktop.core.events import events
from desktop.core.notifier import notifier
from desktop.core.scheduler import scheduler
from desktop.core.unad_service import unad_service
from desktop.database.engine import init_database, session_scope
from desktop.utills.logger import log, Tags
from desktop.utills.window_sizes import (
    DEFAULT_WINDOW_SIZE,
    normalize_window_size,
    sizes_that_fit,
)

api: Api = Api()


def resolve_url(theme: str) -> str:
    """
    Return the URL the webview should load, carrying the theme as a query parameter.

    Resolution order:
      DEBUG=true  -> Vite dev server
      dist exists -> built index.html (production)
      otherwise   -> fall back to the dev server instead of failing

    Args:
        theme: Theme applied by the page before its first paint.
    """
    build_path: Path = APP_ROOT / config.build_dir / config.build_entry
    query: str = f"?theme={theme}"

    if config.debug:
        log("INFO", Tags.MAIN, f"Debug mode - dev server: {config.dev_url}")
        return f"{config.dev_url.rstrip('/')}/{query}"

    if build_path.exists():
        log("INFO", Tags.MAIN, f"Production mode - {build_path}")
        return f"{build_path}{query}"

    log(
        "WARNING",
        Tags.MAIN,
        f"Build not found at {build_path}; falling back to dev server {config.dev_url}",
    )
    return f"{config.dev_url.rstrip('/')}/{query}"


def primary_monitor_size() -> tuple[int, int]:
    """Return the size of the primary monitor for validating the stored window size."""
    try:
        monitor = get_monitors()[0]
        return monitor.width, monitor.height
    except Exception as error:
        log("WARNING", Tags.WINDOW, f"Could not read monitor size: {error!r}")
        return DEFAULT_WINDOW_SIZE


def get_centered_position(width: int, height: int) -> tuple[int, int]:
    """Return (x, y) to center a window of the given size in the primary work area."""
    try:
        
        user32 = ctypes.windll.user32  # type: ignore[attr-defined]
        user32.SetProcessDPIAware()
        work: ctypes.Array[ctypes.c_long] = (ctypes.c_long * 4)()
        if user32.SystemParametersInfoW(0x0030, 0, work, 0):
            left: int = int(work[0])
            top: int = int(work[1])
            area_width: int = int(work[2] - work[0])
            area_height: int = int(work[3] - work[1])
            x: int = left + max(0, (area_width - width) // 2)
            y: int = top + max(0, (area_height - height) // 2)
            return x, y
    except Exception:
        pass
    try:
        monitor = get_monitors()[0]
        x = max(0, (monitor.width - width) // 2)
        y = max(0, (monitor.height - height) // 2)
        return x, y
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"Error calculating centered position: {error!r}")
        return 0, 0


def _on_loaded(window: webview.Window) -> None:
    """Attach the event bus, re-center on the current monitor and start services."""
    log("SUCCESS", Tags.WINDOW, "Page loaded - event bus attached")
    events.attach(window)
    window_api.center_window(window)
    scheduler.start()
    unad_service.start()


def bootstrap() -> None:
    """Bootstrap and start the pywebview application."""
    log("INFO", Tags.MAIN, f"Starting {config.app_name}")

    init_database()
    notifier.start()

    theme: str = settings_api.get_theme()["theme"]
    background_color: str = config.theme_backgrounds.get(
        theme, config.theme_backgrounds[config.default_theme]
    )

    webview.settings["DRAG_REGION_DIRECT_TARGET_ONLY"] = True

    url: str = resolve_url(theme)
    stored_size: dict[str, int]
    with session_scope() as session:
        stored_size = settings_api.read_window_size(session)
    window_width: int
    window_height: int
    window_width, window_height = normalize_window_size(stored_size)
    if (window_width, window_height) not in sizes_that_fit(*primary_monitor_size()):
        log(
            "WARNING",
            Tags.WINDOW,
            f"Stored window size {window_width}x{window_height} does not fit, using default",
        )
        window_width, window_height = DEFAULT_WINDOW_SIZE
    window_x: int
    window_y: int
    window_x, window_y = get_centered_position(window_width, window_height)

    window: webview.Window = webview.create_window(
        title=config.app_name,
        url=url,
        js_api=api,
        width=window_width,
        height=window_height,
        x=window_x,
        y=window_y,
        resizable=config.resizable,
        frameless=config.frameless,
        easy_drag=config.easy_drag,
        background_color=background_color,
    )

    window.events.loaded += lambda: _on_loaded(window)

    log("SUCCESS", Tags.MAIN, "Window created - starting webview loop")
    webview.start(debug=config.debug)
    scheduler.stop()
    unad_service.stop()
    log("INFO", Tags.MAIN, "Webview loop exited - bye!")
