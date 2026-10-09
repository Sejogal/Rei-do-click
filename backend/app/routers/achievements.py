from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.achievements import ACHIEVEMENTS
from app.core.deps import get_current_user
from app.database import get_db
from app.models.achievement import Achievement
from app.models.user import User

router = APIRouter(prefix="/achievements", tags=["achievements"])


def _list(db: Session, user: User):
    rows = {row.code: row.unlocked_at for row in db.query(Achievement).filter(Achievement.user_id == user.id).all()}
    return [{"code": code, "label": label, "description": description,
             "unlocked": code in rows, "unlocked_at": rows.get(code)}
            for code, (label, description) in ACHIEVEMENTS.items()]


@router.get("")
def my_achievements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _list(db, user)


@router.get("/user/{username}")
def public_achievements(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return [item for item in _list(db, user) if item["unlocked"]]
