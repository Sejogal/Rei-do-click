import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Result(Base):
    __tablename__ = "results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Métricas
    wpm: Mapped[int] = mapped_column(Integer, nullable=False)
    raw: Mapped[int] = mapped_column(Integer, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    consistency: Mapped[float] = mapped_column(Float, nullable=False)
    correct_chars: Mapped[int] = mapped_column(Integer, nullable=False)
    incorrect_chars: Mapped[int] = mapped_column(Integer, nullable=False)
    total_chars: Mapped[int] = mapped_column(Integer, nullable=False)
    time_seconds: Mapped[float] = mapped_column(Float, nullable=False)

    # Config usada
    mode: Mapped[str] = mapped_column(String(20), nullable=False)         # time | words
    source: Mapped[str] = mapped_column(String(20), nullable=False)       # words | quote | code | custom
    duration: Mapped[int] = mapped_column(Integer, nullable=False)        # tempo em segundos ou nº de palavras
    punctuation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    numbers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    language: Mapped[str] = mapped_column(String(5), nullable=False)      # pt | en

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relação com User
    user: Mapped["User"] = relationship(back_populates="results")  # type: ignore[name-defined]


# Import no fim para evitar circular
from app.models.user import User  # noqa: E402, F401