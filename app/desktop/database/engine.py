"""
SQLAlchemy engine, session handling and database initialization.
"""

# Standard library
from __future__ import annotations
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

# Third-party
from sqlalchemy import Engine, create_engine, event, func, select
from sqlalchemy.orm import Session, sessionmaker

# Project imports
from desktop.config import config
from desktop.database.models import Base, TaskList
from desktop.database.seed import seed_database
from desktop.utills.logger import log, Tags

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


def init_database() -> None:
    """Create the data directory and tables, seeding them on first run."""
    config.data_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    with session_scope() as session:
        list_count: int = session.scalar(select(func.count()).select_from(TaskList)) or 0
        if list_count == 0:
            seed_database(session)
            log("INFO", Tags.DATABASE, "Database seeded with starter data")
    log("SUCCESS", Tags.DATABASE, f"Database ready at {config.db_path}")


def reset_database() -> None:
    """Drop every table and recreate the database with starter data."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with session_scope() as session:
        seed_database(session)
    log("WARNING", Tags.DATABASE, "Database reset to starter data")
