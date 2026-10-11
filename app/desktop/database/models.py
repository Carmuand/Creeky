"""
Relational models for the Creeky database.
"""

# Standard library
from __future__ import annotations

# Third-party
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
)
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
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)


class TaskList(Base):
    """List that groups the tasks of a user and gives them a color and an icon."""

    __tablename__ = "task_lists"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    is_inbox: Mapped[bool] = mapped_column(Boolean, default=False)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(16), default="#616161")
    icon: Mapped[str] = mapped_column(String(32), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    tasks: Mapped[list[Task]] = relationship(back_populates="task_list")


class Tag(Base):
    """Label of a user that can be attached to any number of their tasks."""

    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tags_user_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    tasks: Mapped[list[Task]] = relationship(secondary=task_tags, back_populates="tags")


class Task(Base):
    """Task with scheduling, reminder and Pomodoro data."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
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
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
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
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quadrant: Mapped[str] = mapped_column(String(2), index=True)
    text: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)


class Countdown(Base):
    """Manual countdown towards a target date."""

    __tablename__ = "countdowns"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(Text)
    date: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[int] = mapped_column(BigInteger)


class PomodoroSession(Base):
    """Finished Pomodoro session, optionally linked to the focused task."""

    __tablename__ = "pomodoro_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
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
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(16), default="system")
    unread: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[int] = mapped_column(BigInteger, index=True)


class EmailLink(Base):
    """Email address linked to a provider for sending backups."""

    __tablename__ = "email_links"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    provider: Mapped[str] = mapped_column(String(16), primary_key=True)
    email: Mapped[str] = mapped_column(String(255))
    linked_at: Mapped[int] = mapped_column(BigInteger)
    last_sent_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)


class NotificationPreference(Base):
    """Whether a user receives desktop notifications of a category."""

    __tablename__ = "notification_preferences"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    category: Mapped[str] = mapped_column(String(32), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class UnadAccount(Base):
    """
    UNAD Campus account linked by a user, with the profile read from the portal.

    The portal password lives in the system credential manager.
    """

    __tablename__ = "unad_accounts"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    document_type: Mapped[str] = mapped_column(String(4), default="CC")
    document: Mapped[str] = mapped_column(String(32))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=30)
    deadline_days: Mapped[int] = mapped_column(Integer, default=2)
    last_sync_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)
    last_error: Mapped[str] = mapped_column(String(64), default="")
    campus_user_id: Mapped[int] = mapped_column(Integer, default=0)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    first_name: Mapped[str] = mapped_column(String(120), default="")
    second_name: Mapped[str] = mapped_column(String(120), default="")
    first_surname: Mapped[str] = mapped_column(String(120), default="")
    second_surname: Mapped[str] = mapped_column(String(120), default="")
    institutional_email: Mapped[str] = mapped_column(String(255), default="")
    notification_email: Mapped[str] = mapped_column(String(255), default="")
    personal_email: Mapped[str] = mapped_column(String(255), default="")
    phone: Mapped[str] = mapped_column(String(64), default="")
    birth_date: Mapped[str] = mapped_column(String(32), default="")
    marital_status: Mapped[str] = mapped_column(String(64), default="")
    blood_type: Mapped[str] = mapped_column(String(16), default="")
    zone: Mapped[str] = mapped_column(String(64), default="")
    stratum: Mapped[str] = mapped_column(String(16), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    profile_updated_at: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, default=None
    )


class UnadAgenda(Base):
    """Course agenda a user follows, scraped from its public page."""

    __tablename__ = "unad_agendas"
    __table_args__ = (UniqueConstraint("user_id", "code", name="uq_unad_agendas_user_code"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(16))
    url: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text, default="")
    credits: Mapped[str] = mapped_column(Text, default="")
    period: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(16), default="#0277BD")
    position: Mapped[int] = mapped_column(Integer, default=0)
    synced_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True, default=None)

    activities: Mapped[list[UnadActivity]] = relationship(
        back_populates="agenda", cascade="all, delete-orphan", order_by="UnadActivity.position"
    )


class UnadActivity(Base):
    """Activity of a followed agenda, with its normalized dates and reminder flags."""

    __tablename__ = "unad_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agenda_id: Mapped[str] = mapped_column(
        ForeignKey("unad_agendas.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    section: Mapped[str] = mapped_column(Text, default="")
    moment: Mapped[str] = mapped_column(String(64), default="")
    rac: Mapped[str] = mapped_column(String(64), default="")
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    activity_type: Mapped[str] = mapped_column(String(64), default="")
    weight: Mapped[str] = mapped_column(String(32), default="")
    start_raw: Mapped[str] = mapped_column(String(64), default="")
    end_raw: Mapped[str] = mapped_column(String(64), default="")
    starts_at: Mapped[str] = mapped_column(String(16), default="", index=True)
    ends_at: Mapped[str] = mapped_column(String(16), default="", index=True)
    alert: Mapped[str] = mapped_column(Text, default="")
    feedback: Mapped[str] = mapped_column(Text, default="")
    notified_opening: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_deadline: Mapped[bool] = mapped_column(Boolean, default=False)

    agenda: Mapped[UnadAgenda] = relationship(back_populates="activities")


class Setting(Base):
    """Key-value preference shared by every account on this computer."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
