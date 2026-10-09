import asyncio
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.multiplayer.manager import manager
from app.multiplayer.protocol import (
    CountdownMessage,
    ChatBroadcast,
    ChatMessage,
    ErrorMessage,
    JoinRoomMessage,
    PlayerFinishedMessage,
    PlayerProgressMessage,
    PlayerEliminatedMessage,
    PlayerState,
    RaceEndMessage,
    RaceStartMessage,
    RoomStateMessage,
    TeamState,
)
from app.multiplayer.room import Player
from app.multiplayer.text import generate_race_text, generate_survival_text
from app.database import SessionLocal
from app.models.user import User
from app.models.match import Match, MatchParticipant
from app.models.notification import Notification
from app.core.achievements import ACHIEVEMENTS
from app.core.elo import calculate_elo_changes, calculate_xp, xp_to_level
from app.core.achievements import check_achievements
from app.core.security import decode_access_token

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
        team_id=p.team_id,
        relay_start=p.relay_start,
        relay_end=p.relay_end,
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
        max_players=room.max_players,
        game_mode=room.game_mode,
        eliminated=[p.id for p in room.eliminated],
    ).model_dump()
    await manager.broadcast(room, payload)


def _persist_match_sync(snapshot: dict) -> dict[str, list[str]]:
    db = SessionLocal()
    try:
        users = {u.username: u for u in db.query(User).filter(User.username.in_(snapshot["usernames"])).all()}
        elo_inputs = [{"user_id": str(users[p["username"]].id), "elo": users[p["username"]].elo,
                       "position": p["position"]} for p in snapshot["players"] if p["username"] in users]
        deltas = calculate_elo_changes(elo_inputs)
        winner = next((p for p in snapshot["players"] if p["position"] == 1 and p["finished"]), None)
        winner_user = users.get(winner["username"]) if winner else None
        match = Match(room_id=snapshot["room_id"], started_at=snapshot["started_at"],
            finished_at=datetime.now(timezone.utc), winner_id=winner_user.id if winner_user else None,
            player_count=len(snapshot["players"]), race_text_length=snapshot["text_length"])
        db.add(match)
        db.flush()
        unlocked: dict[str, list[str]] = {}
        for item in snapshot["players"]:
            user = users.get(item["username"])
            xp = calculate_xp(item["wpm"], item["position"], item["finished"])
            before = user.elo if user else None
            delta = deltas.get(str(user.id), 0) if user else None
            if user:
                user.elo = max(100, user.elo + (delta or 0))
                user.xp += xp
                user.level = xp_to_level(user.xp)
                user.matches_played += 1
                if item["position"] == 1 and item["finished"]:
                    user.matches_won += 1
                codes = check_achievements(db, user, item)
                if codes:
                    unlocked[item["username"]] = codes
                    for code in codes:
                        label = ACHIEVEMENTS.get(code, (code, ""))[0]
                        db.add(Notification(user_id=user.id, type="achievement", payload={"code": code, "label": label}))
            db.add(MatchParticipant(match_id=match.id, user_id=user.id if user else None,
                username=item["username"], position=item["position"], wpm=item["wpm"],
                accuracy=item["accuracy"], finished=item["finished"], left_race=item["left_race"],
                elo_before=before, elo_after=user.elo if user else None, elo_delta=delta, xp_earned=xp))
        db.commit()
        return unlocked
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def _finish_race(room, ranking: list[Player]) -> None:
    if room.match_persisted or room.finalizing:
        return
    room.finalizing = True
    room.status = "finished"
    room.match_persisted = True
    eliminated_ids = {p.id for p in room.eliminated}
    players = [{"username": p.username, "position": i + 1,
                "wpm": p.wpm_at_leave if p.left_race else p.wpm,
                "accuracy": p.accuracy, "finished": p.finished and not p.left_race and p.id not in eliminated_ids,
                "left_race": p.left_race} for i, p in enumerate(ranking)]
    snapshot = {"room_id": room.id, "started_at": datetime.fromtimestamp(
        max(room.race_start_at - 0.5, 0), tz=timezone.utc), "text_length": len(room.race_text.split()),
        "players": players, "usernames": [p["username"] for p in players]}
    unlocked = {}
    try:
        unlocked = await asyncio.to_thread(_persist_match_sync, snapshot)
    except Exception as exc:
        print(f"[MATCH-PERSIST] room={room.id} error={exc}")
    try:
        from app.routers.tournaments import advance_match_sync
        advancement = await asyncio.to_thread(advance_match_sync, room.id, ranking[0].username if ranking else "")
        if advancement and advancement.get("room_id"):
            manager.create_room(host_id="", room_id=advancement["room_id"], is_private=True, max_players=2)
    except Exception as exc:
        print(f"[TOURNAMENT-ADVANCE] room={room.id} error={exc}")
    team_payload = []
    if room.game_mode == "relay":
        groups: dict[str, list[Player]] = {}
        for participant in ranking:
            if participant.team_id:
                groups.setdefault(participant.team_id, []).append(participant)
        sorted_groups = sorted(groups.items(), key=lambda entry: max((p.finish_position or 999 for p in entry[1]), default=999))
        team_payload = [TeamState(team_id=team_id, position=index + 1,
            players=[p.username for p in sorted(members, key=lambda member: member.relay_start or 0)],
            average_wpm=round(sum(p.wpm for p in members) / max(1, len(members)), 1)) for index, (team_id, members) in enumerate(sorted_groups)]
    await manager.broadcast(room, RaceEndMessage(ranking=[_player_state(p) for p in ranking], teams=team_payload).model_dump())
    for player in list(room.players.values()):
        codes = unlocked.get(player.username)
        if codes:
            await manager.send_to(player, {"type": "achievements_unlocked", "codes": codes})
    room.finalizing = False


