import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResultCreate(BaseModel):
    wpm: int = Field(ge=0)
    raw: int = Field(ge=0)
    accuracy: float = Field(ge=0, le=100)
    consistency: float = Field(ge=0, le=100)
    correct_chars: int = Field(ge=0)
    incorrect_chars: int = Field(ge=0)
    total_chars: int = Field(ge=0)
    time_seconds: float = Field(ge=0)

    mode: str = Field(pattern="^(time|words)$")
    source: str = Field(pattern="^(words|quote|code|custom)$")
    duration: int = Field(ge=1)
    punctuation: bool = False
    numbers: bool = False
    language: str = Field(pattern="^(pt|en)$")


class ResultResponse(BaseModel):
    id: uuid.UUID
    wpm: int
    raw: int
    accuracy: float
    consistency: float
    correct_chars: int
    incorrect_chars: int
    total_chars: int
    time_seconds: float
    mode: str
    source: str
    duration: int
    punctuation: bool
    numbers: bool
    language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResultStats(BaseModel):
    count: int
    best_wpm: int
    avg_wpm: float
    avg_accuracy: float
    avg_consistency: float
    total_time_seconds: float