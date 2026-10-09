from typing import Literal

from pydantic import BaseModel, Field


# ─── Cliente → Servidor ───────────────────────────

class JoinRoomMessage(BaseModel):
    type: Literal["join_room"]
    username: str = Field(min_length=1, max_length=50)


class ReadyMessage(BaseModel):
    type: Literal["ready"]


class ProgressMessage(BaseModel):
    type: Literal["progress"]
    word: int = Field(ge=0)
    char: int = Field(ge=0)
    wpm: float = Field(ge=0)


class FinishedMessage(BaseModel):
    type: Literal["finished"]
    wpm: float = Field(ge=0)
    accuracy: float = Field(ge=0, le=100)


class LeaveMessage(BaseModel):
    type: Literal["leave"]


class ChatMessage(BaseModel):
    type: Literal["chat"]
    text: str = Field(min_length=1, max_length=200)


class SetGameModeMessage(BaseModel):
    type: Literal["set_game_mode"]
    mode: Literal["race", "elimination", "survival", "blind", "relay"]


class SetMaxPlayersMessage(BaseModel):
    type: Literal["set_max_players"]
    max_players: int = Field(ge=2, le=20)


ClientMessage = (
    JoinRoomMessage
    | ReadyMessage
    | ProgressMessage
    | FinishedMessage
    | LeaveMessage
    | ChatMessage
    | SetGameModeMessage
    | SetMaxPlayersMessage
)


# ─── Servidor → Cliente ───────────────────────────

class PlayerState(BaseModel):
    id: str
    username: str
    ready: bool = False
    finished: bool = False
    wpm: float = 0
    word: int = 0
    char: int = 0
    team_id: str | None = None
    relay_start: int | None = None
    relay_end: int | None = None


class RoomStateMessage(BaseModel):
    type: Literal["room_state"] = "room_state"
    room_id: str
    players: list[PlayerState]
    status: Literal["waiting", "countdown", "racing", "finished"]
    host_id: str
    max_players: int = 4
    game_mode: Literal["race", "elimination", "survival", "blind", "relay"] = "race"
    eliminated: list[str] = Field(default_factory=list)


class CountdownMessage(BaseModel):
    type: Literal["countdown"] = "countdown"
    value: int  # 3, 2, 1


class RaceStartMessage(BaseModel):
    type: Literal["race_start"] = "race_start"
    text: str
    start_at: float  # timestamp UNIX (server) para sync
    blind_timeout: int = 10


class PlayerProgressMessage(BaseModel):
    type: Literal["player_progress"] = "player_progress"
    player_id: str
    word: int
    char: int
    wpm: float


class PlayerFinishedMessage(BaseModel):
    type: Literal["player_finished"] = "player_finished"
    player_id: str
    wpm: float
    accuracy: float
    position: int  # 1º, 2º, 3º, 4º


class TeamState(BaseModel):
    team_id: str
    position: int
    players: list[str]
    average_wpm: float


class RaceEndMessage(BaseModel):
    type: Literal["race_end"] = "race_end"
    ranking: list[PlayerState]
    teams: list[TeamState] = Field(default_factory=list)


class ChatBroadcast(BaseModel):
    type: Literal["chat"] = "chat"
    player_id: str
    username: str
    text: str


class AchievementsUnlockedMessage(BaseModel):
    type: Literal["achievements_unlocked"] = "achievements_unlocked"
    codes: list[str]


class PlayerEliminatedMessage(BaseModel):
    type: Literal["player_eliminated"] = "player_eliminated"
    player_id: str
    username: str
    position: int
    wpm: float


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    detail: str


ServerMessage = (
    RoomStateMessage
    | CountdownMessage
    | RaceStartMessage
    | PlayerProgressMessage
    | PlayerFinishedMessage
    | RaceEndMessage
    | ChatBroadcast
    | AchievementsUnlockedMessage
    | PlayerEliminatedMessage
    | ErrorMessage
)
