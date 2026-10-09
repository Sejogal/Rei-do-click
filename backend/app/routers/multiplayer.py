from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.multiplayer.manager import manager

router = APIRouter(prefix="/multiplayer", tags=["multiplayer"])


def max_players_for_plan(plan: str) -> int:
    return 20 if plan.strip().lower() in {"pro", "team"} else 4


@router.get("/rooms")
def available_rooms(current_user: User = Depends(get_current_user)):
    """Lista salas públicas em espera sem entrar nelas nem criar salas novas."""
    return [
        {
            "room_id": room.id,
            "players_count": len(room.players),
            "max_players": room.max_players,
            "game_mode": room.game_mode,
        }
        for room in manager.rooms.values()
        if room.status == "waiting" and not room.is_private and not room.is_full()
    ]


@router.post("/matchmake")
async def matchmake(current_user: User = Depends(get_current_user)):
    room = await manager.matchmake(host_id="", max_players=max_players_for_plan(current_user.plan))
    return {"room_id": room.id}


@router.post("/create-public")
async def create_public(current_user: User = Depends(get_current_user)):
    """Cria uma sala pública e devolve o seu código para o host entrar."""
    async with manager.matchmake_lock:
        room = manager.create_room(
            host_id="",
            is_private=False,
            max_players=max_players_for_plan(current_user.plan),
        )
    return {"room_id": room.id}


@router.post("/create-private")
async def create_private(current_user: User = Depends(get_current_user)):
    """Cria uma sala nova e devolve o room_id."""
    async with manager.matchmake_lock:
        room = manager.create_room(host_id="", is_private=True,
                                   max_players=max_players_for_plan(current_user.plan))
    return {"room_id": room.id}


@router.get("/debug/rooms")
def debug_rooms():
    return {
        "rooms": [
            {
                "id": r.id,
                "status": r.status,
                "players": len(r.players),
                "host_id": r.host_id,
            }
            for r in manager.rooms.values()
        ]
    }
