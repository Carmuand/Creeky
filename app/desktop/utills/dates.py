"""
Date, time and identifier helpers shared by the data layer.
"""

# Standard library
from __future__ import annotations
import secrets
import time
from datetime import date, datetime, timedelta


def now_ms() -> int:
    """Return the current time as epoch milliseconds."""
    return int(time.time() * 1000)


def today_iso() -> str:
    """Return the local date as YYYY-MM-DD."""
    return date.today().isoformat()


def add_days_iso(iso: str, days: int) -> str:
    """Return the ISO date that is the given number of days away from another."""
    return (date.fromisoformat(iso) + timedelta(days=days)).isoformat()


def monday_of(iso: str) -> str:
    """Return the ISO date of the Monday that starts the week of the given date."""
    day: date = date.fromisoformat(iso)
    return (day - timedelta(days=day.weekday())).isoformat()


def iso_week_key(iso: str) -> str:
    """Return the ISO week identifier, such as 2026-W41, for the given date."""
    year, week, _ = date.fromisoformat(iso).isocalendar()
    return f"{year}-W{week:02d}"


def current_time_hm() -> str:
    """Return the local time as HH:MM."""
    return datetime.now().strftime("%H:%M")


def new_id(prefix: str) -> str:
    """Return a short random identifier with the given prefix."""
    return f"{prefix}_{secrets.token_hex(5)}"
