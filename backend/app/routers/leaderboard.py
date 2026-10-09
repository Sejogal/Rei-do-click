from fastapi import APIRouter, Query
from app.models.user import User
from app.database import SessionLocal

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(limit: int = Query(50, ge=1, le=100)):
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active.is_(True)).order_by(
            User.elo.desc(), User.matches_won.desc(), User.username.asc()).limit(limit).all()
        return [{"rank": index, "username": user.username, "elo": user.elo, "level": user.level,
                 "matches_played": user.matches_played, "matches_won": user.matches_won}
                for index, user in enumerate(users, start=1)]
    finally:
        db.close()
