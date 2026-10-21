"""
System tray integration built on pystray.

pystray and pywebview both need a native event loop, so the icon runs on
its own daemon thread and never drives the window directly. Tray actions
only ask the pywebview window to show itself, while the window reports
back when it is hidden so the tray tooltip stays in sync.
"""

# Standard library
from __future__ import annotations
import threading
from pathlib import Path
from typing import Final

# Third-party
import pystray
import webview
from PIL import Image, ImageDraw

# Project imports
from desktop.config import config
from desktop.core.messages import translate
from desktop.utills.logger import log, Tags

_APP_ROOT: Final[Path] = Path(__file__).resolve().parent.parent.parent
_ICON_CANDIDATES: Final[tuple[Path, ...]] = (
    _APP_ROOT / config.build_dir / "assets" / "app" / "DevLogo.ico",
    _APP_ROOT / "public" / "assets" / "app" / "DevLogo.ico",
)
_FALLBACK_ICON_SIZE: Final[tuple[int, int]] = (64, 64)
_FALLBACK_ICON_COLOR: Final[tuple[int, int, int, int]] = (34, 197, 94, 255)
_STOP_TIMEOUT_SECONDS: Final[float] = 2.0


def _resolve_icon() -> Image.Image:
    """
    Return the image displayed by the tray icon.

    Returns:
        The application icon, or a solid placeholder when the file is missing.
    """
    for candidate in _ICON_CANDIDATES:
        if not candidate.exists():
            continue
        try:
            with Image.open(candidate) as image:
                return image.convert("RGBA").copy()
        except Exception as error:
            log("WARNING", Tags.TRAY, f"Could not load tray icon {candidate}: {error!r}")
    log("WARNING", Tags.TRAY, "Tray icon not found; using a placeholder")
    placeholder: Image.Image = Image.new("RGBA", _FALLBACK_ICON_SIZE, (0, 0, 0, 0))
    draw: ImageDraw.ImageDraw = ImageDraw.Draw(placeholder)
    draw.ellipse((4, 4, 60, 60), fill=_FALLBACK_ICON_COLOR)
    return placeholder


