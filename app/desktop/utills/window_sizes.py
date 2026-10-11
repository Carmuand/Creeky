"""
Window sizes for the desktop app.
"""
# Standard library
from __future__ import annotations
from typing import Any, Final, Mapping

DEFAULT_WINDOW_SIZE: Final[tuple[int, int]] = (1366, 800)
WINDOW_SIZES: Final[tuple[tuple[int, int], ...]] = (
    DEFAULT_WINDOW_SIZE,
    (1440, 844),
    (1600, 938),
    (1728, 1012),
    (1920, 1124),
)
WINDOW_SIZE_KEY: Final[str] = "window_size"


def normalize_window_size(raw: Any) -> tuple[int, int]:
    """
    Turn a stored or received value into one of the allowed sizes.

    Args:
        raw: Mapping with ``width`` and ``height``, as stored in the settings table.

    Returns:
        The size when it is one of ``WINDOW_SIZES``, the default size otherwise.
    """
    if not isinstance(raw, Mapping):
        return DEFAULT_WINDOW_SIZE
    width: Any = raw.get("width")
    height: Any = raw.get("height")
    if (
        isinstance(width, bool)
        or isinstance(height, bool)
        or not isinstance(width, int)
        or not isinstance(height, int)
    ):
        return DEFAULT_WINDOW_SIZE
    return (width, height) if (width, height) in WINDOW_SIZES else DEFAULT_WINDOW_SIZE


def sizes_that_fit(area_width: float, area_height: float) -> list[tuple[int, int]]:
    """
    List the sizes that fit in an area of a monitor.

    Args:
        area_width: Usable width of the monitor, in logical pixels.
        area_height: Usable height of the monitor, in logical pixels.

    Returns:
        The sizes that fit, smallest first; the default size is always offered.
    """
    return [
        size
        for size in WINDOW_SIZES
        if size == DEFAULT_WINDOW_SIZE or (size[0] <= area_width and size[1] <= area_height)
    ]