async def _announce_elimination(room, player: Player) -> None:
    await manager.broadcast(room, PlayerEliminatedMessage(
        player_id=player.id, username=player.username,
        position=len(room.eliminated),
        wpm=player.wpm_at_leave if player.left_race else player.wpm,
    ).model_dump())
    eliminated_ids = {p.id for p in room.eliminated}
    survivors = [p for p in room.players.values() if p.id not in eliminated_ids and not p.finished]
    if len(survivors) <= 1:
        if survivors:
            survivors[0].finished = True
            survivors[0].finish_position = 1
        await _finish_race(room, room.get_ranking())
    else:
        await _broadcast_room_state(room.id)


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
            survival = current.game_mode == "survival"
            current.race_text = generate_survival_text() if survival else generate_race_text(
                word_count=30, language="pt", punctuation=False, numbers=False,
            )
            if current.game_mode == "relay":
                words = current.race_text.split()
                ordered = list(current.players.values())
                for index, participant in enumerate(ordered):
                    start = round(index * len(words) / len(ordered))
                    end = round((index + 1) * len(words) / len(ordered))
                    participant.team_id = f"team-{index // 2 + 1}"
                    participant.relay_start = start
                    participant.relay_end = end
            current.race_start_at = time.time() + 0.5

            await manager.broadcast(
                current,
                RaceStartMessage(
                    text=current.race_text,
                    start_at=current.race_start_at,
                    blind_timeout=10,
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
        await websocket.send_json(
            ErrorMessage(detail="Sala não existe").model_dump()
        )
        await websocket.close()
        return

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

        from app.routers.tournaments import is_allowed_tournament_player
        claims = decode_access_token(websocket.query_params.get("token", ""))
        token_user_id = claims.get("sub") if claims else None
        allowed = await asyncio.to_thread(is_allowed_tournament_player, room_id, token_user_id, join.username)
        if allowed is False:
            await websocket.send_json(ErrorMessage(detail="Sala reservada a jogadores deste torneio").model_dump())
            await websocket.close()
            return
        if any(existing.username.casefold() == join.username.casefold() for existing in room.players.values()):
            await websocket.send_json(ErrorMessage(detail="Esse utilizador já está na sala").model_dump())
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

            elif msg_type == "set_game_mode":
                if player.id != room.host_id:
                    await manager.send_to(player, ErrorMessage(detail="Só o host pode alterar o modo").model_dump())
                    continue
                if room.status != "waiting":
                    continue
                mode = data.get("mode", "race")
                if mode not in ("race", "elimination", "survival", "blind", "relay"):
                    continue
                if mode in ("elimination", "relay") and len(room.players) < 2:
                    await manager.send_to(player, ErrorMessage(detail="O modo eliminação requer pelo menos 2 jogadores").model_dump())
                    continue
                room.game_mode = mode
                await _broadcast_room_state(room_id)

            elif msg_type == "set_max_players":
                if player.id != room.host_id:
                    await manager.send_to(player, ErrorMessage(detail="Só o host pode alterar o limite da sala").model_dump())
                    continue
                if room.status != "waiting":
                    continue
                new_max = data.get("max_players", room.max_players)
                if not isinstance(new_max, int) or isinstance(new_max, bool) or not 2 <= new_max <= room.max_allowed_players:
                    await manager.send_to(player, ErrorMessage(detail=f"O limite do teu plano para esta sala é {room.max_allowed_players} jogadores").model_dump())
                    continue

                removed = room.set_max_players(new_max)
                for removed_player in removed:
                    await manager.send_to(
                        removed_player,
                        ErrorMessage(detail="Sala reduzida, foste removido").model_dump(),
                    )
                    try:
                        await removed_player.websocket.close()
                    except Exception:
                        pass
                await _broadcast_room_state(room_id)

            elif msg_type == "progress":
                if room.status != "racing" or player.finished:
                    continue

                if room.game_mode == "relay":
                    teammates = [p for p in room.players.values() if p.team_id == player.team_id and p.relay_end is not None and player.relay_start is not None and p.relay_end <= player.relay_start]
                    if any(not teammate.finished for teammate in teammates):
                        continue

                player.word = data.get("word", player.word)
                if room.game_mode == "relay" and player.relay_start is not None:
                    player.word = min(player.word, (player.relay_end or player.relay_start) - player.relay_start)
                    player.word += player.relay_start
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

                if room.game_mode == "elimination":
                    threshold = room.last_elimination_word + room.elimination_interval
                    eliminated_ids = {p.id for p in room.eliminated}
                    active = [p for p in room.players.values() if not p.finished and p.id not in eliminated_ids]
                    if len(active) > 1:
                        last = min(active, key=lambda p: (p.word, p.char))
                        if last.word >= threshold:
                            last.finished = True
                            last.finish_position = None
                            room.eliminated.append(last)
                            room.last_elimination_word = threshold
                            await _announce_elimination(room, last)

            elif msg_type == "finished":
                if room.status != "racing" or player.finished:
                    continue
                if room.game_mode == "relay":
                    teammates = [p for p in room.players.values() if p.team_id == player.team_id and p.relay_end is not None and player.relay_start is not None and p.relay_end <= player.relay_start]
                    if any(not teammate.finished for teammate in teammates):
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

                if room.game_mode == "elimination":
                    await _finish_race(room, room.get_ranking())
                elif all(p.finished for p in room.players.values()):
                    ranking = room.get_ranking()
                    print(
                        f"[WS-FINISHED-HANDLER] ranking={[p.username for p in ranking]} "
                        f"active={[p.username for p in room.players.values()]} "
                        f"left={[p.username for p in room.left_players]}"
                    )
                    await _finish_race(room, ranking)

            elif msg_type == "rematch":
                if room.status != "finished" or room.finalizing:
                    continue
                if player.id != room.host_id:
                    await manager.send_to(
                        player,
                        ErrorMessage(detail="Só o host pode reiniciar").model_dump(),
                    )
                    continue
                room.reset_for_rematch()
                await _broadcast_room_state(room_id)

            elif msg_type == "chat":
                try:
                    chat = ChatMessage.model_validate(data)
                except ValidationError:
                    continue
                text = chat.text.strip()
                if not text:
                    continue
                await manager.broadcast(
                    room,
                    ChatBroadcast(
                        player_id=player.id,
                        username=player.username,
                        text=text[:200],
                    ).model_dump(),
                )

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
                f"[WS-FINALLY-BEFORE] player={player.username} status={room.status} "
                f"finished={player.finished} was_racing={was_racing} "
                f"active={[p.username for p in room.players.values()]} "
                f"left={[p.username for p in room.left_players]}"
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
                player.wpm_at_leave = player.wpm
                player.wpm = 0.0
                if room.game_mode == "elimination":
                    room.eliminated.append(player)
                else:
                    room.left_players.append(player)

            # Remove do dict de players ativos
            room.remove_player(player.id)
            print(
                f"[WS-FINALLY-AFTER] player={player.username} "
                f"active={[p.username for p in room.players.values()]} "
                f"left={[p.username for p in room.left_players]}"
            )

            # Se, com este jogador já fora, os jogadores activos restantes
            # já tinham todos terminado, a corrida acaba agora (o "finished"
            # normal já não vai disparar, porque não falta mais ninguém a
            # terminar activamente).
            if was_racing and room.game_mode == "elimination":
                await _announce_elimination(room, player)
            elif was_racing and all(p.finished for p in room.players.values()):
                ranking = room.get_ranking()
                print(f"[WS-RACE-END] ranking={[p.username for p in ranking]}")
                await _finish_race(room, ranking)
            elif not room.is_empty():
                await _broadcast_room_state(room.id)

            if room.countdown_task and not room.countdown_task.done():
                room.countdown_task.cancel()

            if room.is_empty():
                manager.remove_room(room.id)
