"""
Starter data inserted when the database is created.
"""

# Standard library
from __future__ import annotations

# Third-party
from sqlalchemy.orm import Session

# Project imports
from desktop.database.models import (
    Countdown,
    Habit,
    HabitCheck,
    MatrixNote,
    Notification,
    Tag,
    Task,
    TaskList,
    TaskRepeatDay,
)
from desktop.utills.dates import add_days_iso, monday_of, now_ms, today_iso

INBOX_LIST_ID: str = "inbox"
DEFAULT_LIST_ICON: str = "\U0001F4CB"
DEFAULT_TAGS: tuple[str, ...] = ("trabajo", "personal", "urgente")

_DAY_MS: int = 86_400_000


def seed_database(session: Session) -> None:
    """Insert the starter lists, tags, tasks, habits and notes."""
    now: int = now_ms()
    today: str = today_iso()
    monday: str = monday_of(today)

    session.add_all(
        [
            TaskList(
                id=INBOX_LIST_ID,
                name="Bandeja de entrada",
                description="Captura rápida sin clasificar.",
                color="#212121",
                icon="\U0001F4E5",
                position=0,
            ),
            TaskList(
                id="trabajo",
                name="Trabajo",
                description="Pendientes laborales.",
                color="#3949AB",
                icon="\U0001F4BC",
                position=1,
            ),
            TaskList(
                id="personal",
                name="Personal",
                description="Asuntos propios.",
                color="#00897B",
                icon="\U0001F3E0",
                position=2,
            ),
        ]
    )

    tags: dict[str, Tag] = {
        name: Tag(name=name, position=index) for index, name in enumerate(DEFAULT_TAGS)
    }
    session.add_all(tags.values())

    session.add_all(
        [
            Task(
                id="t1",
                title="Revisar pendientes de la semana",
                description="Revisa cada lista y pon fecha a lo importante.",
                list_id=INBOX_LIST_ID,
                priority="medium",
                due=today,
                due_time="09:00",
                created_at=now,
                position=0,
                tags=[tags["personal"]],
            ),
            Task(
                id="t2",
                title="Probar Pomodoro de 25 min",
                list_id="trabajo",
                priority="high",
                created_at=now,
                position=1,
                tags=[tags["trabajo"]],
                repeat_days=[TaskRepeatDay(weekday=day) for day in (1, 3, 5)],
            ),
        ]
    )

    session.add_all(
        [
            Habit(
                id="h1",
                name="Leer 20 min",
                best_streak=3,
                position=0,
                checks=[HabitCheck(date=add_days_iso(monday, offset)) for offset in (0, 1, 2, 4)],
            ),
            Habit(
                id="h2",
                name="Ejercicio",
                best_streak=5,
                position=1,
                checks=[HabitCheck(date=add_days_iso(monday, offset)) for offset in range(5)],
            ),
        ]
    )

    session.add_all(
        [
            MatrixNote(quadrant="q1", text="Entrega urgente", position=0),
            MatrixNote(quadrant="q2", text="Planear semana", position=0),
        ]
    )

    session.add(
        Countdown(
            id="c1",
            title="Viaje",
            date=add_days_iso(today, 12),
            created_at=now - 20 * _DAY_MS,
        )
    )

    session.add(
        Notification(
            id="n1",
            title="Bienvenido a Creeky",
            text="Tu clon personal de TickTick está listo.",
            kind="system",
            unread=True,
            created_at=now,
        )
    )
