"""
Starter data given to every new account.
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
from desktop.utills.dates import add_days_iso, monday_of, new_id, now_ms, today_iso

INBOX_ALIAS: str = "inbox"
DEFAULT_LIST_ICON: str = "\U0001F4CB"
DEFAULT_TAGS: tuple[str, ...] = ("trabajo", "personal", "urgente")

_DAY_MS: int = 86_400_000


def seed_user_data(session: Session, user_id: str) -> None:
    """
    Insert the starter lists, tags, tasks, habits and notes of a new account.

    Args:
        session: Open database session.
        user_id: Identifier of the account that owns the data.
    """
    now: int = now_ms()
    today: str = today_iso()
    monday: str = monday_of(today)

    inbox: TaskList = TaskList(
        id=new_id("l"),
        user_id=user_id,
        is_inbox=True,
        name="Bandeja de entrada",
        description="Captura rápida sin clasificar.",
        color="#212121",
        icon="\U0001F4E5",
        position=0,
    )
    work: TaskList = TaskList(
        id=new_id("l"),
        user_id=user_id,
        name="Trabajo",
        description="Pendientes laborales.",
        color="#3949AB",
        icon="\U0001F4BC",
        position=1,
    )
    personal: TaskList = TaskList(
        id=new_id("l"),
        user_id=user_id,
        name="Personal",
        description="Asuntos propios.",
        color="#00897B",
        icon="\U0001F3E0",
        position=2,
    )
    session.add_all([inbox, work, personal])

    tags: dict[str, Tag] = {
        name: Tag(user_id=user_id, name=name, position=index)
        for index, name in enumerate(DEFAULT_TAGS)
    }
    session.add_all(tags.values())
    session.flush()

    session.add_all(
        [
            Task(
                id=new_id("t"),
                user_id=user_id,
                title="Revisar pendientes de la semana",
                description="Revisa cada lista y pon fecha a lo importante.",
                list_id=inbox.id,
                priority="medium",
                due=today,
                due_time="09:00",
                created_at=now,
                position=0,
                tags=[tags["personal"]],
            ),
            Task(
                id=new_id("t"),
                user_id=user_id,
                title="Probar Pomodoro de 25 min",
                list_id=work.id,
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
                id=new_id("h"),
                user_id=user_id,
                name="Leer 20 min",
                best_streak=3,
                position=0,
                checks=[HabitCheck(date=add_days_iso(monday, offset)) for offset in (0, 1, 2, 4)],
            ),
            Habit(
                id=new_id("h"),
                user_id=user_id,
                name="Ejercicio",
                best_streak=5,
                position=1,
                checks=[HabitCheck(date=add_days_iso(monday, offset)) for offset in range(5)],
            ),
        ]
    )

    session.add_all(
        [
            MatrixNote(user_id=user_id, quadrant="q1", text="Entrega urgente", position=0),
            MatrixNote(user_id=user_id, quadrant="q2", text="Planear semana", position=0),
        ]
    )

    session.add(
        Countdown(
            id=new_id("c"),
            user_id=user_id,
            title="Viaje",
            date=add_days_iso(today, 12),
            created_at=now - 20 * _DAY_MS,
        )
    )

    session.add(
        Notification(
            id=new_id("n"),
            user_id=user_id,
            title="Bienvenido a Creeky",
            text="Tu clon personal de TickTick está listo.",
            kind="system",
            unread=True,
            created_at=now,
        )
    )
    session.flush()
