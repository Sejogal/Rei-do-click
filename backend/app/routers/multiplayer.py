from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.multiplayer.manager import manager

router = APIRouter(prefix="/multiplayer", tags=["multiplayer"])


@router.post("/matchmake")
async def matchmake(current_user: User = Depends(get_current_user)):
    room = await manager.matchmake(host_id="")  # ⬅️ vazio, o WS define
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