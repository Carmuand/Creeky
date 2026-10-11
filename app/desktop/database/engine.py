"""
SQLAlchemy engine, session handling and database initialization.
"""

# Standard library
from __future__ import annotations
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

# Third-party
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

# Project imports
from desktop.config import config
from desktop.database.models import Base
from desktop.utills.logger import log, Tags

SCHEMA_VERSION: int = 3
"""Version stored in the database file. A file with another version is replaced."""

engine: Engine = create_engine(
    f"sqlite:///{config.db_path.as_posix()}",
    connect_args={"check_same_thread": False},
)

SessionFactory: sessionmaker[Session] = sessionmaker(bind=engine, expire_on_commit=False)


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection: Any, _connection_record: Any) -> None:
    """Turn on foreign key enforcement for every SQLite connection."""
    cursor: Any = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a session that commits on success and rolls back on error."""
    session: Session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _stored_schema_version() -> int | None:
    """Return the schema version of the database file, or None when the file is missing."""
    if not config.db_path.exists():
        return None
    connection: sqlite3.Connection = sqlite3.connect(config.db_path)
    try:
        return int(connection.execute("PRAGMA user_version").fetchone()[0])
    finally:
        connection.close()


def init_database() -> None:
    """
    Create the data directory and the tables.

    A database file written with a different schema version is deleted and
    created again, because the application ships no migrations.
    """
    config.data_dir.mkdir(parents=True, exist_ok=True)
    stored_version: int | None = _stored_schema_version()
    if stored_version is not None and stored_version != SCHEMA_VERSION:
        engine.dispose()
        config.db_path.unlink()
        log(
            "WARNING",
            Tags.DATABASE,
            f"Database schema {stored_version} replaced by schema {SCHEMA_VERSION}",
        )
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text(f"PRAGMA user_version = {SCHEMA_VERSION}"))
    log("SUCCESS", Tags.DATABASE, f"Database ready at {config.db_path}")
