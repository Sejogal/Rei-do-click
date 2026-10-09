import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import decode_access_token
from app.database import SessionLocal, get_db
from app.models.friendship import Friendship
from app.models.notification import Notification
from app.models.user import User
from app.multiplayer.manager import manager

router = APIRouter(prefix="/friends", tags=["friends"])
presence_router = APIRouter(tags=["presence"])


class FriendRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class RoomInviteRequest(BaseModel):
    room_id: str = Field(min_length=1, max_length=20)


@router.post("/request", status_code=201)
def request_friend(payload: FriendRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.username.ilike(payload.username), User.is_active.is_(True)).first()
    if not target:
        raise HTTPException(404, "Utilizador não encontrado")
    if target.id == user.id:
        raise HTTPException(400, "Não podes adicionar a tua própria conta")
    existing = db.query(Friendship).filter(or_(
        (Friendship.user_id == user.id) & (Friendship.friend_id == target.id),
        (Friendship.user_id == target.id) & (Friendship.friend_id == user.id),
    )).all()
    if any(row.status == "accepted" for row in existing):
        raise HTTPException(409, "Já são amigos")
    if existing:
        raise HTTPException(409, "Já existe um pedido de amizade")
    relation = Friendship(id=uuid.uuid4(), user_id=user.id, friend_id=target.id, status="pending")
    db.add(relation)
    db.add(Notification(user_id=target.id, type="friend_request", payload={"friendship_id": str(relation.id), "username": user.username}))
    db.commit()
    return {"id": str(relation.id), "status": relation.status}


@router.post("/accept/{friendship_id}")
def accept_friend(friendship_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    relation = db.query(Friendship).filter(Friendship.id == friendship_id, Friendship.friend_id == user.id, Friendship.status == "pending").first()
    if not relation:
        raise HTTPException(404, "Pedido pendente não encontrado")
    relation.status = "accepted"
    reverse = db.query(Friendship).filter(Friendship.user_id == user.id, Friendship.friend_id == relation.user_id).first()
    if reverse:
        reverse.status = "accepted"
    else:
        db.add(Friendship(user_id=user.id, friend_id=relation.user_id, status="accepted"))
    db.add(Notification(user_id=relation.user_id, type="friend_accepted", payload={"username": user.username}))
    db.commit()
    return {"status": "accepted"}


@router.post("/reject/{friendship_id}", status_code=204)
def reject_friend(friendship_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    relation = db.query(Friendship).filter(Friendship.id == friendship_id, Friendship.friend_id == user.id, Friendship.status == "pending").first()
    if not relation:
        raise HTTPException(404, "Pedido pendente não encontrado")
    db.delete(relation); db.commit()


@router.delete("/{friendship_id}", status_code=204)
def remove_friend(friendship_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    relation = db.query(Friendship).filter(Friendship.id == friendship_id, or_(Friendship.user_id == user.id, Friendship.friend_id == user.id)).first()
    if not relation:
        raise HTTPException(404, "Amizade não encontrada")
    other_id = relation.friend_id if relation.user_id == user.id else relation.user_id
    db.query(Friendship).filter(or_(
        (Friendship.user_id == user.id) & (Friendship.friend_id == other_id),
        (Friendship.user_id == other_id) & (Friendship.friend_id == user.id),
    )).delete(synchronize_session=False)
    db.commit()


@router.get("")
def list_friends(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(Friendship.status == "accepted", or_(Friendship.user_id == user.id, Friendship.friend_id == user.id)).all()
    result = []
    seen: set[str] = set()
    for relation in rows:
        friend_id = relation.friend_id if relation.user_id == user.id else relation.user_id
        friend = db.query(User).filter(User.id == friend_id, User.is_active.is_(True)).first()
        if friend and str(friend.id) not in seen:
            seen.add(str(friend.id))
            result.append({"id": str(friend.id), "username": friend.username, "is_online": str(friend.id) in manager.online_users, "friendship_id": str(relation.id)})
    return sorted(result, key=lambda item: (not item["is_online"], item["username"].lower()))


@router.get("/pending")
def list_pending(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(Friendship.friend_id == user.id, Friendship.status == "pending").all()
    return [{"id": str(row.id), "username": db.query(User.username).filter(User.id == row.user_id).scalar()} for row in rows]


@router.get("/sent")
def list_sent(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(Friendship.user_id == user.id, Friendship.status == "pending").all()
    return [{"id": str(row.id), "username": db.query(User.username).filter(User.id == row.friend_id).scalar()} for row in rows]


@router.post("/{friend_id}/invite", status_code=201)
def invite_to_room(friend_id: uuid.UUID, payload: RoomInviteRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(Friendship.status == "accepted", or_(
        (Friendship.user_id == user.id) & (Friendship.friend_id == friend_id),
        (Friendship.friend_id == user.id) & (Friendship.user_id == friend_id),
    )).first()
    if not friendship:
        raise HTTPException(403, "Só podes convidar amigos")
    room = manager.get_room(payload.room_id)
    if not room or not any(player.username == user.username for player in room.players.values()):
        raise HTTPException(404, "A tua sala ativa não foi encontrada")
    db.add(Notification(user_id=friend_id, type="room_invite", payload={"room_id": room.id, "username": user.username}))
    db.commit()
    return {"sent": True}


@presence_router.websocket("/ws/presence")
async def presence(websocket: WebSocket, token: str = ""):
    payload = decode_access_token(token) if token else None
    if not payload or "sub" not in payload:
        await websocket.close(code=4401)
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == payload["sub"], User.is_active.is_(True)).first()
        if not user:
            await websocket.close(code=4401)
            return
        user_id = str(user.id)
    finally:
        db.close()
    await websocket.accept()
    manager.online_users.add(user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.online_users.discard(user_id)
