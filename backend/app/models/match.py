import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    winner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    player_count: Mapped[int] = mapped_column(Integer, nullable=False)
    race_text_length: Mapped[int] = mapped_column(Integer, nullable=False)
    participants: Mapped[list["MatchParticipant"]] = relationship(back_populates="match", cascade="all, delete-orphan")


class MatchParticipant(Base):
    __tablename__ = "match_participants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wpm: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    finished: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    left_race: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    elo_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elo_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    elo_delta: Mapped[int | None] = mapped_column(Integer, nullable=True)
    xp_earned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    match: Mapped[Match] = relationship(back_populates="participants")
