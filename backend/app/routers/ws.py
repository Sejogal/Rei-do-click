import asyncio
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.multiplayer.manager import manager
from app.multiplayer.protocol import (
    CountdownMessage,
    ErrorMessage,
    JoinRoomMessage,
    PlayerFinishedMessage,
    PlayerProgressMessage,
    PlayerState,
    RaceEndMessage,
    RaceStartMessage,
    RoomStateMessage,
)
from app.multiplayer.room import Player
from app.multiplayer.text import generate_race_text

router = APIRouter()


# ─────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────

def _player_state(p: Player) -> PlayerState:
    return PlayerState(
        id=p.id,
        username=p.username,
        ready=p.ready,
        finished=p.finished,
        wpm=p.wpm,
        word=p.word,
        char=p.char,
    )


async def _broadcast_room_state(room_id: str) -> None:
    room = manager.get_room(room_id)
    if not room:
        return
    payload = RoomStateMessage(
        room_id=room.id,
        players=[_player_state(p) for p in room.players.values()],
        status=room.status,
        host_id=room.host_id,
    ).model_dump()
    await manager.broadcast(room, payload)


async def _start_countdown(room_id: str) -> None:
    room = manager.get_room(room_id)
    if not room:
        return

    room.status = "countdown"
    await _broadcast_room_state(room_id)

    try:
        for value in [3, 2, 1]:
            await asyncio.sleep(1)

            current = manager.get_room(room_id)
            if (
                not current
                or current.status != "countdown"
                or not current.all_ready()
            ):
                if current:
                    current.status = "waiting"
                    await _broadcast_room_state(room_id)
                return

            await manager.broadcast(
                current, CountdownMessage(value=value).model_dump()
            )

        # Fim do countdown → race_start
        await asyncio.sleep(1)
        current = manager.get_room(room_id)
        if current:
            current.status = "racing"
            current.race_text = generate_race_text(
                word_count=30,
                language="pt",
                punctuation=False,
                numbers=False,
            )
            current.race_start_at = time.time() + 0.5

            await manager.broadcast(
                current,
                RaceStartMessage(
                    text=current.race_text,
                    start_at=current.race_start_at,
                ).model_dump(),
            )
            await _broadcast_room_state(room_id)

    except asyncio.CancelledError:
        current = manager.get_room(room_id)
        if current:
            current.status = "waiting"
            await _broadcast_room_state(room_id)
        raise

    finally:
        current = manager.get_room(room_id)
        if current:
            current.countdown_task = None


# ─────────────────────────────────────────────────
# Endpoint WebSocket
# ─────────────────────────────────────────────────

@router.websocket("/ws/room/{room_id}")
async def room_ws(websocket: WebSocket, room_id: str):
    await websocket.accept()

    room = manager.get_room(room_id)
    if not room:
        room = manager.create_room(host_id="", room_id=room_id)

    player_id = uuid.uuid4().hex
    player: Player | None = None

    try:
        first = await websocket.receive_json()
        try:
            join = JoinRoomMessage(**first)
        except Exception:
            await websocket.send_json(
                ErrorMessage(
                    detail="Primeira mensagem deve ser join_room"
                ).model_dump()
            )
            await websocket.close()
            return

        if room.is_full():
            await websocket.send_json(
                ErrorMessage(detail="Sala cheia").model_dump()
            )
            await websocket.close()
            return

        if room.status != "waiting":
            await websocket.send_json(
                ErrorMessage(detail="Corrida em curso").model_dump()
            )
            await websocket.close()
            return

        player = Player(id=player_id, username=join.username, websocket=websocket)
        room.add_player(player)

        if not room.host_id:
            room.host_id = player_id

        await _broadcast_room_state(room_id)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ready":
                if room.status != "waiting":
                    await manager.send_to(
                        player,
                        ErrorMessage(
                            detail="Não é possível marcar ready agora"
                        ).model_dump(),
                    )
                    continue

                player.ready = True
                await _broadcast_room_state(room_id)

                if room.all_ready() and room.countdown_task is None:
                    room.countdown_task = asyncio.create_task(
                        _start_countdown(room_id)
                    )

            elif msg_type == "progress":
                if room.status != "racing":
                    continue

                player.word = data.get("word", player.word)
                player.char = data.get("char", player.char)
                player.wpm = data.get("wpm", player.wpm)

                await manager.broadcast(
                    room,
                    PlayerProgressMessage(
                        player_id=player.id,
                        word=player.word,
                        char=player.char,
                        wpm=player.wpm,
                    ).model_dump(),
                    exclude=player.id,
                )

            elif msg_type == "finished":
                if room.status != "racing" or player.finished:
                    continue

                player.finished = True
                player.wpm = data.get("wpm", player.wpm)
                player.accuracy = data.get("accuracy", player.accuracy)

                room.finished_count += 1
                player.finish_position = room.finished_count

                await manager.broadcast(
                    room,
                    PlayerFinishedMessage(
                        player_id=player.id,
                        wpm=player.wpm,
                        accuracy=player.accuracy,
                        position=player.finish_position,
                    ).model_dump(),
                )

                if all(p.finished for p in room.players.values()):
                    room.status = "finished"
                    ranking = room.get_ranking()
                    await manager.broadcast(
                        room,
                        RaceEndMessage(
                            ranking=[_player_state(p) for p in ranking],
                        ).model_dump(),
                    )
                    await _broadcast_room_state(room_id)

            elif msg_type == "rematch":
                if room.status != "finished":
                    continue
                if player.id != room.host_id:
                    await manager.send_to(
                        player,
                        ErrorMessage(detail="Só o host pode reiniciar").model_dump(),
                    )
                    continue
                room.reset_for_rematch()
                await _broadcast_room_state(room_id)

            elif msg_type == "leave":
                break

            else:
                print(f"[WS] {room_id} | {player.username} | {data}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] erro: {e}")
    finally:
        if player:
            # Captura info antes de remover
            was_racing = room.status == "racing" and not player.finished
            print(
                f"[WS-FINALLY] player={player.username} status={room.status} "
                f"finished={player.finished} was_racing={was_racing} "
                f"active_players={[p.username for p in room.players.values()]} "
                f"left_players={[p.username for p in room.left_players]}"
            )

            # Se saiu durante a corrida → marca como desistente e guarda-o
            # em left_players (fora de `room.players`, que só tem ligações
            # activas) para que Room.get_ranking() continue a incluí-lo no
            # ranking final mesmo que os restantes só terminem DEPOIS deste
            # jogador já ter saído — o "finished" normal (acima) só dispara
            # quando é um jogador activo a terminar, e nessa altura este já
            # não está em room.players para ser contado.
            if was_racing:
                room.finished_count += 1
                player.finished = True
                player.left_race = True
                player.finish_position = room.finished_count
                player.wpm = 0.0
                room.left_players.append(player)

            # Remove do dict de players ativos
            room.remove_player(player.id)

            # Se, com este jogador já fora, os jogadores activos restantes
            # já tinham todos terminado, a corrida acaba agora (o "finished"
            # normal já não vai disparar, porque não falta mais ninguém a
            # terminar activamente).
            if was_racing and room.players and all(p.finished for p in room.players.values()):
                room.status = "finished"
                ranking = room.get_ranking()
                await manager.broadcast(
                    room,
                    RaceEndMessage(
                        ranking=[_player_state(p) for p in ranking],
                    ).model_dump(),
                )

            if room.countdown_task and not room.countdown_task.done():
                room.countdown_task.cancel()

            if room.is_empty():
                manager.remove_room(room.id)
            else:
                await _broadcast_room_state(room.id)
