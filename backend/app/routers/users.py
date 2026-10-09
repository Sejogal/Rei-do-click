from fastapi import APIRouter, Depends, HTTPException, Response, status
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.database import get_db
from app.models.match import MatchParticipant
from app.models.match import Match
from app.models.result import Result
from app.models.achievement import Achievement
from app.models.user import User
from app.schemas.user import UserDeleteRequest, UserPublicProfile, UserResponse, UserUpdateRequest
from app.schemas.match import MatchParticipantResponse, MatchResponse
from app.core.achievements import ACHIEVEMENTS

router = APIRouter(prefix="/users", tags=["users"])


def _public_plan(user: User) -> str:
    expires = user.plan_expires_at
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if user.plan in {"pro", "team"} and expires and expires <= datetime.now(timezone.utc):
        return "free"
    return user.plan


def _public_match_response(match: Match) -> MatchResponse:
    participants = sorted(match.participants, key=lambda p: (p.position is None, p.position or 999))
    winner = next((p.username for p in participants if p.position == 1 and p.finished), None)
    return MatchResponse(
        id=match.id, room_id=match.room_id, started_at=match.started_at,
        finished_at=match.finished_at, winner_username=winner, player_count=match.player_count,
        participants=[MatchParticipantResponse(
            id=p.id, username=p.username, position=p.position, wpm=p.wpm, accuracy=p.accuracy,
            finished=p.finished, left_race=p.left_race, elo_delta=p.elo_delta, xp_earned=p.xp_earned,
        ) for p in participants],
    )


@router.get("/by-username/{username}/profile")
def get_public_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.username) == username.lower(), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    best_wpm, avg_wpm, total_races = db.query(
        func.coalesce(func.max(Result.wpm), 0), func.coalesce(func.avg(Result.wpm), 0), func.count(Result.id)
    ).filter(Result.user_id == user.id).one()
    profile = UserPublicProfile(
        id=user.id, username=user.username, elo=user.elo, xp=user.xp, level=user.level,
        matches_played=user.matches_played, matches_won=user.matches_won, plan=_public_plan(user),
        created_at=user.created_at, best_wpm=int(best_wpm), avg_wpm=round(float(avg_wpm), 1),
        total_races=int(total_races),
        win_rate=round(user.matches_won / user.matches_played * 100, 1) if user.matches_played else 0,
    )
    unlocked = {row.code: row.unlocked_at for row in db.query(Achievement).filter(Achievement.user_id == user.id).all()}
    achievements = [{"code": code, "label": label, "description": description, "unlocked_at": unlocked[code]}
                    for code, (label, description) in ACHIEVEMENTS.items() if code in unlocked]
    matches = (db.query(Match).join(MatchParticipant).options(joinedload(Match.participants))
        .filter(MatchParticipant.user_id == user.id).order_by(Match.finished_at.desc()).limit(10).all())
    return {"profile": profile, "achievements": achievements, "matches": [_public_match_response(match) for match in matches]}


@router.get("/by-username/{username}", response_model=UserPublicProfile)
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.username) == username.lower(), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    best_wpm, avg_wpm, total_races = db.query(
        func.coalesce(func.max(Result.wpm), 0), func.coalesce(func.avg(Result.wpm), 0), func.count(Result.id)
    ).filter(Result.user_id == user.id).one()
    return UserPublicProfile(
        id=user.id, username=user.username, elo=user.elo, xp=user.xp, level=user.level,
        matches_played=user.matches_played, matches_won=user.matches_won, plan=_public_plan(user),
        created_at=user.created_at, best_wpm=int(best_wpm), avg_wpm=round(float(avg_wpm), 1),
        total_races=int(total_races),
        win_rate=round(user.matches_won / user.matches_played * 100, 1) if user.matches_played else 0,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email, User.id != current_user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este e-mail já está em uso")
        current_user.email = payload.email

    if payload.username and payload.username != current_user.username:
        if db.query(User).filter(User.username == payload.username, User.id != current_user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este nome de utilizador já está em uso")
        current_user.username = payload.username

    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A palavra-passe atual está incorreta")
        current_user.hashed_password = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    payload: UserDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A palavra-passe está incorreta")
    if current_user.is_admin:
        active_admins = db.query(User).filter(User.is_admin.is_(True), User.is_active.is_(True)).count()
        if active_admins <= 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não podes apagar a última conta admin ativa")
    db.query(MatchParticipant).filter(MatchParticipant.user_id == current_user.id).update(
        {MatchParticipant.username: "Conta apagada"}, synchronize_session=False
    )
    db.delete(current_user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
