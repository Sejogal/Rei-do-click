import asyncio
import uuid

from fastapi import WebSocket

from app.multiplayer.room import Player, Room


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, Room] = {}
        self.matchmake_lock = asyncio.Lock()  

    # ─── Salas ─────────────────────────────────────

    def create_room(self, host_id: str, room_id: str | None = None) -> Room:
        # `room_id` explícito (usado por app/routers/ws.py ao criar a sala
        # para um room_id da URL que ainda não existe): antes a sala nascia
        # com um id aleatório e era "renomeada" por fora (room.id = room_id)
        # sem remover a entrada antiga do dict — ficava a mesma Room
        # registada sob DUAS chaves (o id aleatório original e o novo), e
        # remove_room(room.id) só apagava uma delas. A outra ficava
        # orfã para sempre: vazia, "waiting", e o find_available_room()
        # voltava sempre a encontrá-la e a devolver o mesmo room_id antigo.
        room_id = room_id or uuid.uuid4().hex[:6].upper()  # ex: "A1B2C3"
        room = Room(id=room_id, host_id=host_id)
        self.rooms[room_id] = room
        return room

    def get_room(self, room_id: str) -> Room | None:
        return self.rooms.get(room_id)

    def find_available_room(self) -> Room | None:
        """Devolve a primeira sala em waiting com espaço."""
        for room in self.rooms.values():
            if room.status == "waiting" and not room.is_full():
                return room
        return None

    def remove_room(self, room_id: str) -> None:
        room = self.rooms.pop(room_id, None)
        if room and room.countdown_task and not room.countdown_task.done():
            room.countdown_task.cancel()

    # ─── Broadcast ─────────────────────────────────

    async def broadcast(self, room: Room, payload: dict, exclude: str | None = None) -> None:
        """Envia payload a todos os jogadores da sala (opcionalmente excluindo um)."""
        dead: list[str] = []
        for player_id, player in room.players.items():
            if player_id == exclude:
                continue
            try:
                await player.websocket.send_json(payload)
            except Exception:
                dead.append(player_id)

        # Limpa ligações mortas
        for pid in dead:
            room.remove_player(pid)

    async def send_to(self, player: Player, payload: dict) -> None:
        try:
            await player.websocket.send_json(payload)
        except Exception:
            room = None
            # tenta encontrar a sala do jogador
            for r in self.rooms.values():
                if player.id in r.players:
                    room = r
                    break
            if room:
                room.remove_player(player.id)

    async def matchmake(self, host_id: str = "") -> Room:
        async with self.matchmake_lock:
            room = self.find_available_room()
            if not room:
                room = self.create_room(host_id=host_id)
            return room

manager = ConnectionManager()