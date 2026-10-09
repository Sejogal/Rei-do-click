import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.match import Match, MatchParticipant
from app.models.user import User
from app.schemas.match import MatchParticipantResponse, MatchResponse

router = APIRouter(prefix="/matches", tags=["matches"])


def _response(match: Match) -> MatchResponse:
    parts = sorted(match.participants, key=lambda p: (p.position is None, p.position or 999))
    winner = next((p.username for p in parts if p.position == 1 and p.finished), None)
    return MatchResponse(id=match.id, room_id=match.room_id, started_at=match.started_at,
        finished_at=match.finished_at, winner_username=winner, player_count=match.player_count,
        participants=[MatchParticipantResponse(id=p.id, username=p.username, position=p.position,
            wpm=p.wpm, accuracy=p.accuracy, finished=p.finished, left_race=p.left_race,
            elo_delta=p.elo_delta, xp_earned=p.xp_earned) for p in parts])


@router.get("")
def list_matches(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), username: str | None = Query(None, min_length=1, max_length=50),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Match).join(MatchParticipant).options(joinedload(Match.participants))
    query = query.filter(func.lower(MatchParticipant.username) == username.lower()) if username else query.filter(MatchParticipant.user_id == user.id)
    matches = query.order_by(Match.finished_at.desc()).offset(offset).limit(limit).all()
    return [_response(match) for match in matches]


@router.get("/{match_id}")
def get_match(match_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = (db.query(Match).join(MatchParticipant).options(joinedload(Match.participants))
        .filter(Match.id == match_id, MatchParticipant.user_id == user.id).first())
    if not match:
        raise HTTPException(status_code=404, detail="Match não encontrado")
    return _response(match)
