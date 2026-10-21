"""
Central application configuration.

Reads environment variables from .env via os.environ and resolves the
per-user storage locations.
"""

# Standard library
from __future__ import annotations
import os
from dataclasses import dataclass, field
from pathlib import Path


def _resolve_data_dir(app_name: str) -> Path:
    """Return the per-user data directory inside the roaming AppData folder."""
    appdata: str | None = os.getenv("APPDATA")
    base: Path = Path(appdata) if appdata else Path.home() / "AppData" / "Roaming"
    return base / app_name / "user"


@dataclass(frozen=True)
class AppConfig:
    """Immutable application configuration resolved at startup."""

    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "Creeky"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")

    width: int = 1366
    height: int = 800
    resizable: bool = False
    frameless: bool = True
    easy_drag: bool = False

    default_theme: str = "light"
    default_language: str = "es"
    theme_backgrounds: dict[str, str] = field(
        default_factory=lambda: {"light": "#fafafa", "dark": "#11111a"}
    )

    dev_url: str = field(default_factory=lambda: os.getenv("VITE_API_URL", "http://localhost:5173"))

    build_dir: str = "dist"
    build_entry: str = "index.html"

    database_filename: str = "creeky.db"
    reminder_interval_seconds: int = 30

    @property
    def data_dir(self) -> Path:
        """Directory that holds the user database."""
        return _resolve_data_dir(self.app_name)

    @property
    def db_path(self) -> Path:
        """Absolute path of the SQLite database file."""
        return self.data_dir / self.database_filename

    @property
    def avatars_dir(self) -> Path:
        """Directory that holds the profile photo of each user."""
        return self.data_dir / "avatars"

    @property
    def sounds_dir(self) -> Path:
        """Directory that holds imported alarm sounds."""
        return self.data_dir / "sounds"

    @property
    def credential_service(self) -> str:
        """Service name used for entries in the system credential manager."""
        return self.app_name


config: AppConfig = AppConfig()
