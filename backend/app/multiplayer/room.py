import asyncio
import time
from dataclasses import dataclass, field
from typing import Literal

from fastapi import WebSocket


RoomStatus = Literal["waiting", "countdown", "racing", "finished"]


@dataclass
class Player:
    id: str
    username: str
    websocket: WebSocket
    ready: bool = False
    finished: bool = False
    wpm: float = 0.0
    accuracy: float = 0.0
    word: int = 0
    char: int = 0
    finish_position: int | None = None
    # True = desistiu (desligou-se a meio da corrida sem terminar), nunca
    # um "finished" real. Usado por Room.get_ranking() para garantir que
    # quem desiste fica sempre atrás de quem terminou mesmo a corrida.
    left_race: bool = False
    wpm_at_leave: float = 0.0
    team_id: str | None = None
    relay_start: int | None = None
    relay_end: int | None = None


@dataclass
class Room:
    id: str
    host_id: str
    status: RoomStatus = "waiting"
    players: dict[str, Player] = field(default_factory=dict)
    race_text: str = ""
    race_start_at: float = 0.0
    countdown_task: asyncio.Task | None = None
    finished_count: int = 0
    # Jogadores que desistiram a meio da corrida (desligaram-se antes de
    # terminar). Removidos de `players` (que só tem ligações activas) no
    # momento em que saem, mas guardados aqui para continuarem a contar no
    # ranking final mesmo que os restantes só terminem depois — ver
    # app/routers/ws.py, bloco `finally`.
    left_players: list[Player] = field(default_factory=list)
    is_private: bool = False
    max_players: int = 4
    max_allowed_players: int = 4
    match_persisted: bool = False
    finalizing: bool = False
    game_mode: Literal["race", "elimination", "survival", "blind", "relay"] = "race"
    elimination_interval: int = 10
    eliminated: list[Player] = field(default_factory=list)
    last_elimination_word: int = 0

    # ─── Gestão de jogadores ───────────────────────

    def add_player(self, player: Player) -> None:
        self.players[player.id] = player

    def remove_player(self, player_id: str) -> None:
        self.players.pop(player_id, None)
        if player_id == self.host_id and self.players:
            self.host_id = next(iter(self.players.keys()))

    def is_full(self) -> bool:
        return len(self.players) >= self.max_players

    def set_max_players(self, new_max: int) -> list[Player]:
        """Reduce the room limit, preserving the host and newest-entry order."""
        if not 2 <= new_max <= self.max_allowed_players:
            raise ValueError(f"max_players must be between 2 and {self.max_allowed_players}")

        players_list = list(self.players.values())
        candidates = [player for player in reversed(players_list) if player.id != self.host_id]
        removed: list[Player] = []
        while len(self.players) - len(removed) > new_max and candidates:
            removed.append(candidates.pop(0))

        for player in removed:
            self.players.pop(player.id, None)
        self.max_players = new_max
        return removed

    def is_empty(self) -> bool:
        return len(self.players) == 0

    def all_ready(self) -> bool:
        return all(p.ready for p in self.players.values()) and len(self.players) >= 2

    def reset_ready(self) -> None:
        for p in self.players.values():
            p.ready = False

    def reset_for_rematch(self) -> None:
        self.status = "waiting"
        self.race_text = ""
        self.race_start_at = 0.0
        self.finished_count = 0
        self.left_players = []
        self.match_persisted = False
        self.finalizing = False
        self.eliminated = []
        self.last_elimination_word = 0
        for p in self.players.values():
            p.ready = False
            p.finished = False
            p.left_race = False
            p.wpm = 0.0
            p.accuracy = 0.0
            p.word = 0
            p.char = 0
            p.finish_position = None
            p.wpm_at_leave = 0.0
            p.team_id = None
            p.relay_start = None
            p.relay_end = None

    def get_ranking(self) -> list[Player]:
        if self.game_mode == "elimination":
            eliminated_ids = {player.id for player in self.eliminated}
            survivors = [p for p in self.players.values() if p.id not in eliminated_ids]
            survivors.sort(key=lambda p: (
                not p.finished,
                p.finish_position if p.finish_position is not None else 999,
                -(p.word * 1000 + p.char),
            ))
            return survivors + list(reversed(self.eliminated))
        """Jogadores (activos + os que desistiram a meio) ordenados por
        posição de chegada. Quem desistiu (`left_race=True`) fica sempre
        depois de quem terminou mesmo a corrida, não importa quando saiu em
        relação aos outros — nunca ultrapassa alguém que chegou ao fim."""
        all_players = list(self.players.values()) + self.left_players
        return sorted(
            all_players,
            key=lambda p: (
                p.left_race,
                p.finish_position is None,
                p.finish_position or 999,
            ),
        )
