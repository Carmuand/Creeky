"""
Window control API.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
import webview

# Project imports
from desktop.core.errors import ApiError
from desktop.core.tray import tray
from desktop.database.engine import session_scope
from desktop.utills.logger import log, Tags
from desktop.utills.window_sizes import (
    WINDOW_SIZES,
    normalize_window_size,
    sizes_that_fit,
)


def ping() -> str:
    """Health-check called by the frontend on startup to verify the bridge."""
    log("INFO", Tags.BRIDGE, "ping -> pong")
    return "pong"


def minimize_window() -> None:
    """Minimize the pywebview window."""
    try:
        if webview.windows:
            webview.windows[0].minimize()
            log("INFO", Tags.WINDOW, "Window minimized")
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"minimize_window failed: {error!r}")


def restore_window() -> None:
    """Restore the pywebview window, bring it to the foreground and sync the tray."""
    try:
        if webview.windows:
            webview.windows[0].restore()
            webview.windows[0].show()
            tray.notify_window_visible()
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"restore_window failed: {error!r}")


def hide_window() -> None:
    """Hide the pywebview window and tell the tray it is now in the background."""
    try:
        if webview.windows:
            webview.windows[0].hide()
            tray.notify_window_hidden()
            log("INFO", Tags.WINDOW, "Window hidden to the tray")
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"hide_window failed: {error!r}")


def close_window() -> None:
    """Hide the window when minimize on close is active; otherwise destroy it."""
    if tray.is_close_to_tray() and not tray.is_quitting():
        hide_window()
        return
    try:
        if webview.windows:
            log("INFO", Tags.WINDOW, "Window close requested")
            webview.windows[0].destroy()
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"close_window failed: {error!r}")


def measure_window_area(window: webview.Window) -> tuple[float, float, float, float, float]:
    """
    Measure the usable area of the monitor the window is on.

    pywebview keeps the working area (without the taskbar) in the screen
    frame. The scale factor converts logical pixels to device pixels on
    Windows 11, where 125% or 150% scaling is common.

    Args:
        window: Main window.

    Returns:
        Left, top, width and height of the usable area in device pixels,
        and the monitor scale factor.
    """
    scale: float = float(getattr(window.native, "scale_factor", 1) or 1)
    center_x: float = window.x + window.width / 2
    center_y: float = window.y + window.height / 2
    screens: list[Any] = list(webview.screens)
    screen: Any = next(
        (
            found
            for found in screens
            if found.x <= center_x < found.x + found.width
            and found.y <= center_y < found.y + found.height
        ),
        screens[0],
    )
    area: Any = screen.frame
    if all(hasattr(area, name) for name in ("X", "Y", "Width", "Height")):
        return float(area.X), float(area.Y), float(area.Width), float(area.Height), scale
    return float(screen.x), float(screen.y), float(screen.width), float(screen.height), scale


def center_window(window: webview.Window) -> None:
    """
    Move the window to the center of the usable area of its monitor.

    Args:
        window: Main window.
    """
    try:
        left: float
        top: float
        area_width: float
        area_height: float
        scale: float
        left, top, area_width, area_height, scale = measure_window_area(window)
        device_width: float = float(window.width)
        device_height: float = float(window.height)
        target_x: int = int((left + max(0.0, area_width - device_width) / 2) / scale)
        target_y: int = int((top + max(0.0, area_height - device_height) / 2) / scale)
        window.move(target_x, target_y)
        log("DEBUG", Tags.WINDOW, f"Window centered at x={target_x} y={target_y}")
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"center_window failed: {error!r}")


def get_window_sizes() -> dict[str, Any]:
    """
    List the sizes the window may take on its monitor, with the one in use.

    Returns:
        Options that fit the monitor and the current size.
    """
    from desktop.api.settings_api import read_window_size

    with session_scope() as session:
        current: dict[str, int] = read_window_size(session)
    try:
        left: float
        top: float
        area_width: float
        area_height: float
        scale: float
        left, top, area_width, area_height, scale = measure_window_area(webview.windows[0])
        fitting: list[tuple[int, int]] = sizes_that_fit(area_width / scale, area_height / scale)
    except Exception as error:
        log("WARNING", Tags.WINDOW, f"Could not measure monitor, offering default size: {error!r}")
        fitting = [WINDOW_SIZES[0]]
    return {
        "options": [{"width": width, "height": height} for width, height in fitting],
        "current": current,
    }


def set_window_size(width: int, height: int) -> dict[str, int]:
    """
    Resize the window to an allowed size, center it and remember it.

    Args:
        width: Width of the chosen size, in logical pixels.
        height: Height of the chosen size, in logical pixels.

    Returns:
        The applied size.
    """
    from desktop.api.settings_api import write_window_size

    size: tuple[int, int] = normalize_window_size({"width": width, "height": height})
    if size != (width, height):
        raise ApiError("invalid_size")
    try:
        window: webview.Window = webview.windows[0]
        left: float
        top: float
        area_width: float
        area_height: float
        scale: float
        left, top, area_width, area_height, scale = measure_window_area(window)
        if size not in sizes_that_fit(area_width / scale, area_height / scale):
            raise ApiError("size_too_large")
        device_width: int = int(size[0] * scale)
        device_height: int = int(size[1] * scale)
        window.resize(device_width, device_height)
        window.move(
            int((left + max(0.0, area_width - device_width) / 2) / scale),
            int((top + max(0.0, area_height - device_height) / 2) / scale),
        )
    except ApiError:
        raise
    except Exception as error:
        log("ERROR", Tags.WINDOW, f"set_window_size failed: {error!r}")
        raise ApiError("resize_failed")
    with session_scope() as session:
        stored: dict[str, int] = write_window_size(session, size[0], size[1])
    log("SUCCESS", Tags.WINDOW, f"Window resized to {size[0]}x{size[1]}")
    return stored
