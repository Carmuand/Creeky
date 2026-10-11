"""
Native desktop notifications built on desktop-notifier.

desktop-notifier is asynchronous, so a dedicated event loop runs on a
daemon thread and notifications are scheduled on it from any thread.
"""

# Standard library
from __future__ import annotations
import asyncio
import threading
from collections.abc import Callable
from pathlib import Path

# Third-party
from desktop_notifier import DesktopNotifier, Icon

# Project imports
from desktop.config import config
from desktop.utills.logger import log, Tags

_APP_ROOT: Path = Path(__file__).resolve().parent.parent.parent
_ICON_CANDIDATES: tuple[Path, ...] = (
    _APP_ROOT / config.build_dir / "assets" / "app" / "DevLogo.ico",
    _APP_ROOT / "public" / "assets" / "app" / "DevLogo.ico",
)


def _resolve_icon() -> Icon | None:
    """Return the application icon when its file is available."""
    for candidate in _ICON_CANDIDATES:
        if candidate.exists():
            return Icon(path=candidate)
    return None


class NativeNotifier:
    """Sends operating system notifications from any thread."""

    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._notifier: DesktopNotifier | None = None
        self._ready: threading.Event = threading.Event()

    def start(self) -> None:
        """Start the background event loop that delivers notifications."""
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, name="creeky-notifier", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        """Run the event loop until the process exits."""
        loop: asyncio.AbstractEventLoop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self._loop = loop
        try:
            icon: Icon | None = _resolve_icon()
            self._notifier = (
                DesktopNotifier(app_name=config.app_name, app_icon=icon)
                if icon is not None
                else DesktopNotifier(app_name=config.app_name)
            )
        except Exception as error:
            log("ERROR", Tags.NOTIFIER, f"Native notifications unavailable: {error!r}")
        self._ready.set()
        loop.run_forever()

    async def _send(self, title: str, message: str, on_clicked: Callable[[], None] | None) -> None:
        """Deliver one notification through desktop-notifier."""
        if self._notifier is None:
            return
        try:
            await self._notifier.send(title=title, message=message, on_clicked=on_clicked)
        except Exception as error:
            log("ERROR", Tags.NOTIFIER, f"Could not send notification: {error!r}")

    def send(self, title: str, message: str, on_clicked: Callable[[], None] | None = None) -> None:
        """
        Queue a native notification.

        Args:
            title: Notification title.
            message: Notification body.
            on_clicked: Callback invoked when the user clicks the notification.
        """
        if not self._ready.wait(timeout=5) or self._loop is None:
            log("WARNING", Tags.NOTIFIER, "Notifier is not running; notification skipped")
            return
        asyncio.run_coroutine_threadsafe(self._send(title, message, on_clicked), self._loop)


notifier: NativeNotifier = NativeNotifier()