class SystemTray:
    """
    Tray icon that keeps the application available in the background.

    The pystray message loop lives on a daemon thread, so it never competes
    with pywebview for the main thread. Every window operation is delegated
    to pywebview, which marshals it to its graphical thread on its own.
    """

    def __init__(self) -> None:
        self._icon: pystray.Icon | None = None
        self._thread: threading.Thread | None = None
        self._window: webview.Window | None = None
        self._language: str = config.default_language
        self._visible: bool = True
        self._close_to_tray: bool = False
        self._quitting: bool = False
        self._ready: threading.Event = threading.Event()
        self._lock: threading.Lock = threading.Lock()

    def start(
        self,
        window: webview.Window,
        language: str,
        close_to_tray: bool = False,
        visible: bool = True,
    ) -> bool:
        """
        Create the tray icon and run its message loop on a daemon thread.

        Args:
            window: Main pywebview window the tray controls.
            language: Language used by the tray labels and tooltip.
            close_to_tray: Whether closing the window should hide it to the tray.
            visible: Whether the main window is visible when the tray starts.

        Returns:
            Whether the tray icon became ready.
        """
        with self._lock:
            self._window = window
            self._language = language
            self._close_to_tray = close_to_tray
            self._visible = visible
            if self._icon is not None:
                running = True
            else:
                running = False
                self._quitting = False
                self._ready.clear()
                title: str = (
                    config.app_name
                    if visible
                    else f"{config.app_name} - {translate(language, 'tray_background')}"
                )
                try:
                    icon: pystray.Icon = pystray.Icon(
                        name=config.app_name.lower(),
                        icon=_resolve_icon(),
                        title=title,
                        menu=pystray.Menu(
                            pystray.MenuItem(
                                translate(language, "tray_open"),
                                self._on_open,
                                default=True,
                            ),
                            pystray.Menu.SEPARATOR,
                            pystray.MenuItem(translate(language, "tray_quit"), self._on_quit),
                        ),
                    )
                except Exception as error:
                    log("ERROR", Tags.TRAY, f"Could not create the tray icon: {error!r}")
                    return False
                self._icon = icon
                self._thread = threading.Thread(target=self._run, name="creeky-tray", daemon=True)
                try:
                    self._thread.start()
                except Exception as error:
                    self._icon = None
                    self._thread = None
                    log("ERROR", Tags.TRAY, f"Could not start the tray thread: {error!r}")
                    return False
        if running:
            self._set_visible(visible)
            return True
        self._ready.wait(timeout=_STOP_TIMEOUT_SECONDS)
        if not self.is_running():
            log("ERROR", Tags.TRAY, "Tray icon did not become ready")
            self.stop()
            return False
        self._set_visible(visible)
        log("INFO", Tags.TRAY, "Tray icon started")
        return True

    def stop(self) -> None:
        """Stop the tray message loop and release the icon."""
        with self._lock:
            icon: pystray.Icon | None = self._icon
            thread: threading.Thread | None = self._thread
            self._icon = None
            self._thread = None
        if icon is None:
            return
        current: threading.Thread = threading.current_thread()
        if thread is not None and thread.is_alive() and thread is not current:
            self._ready.wait(timeout=_STOP_TIMEOUT_SECONDS)
        try:
            icon.stop()
        except Exception as error:
            log("ERROR", Tags.TRAY, f"Could not stop the tray icon: {error!r}")
        if thread is not None and thread.is_alive() and thread is not current:
            thread.join(timeout=_STOP_TIMEOUT_SECONDS)
        log("INFO", Tags.TRAY, "Tray icon stopped")

    def is_running(self) -> bool:
        """Return whether the tray icon is visible and its message loop is alive."""
        with self._lock:
            thread: threading.Thread | None = self._thread
        return thread is not None and thread.is_alive() and self._ready.is_set()

    def is_quitting(self) -> bool:
        """Return whether a quit was requested from the tray."""
        with self._lock:
            return self._quitting

    def set_close_to_tray(self, enabled: bool) -> None:
        """Enable or disable hiding the window when it closes."""
        with self._lock:
            self._close_to_tray = enabled

    def is_close_to_tray(self) -> bool:
        """Return whether closing the window should hide it to the tray."""
        with self._lock:
            close_to_tray: bool = self._close_to_tray
        return close_to_tray and self.is_running()

    def notify_window_hidden(self) -> None:
        """Record that pywebview hid the window and refresh the tray tooltip."""
        self._set_visible(False)

    def notify_window_visible(self) -> None:
        """Record that pywebview showed the window and refresh the tray tooltip."""
        self._set_visible(True)

    def _set_visible(self, visible: bool) -> None:
        """
        Store the window visibility and update the tray tooltip.

        Args:
            visible: Whether the main window is currently visible.
        """
        with self._lock:
            self._visible = visible
            icon: pystray.Icon | None = self._icon
        if icon is None:
            return
        try:
            icon.title = self._tooltip()
        except Exception as error:
            log("ERROR", Tags.TRAY, f"Could not update the tray tooltip: {error!r}")

    def _tooltip(self) -> str:
        """Return the tooltip shown when hovering over the tray icon."""
        with self._lock:
            language: str = self._language
            visible: bool = self._visible
        if visible:
            return config.app_name
        return f"{config.app_name} - {translate(language, 'tray_background')}"

    def _run(self) -> None:
        """Run the pystray message loop until the icon is stopped."""
        with self._lock:
            icon: pystray.Icon | None = self._icon
        if icon is None:
            return
        try:
            icon.run(setup=self._on_ready)
        except Exception as error:
            log("ERROR", Tags.TRAY, f"Tray loop stopped unexpectedly: {error!r}")
        finally:
            self._ready.set()
            with self._lock:
                if self._icon is icon:
                    self._icon = None
                    self._thread = None

    def _on_ready(self, icon: pystray.Icon) -> None:
        """
        Make the icon visible once its message loop is ready.

        Args:
            icon: Tray icon whose message loop has started.
        """
        icon.visible = True
        self._ready.set()

    def _on_open(self, _icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        """
        Ask pywebview to restore and show the main window.

        Args:
            _icon: Tray icon that fired the action.
            _item: Menu item that fired the action.
        """
        with self._lock:
            window: webview.Window | None = self._window
        if window is None:
            return
        try:
            window.restore()
            window.show()
            self._set_visible(True)
            log("INFO", Tags.TRAY, "Window shown from the tray")
        except Exception as error:
            log("ERROR", Tags.TRAY, f"Could not show the window: {error!r}")

    def _on_quit(self, icon: pystray.Icon, _item: pystray.MenuItem) -> None:
        """
        Stop the tray and ask pywebview to close the window for good.

        Args:
            icon: Tray icon that fired the action.
            _item: Menu item that fired the action.
        """
        with self._lock:
            self._quitting = True
            window: webview.Window | None = self._window
        log("INFO", Tags.TRAY, "Quit requested from the tray")
        if window is not None:
            try:
                window.destroy()
            except Exception as error:
                log("ERROR", Tags.TRAY, f"Could not close the window: {error!r}")
        try:
            icon.stop()
        except Exception as error:
            log("ERROR", Tags.TRAY, f"Could not stop the icon: {error!r}")


tray: SystemTray = SystemTray()
