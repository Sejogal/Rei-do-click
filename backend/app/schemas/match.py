import uuid
from datetime import datetime
from pydantic import BaseModel


class MatchParticipantResponse(BaseModel):
    id: uuid.UUID
    username: str
    position: int | None
    wpm: float
    accuracy: float
    finished: bool
    left_race: bool
    elo_delta: int | None
    xp_earned: int | None


class MatchResponse(BaseModel):
    id: uuid.UUID
    room_id: str
    started_at: datetime
    finished_at: datetime | None
    winner_username: str | None
    player_count: int
    participants: list[MatchParticipantResponse]


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    elo: int
    level: int
    matches_played: int
    matches_won: int
