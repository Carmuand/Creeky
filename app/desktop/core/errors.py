"""
Error type and result envelope used by every bridge method.
"""

# Standard library
from __future__ import annotations
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec

# Project imports
from desktop.utills.logger import log, Tags

P = ParamSpec("P")

BridgeResult = dict[str, Any]


class ApiError(Exception):
    """Expected failure identified by a stable code the frontend can translate."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code: str = code


def bridge_method(function: Callable[P, Any]) -> Callable[P, BridgeResult]:
    """
    Wrap a bridge method so it always returns a result envelope.

    Args:
        function: Bridge method to wrap.

    Returns:
        A callable returning ``{"ok": True, "data": ...}`` on success or
        ``{"ok": False, "error": code}`` on failure.
    """

    @wraps(function)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> BridgeResult:
        try:
            return {"ok": True, "data": function(*args, **kwargs)}
        except ApiError as error:
            return {"ok": False, "error": error.code}
        except Exception as error:
            log("ERROR", Tags.BRIDGE, f"{function.__name__} failed: {error!r}")
            return {"ok": False, "error": "unexpected"}

    return wrapper
