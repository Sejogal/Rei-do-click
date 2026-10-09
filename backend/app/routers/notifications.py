import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _item(item: Notification):
    return {"id": str(item.id), "type": item.type, "payload": item.payload, "read": item.read, "created_at": item.created_at}


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.read.asc(), Notification.created_at.desc()).limit(100).all()
    return [_item(item) for item in items]


@router.post("/{notification_id}/read")
def mark_read(notification_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not item:
        raise HTTPException(404, "Notificação não encontrada")
    item.read = True; db.commit()
    return _item(item)


@router.post("/read-all", status_code=204)
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read.is_(False)).update({Notification.read: True}, synchronize_session=False)
    db.commit()


@router.delete("/{notification_id}", status_code=204)
def delete_notification(notification_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not item:
        raise HTTPException(404, "Notificação não encontrada")
    db.delete(item); db.commit()
