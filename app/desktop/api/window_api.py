"""
Window control API
"""
# Standard library
from __future__ import annotations

# Third-party
import webview

# Project imports
from desktop.utills.logger import log, Tags


def ping() -> str:
    """Health-check called by the frontend on startup to verify the bridge."""
    try:
        log("INFO", Tags.BRIDGE, "ping -> pong")
    except Exception:
        pass
    return "pong"


def minimize_window() -> None:
    """Minimize the pywebview window."""
    try:
        if webview.windows:
            webview.windows[0].minimize()
            try:
                log("INFO", Tags.WINDOW, "window minimized")
            except Exception:
                pass
    except Exception as e:
        try:
            log("ERROR", Tags.WINDOW, f"minimize_window failed: {e}")
        except Exception:
            pass


def close_window() -> None:
    """Destroy the pywebview window and exit the application."""
    try:
        if webview.windows:
            try:
                log("INFO", Tags.WINDOW, "window close requested")
            except Exception:
                pass
            webview.windows[0].destroy()
    except Exception as e:
        try:
            log("ERROR", Tags.WINDOW, f"close_window failed: {e}")
        except Exception:
            pass