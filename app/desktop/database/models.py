"""
Relational models for the Creeky database.
"""

# Standard library
from __future__ import annotations

# Third-party
from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Declarative base shared by every model."""


task_tags: Table = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", String(32), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    """Local account. Its password hash lives in the system credential manager."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[int] = mapped_column(BigInteger)


class TaskList(Base):
    """List that groups tasks and gives them a color and an icon."""

    __tablename__ = "task_lists"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(16), default="#616161")
    icon: Mapped[str] = mapped_column(String(32), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    tasks: Mapped[list[Task]] = relationship(back_populates="task_list")


class Tag(Base):
    """Label that can be attached to any number of tasks."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    tasks: Mapped[list[Task]] = relationship(secondary=task_tags, back_populates="tags")


class Task(Base):
    """Task with scheduling, reminder and Pomodoro data."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    list_id: Mapped[str] = mapped_column(ForeignKey("task_lists.id"), index=True)
    priority: Mapped[str] = mapped_column(String(8), default="none")
    due: Mapped[str] = mapped_column(String(10), default="")
    due_time: Mapped[str] = mapped_column(String(5), default="")
    duration: Mapped[int] = mapped_column(Integer, default=30)
    remind_before: Mapped[int] = mapped_column(Integer, default=15)
    reminder: Mapped[str] = mapped_column(String(16), default="")
    reminded: Mapped[bool] = mapped_column(Boolean, default=False)
    quadrant: Mapped[str] = mapped_column(String(2), default="")
    pomodoro_count: Mapped[int] = mapped_column(Integer, default=0)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)
    created_at: Mapped[int] = mapped_column(BigInteger)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)

    task_list: Mapped[TaskList] = relationship(back_populates="tasks")
    tags: Mapped[list[Tag]] = relationship(secondary=task_tags, back_populates="tasks")
    repeat_days: Mapped[list[TaskRepeatDay]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    pomodoro_blocks: Mapped[list[PomodoroBlock]] = relationship(
        back_populates="task", cascade="all, delete-orphan", order_by="PomodoroBlock.position"
    )


class TaskRepeatDay(Base):
    """Weekday on which a task repeats, using 0 for Sunday through 6 for Saturday."""

    __tablename__ = "task_repeat_days"

    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    weekday: Mapped[int] = mapped_column(Integer, primary_key=True)

    task: Mapped[Task] = relationship(back_populates="repeat_days")


class PomodoroBlock(Base):
    """Planned focus or break block reserved for a task."""

    __tablename__ = "pomodoro_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(16))
    duration: Mapped[int] = mapped_column(Integer)

    task: Mapped[Task] = relationship(back_populates="pomodoro_blocks")


class Habit(Base):
    """Daily habit tracked through one check per completed day."""

    __tablename__ = "habits"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    best_streak: Mapped[int] = mapped_column(Integer, default=0)
    notify: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_time: Mapped[str] = mapped_column(String(5), default="09:00")
    last_ping: Mapped[str] = mapped_column(String(10), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    checks: Mapped[list[HabitCheck]] = relationship(
        back_populates="habit", cascade="all, delete-orphan"
    )


class HabitCheck(Base):
    """Day on which a habit was completed."""

    __tablename__ = "habit_checks"

    habit_id: Mapped[str] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), primary_key=True)

    habit: Mapped[Habit] = relationship(back_populates="checks")


class MatrixNote(Base):
    """Manual note placed in an Eisenhower quadrant."""

    __tablename__ = "matrix_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quadrant: Mapped[str] = mapped_column(String(2), index=True)
    text: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Countdown(Base):
    """Manual countdown towards a target date."""

    __tablename__ = "countdowns"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    date: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[int] = mapped_column(BigInteger)


class PomodoroSession(Base):
    """Finished Pomodoro session, optionally linked to the focused task."""

    __tablename__ = "pomodoro_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    timestamp: Mapped[int] = mapped_column(BigInteger)
    mode: Mapped[str] = mapped_column(String(8))
    minutes: Mapped[int] = mapped_column(Integer)
    task_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, default=None
    )
    task_title: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class Notification(Base):
    """In-app notification shown in the notifications view."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(16), default="system")
    unread: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[int] = mapped_column(BigInteger, index=True)


class EmailLink(Base):
    """Email address linked to a provider for sending backups."""

    __tablename__ = "email_links"

    provider: Mapped[str] = mapped_column(String(16), primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    linked_at: Mapped[int] = mapped_column(BigInteger)
    last_sent_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)


class Setting(Base):
    """Key-value application preference."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
