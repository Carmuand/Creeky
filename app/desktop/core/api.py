"""
Public API class exposed to the frontend via pywebview bridge.
"""

# Standard library
from __future__ import annotations

# Third-party
import webview

# Project imports
from desktop.api import window_api


class Api:
    """Bridge API exposed to the React frontend via pywebview."""

    def __init__(self) -> None:
        self._window: webview.Window | None = None

    def attach_window(self, window: webview.Window) -> None:
        """
        Store the pywebview window reference.

        Called by the host once the window is created.
        """
        self._window = window

    def _active_window(self) -> webview.Window | None:
        """Return the attached window, falling back to the global list."""
        if self._window is not None:
            return self._window
        if webview.windows:
            return webview.windows[0]
        return None

    # ── Health ──────────────────────────────────────────────────────────

    def ping(self) -> str:
        """Health-check called by the frontend on startup."""
        return window_api.ping()

    def minimize_window(self) -> None:
        """Minimize the pywebview window."""
        return window_api.minimize_window()

    def close_window(self) -> None:
        """Destroy the pywebview window and exit the application."""
        return window_api.close_window()
