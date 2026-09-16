"""
Bootstrap helpers for the desktop host.

Centralizes window creation, URL resolution and boot wiring so
main.py stays minimal.
"""

# Standard library
from __future__ import annotations

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
from desktop.config import config
from desktop.core.api import Api
from desktop.utills.logger import log, Tags

api = Api()

def resolve_url() -> str:
    """
    Return the URL/path the webview should load.

    Resolution order:
      DEBUG=true  -> Vite dev server
      dist exists -> built index.html (production)
      otherwise   -> fall back to the dev server instead of failing
    """
    build_path: Path = APP_ROOT / config.build_dir / config.build_entry

    if config.debug:
        log("INFO", Tags.MAIN, f"Debug mode — dev server: {config.dev_url}")
        return config.dev_url

    if build_path.exists():
        log("INFO", Tags.MAIN, f"Production mode — {build_path}")
        return str(build_path)

    log(
        "WARNING",
        Tags.MAIN,
        f"Build not found at {build_path}; falling back to dev server {config.dev_url}",
    )
    return config.dev_url

def get_centered_position(width: int, height: int) -> tuple[int, int]:
    """Return (x, y) to center a window of the given size on the primary monitor."""
    try:
        monitor = get_monitors()[0]
        x: int = max(0, (monitor.width - width) // 2)
        y: int = max(0, (monitor.height - height) // 2)
        return x, y
    except Exception as e:
        log("ERROR", Tags.WINDOW, f"Error calculating centered position: {e}")
        return 0, 0


def _on_loaded(window: webview.Window) -> None:
    """Called by pywebview once the page finishes loading — attaches bridge."""
    try:
        log("SUCCESS", Tags.WINDOW, "Page loaded — bridge attached")
    except Exception:
        pass
    api.attach_window(window)

def bootstrap() -> None:
    """Bootstrap and start the pywebview application."""
    log("INFO", Tags.MAIN, f"Starting {config.app_name}")

    webview.settings["DRAG_REGION_DIRECT_TARGET_ONLY"] = True

    url: str = resolve_url()
    window_x: int
    window_y: int
    window_x, window_y = get_centered_position(config.width, config.height)

    window: webview.Window = webview.create_window(
        title=config.app_name,
        url=url,
        js_api=api,
        width=config.width,
        height=config.height,
        x=window_x,
        y=window_y,
        resizable=config.resizable,
        frameless=config.frameless,
        easy_drag=config.easy_drag,
        background_color=config.background_color,
    )

    window.events.loaded += lambda: _on_loaded(window)

    log("SUCCESS", Tags.MAIN, "Window created — starting webview loop")
    webview.start(debug=config.debug)
    log("INFO", Tags.MAIN, "Webview loop exited — bye!")