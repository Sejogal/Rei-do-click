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

    # ─── Gestão de jogadores ───────────────────────

    def add_player(self, player: Player) -> None:
        self.players[player.id] = player

    def remove_player(self, player_id: str) -> None:
        self.players.pop(player_id, None)
        if player_id == self.host_id and self.players:
            self.host_id = next(iter(self.players.keys()))

    def is_full(self) -> bool:
        return len(self.players) >= 4

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
        for p in self.players.values():
            p.ready = False
            p.finished = False
            p.left_race = False
            p.wpm = 0.0
            p.accuracy = 0.0
            p.word = 0
            p.char = 0
            p.finish_position = None

    def get_ranking(self) -> list[Player]:
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