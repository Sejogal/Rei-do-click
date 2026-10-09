import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.tournament import Tournament, TournamentMatch, TournamentParticipant
from app.models.user import User
from app.models.notification import Notification
from app.multiplayer.manager import manager

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


class TournamentCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    max_players: int = Field(ge=8, le=16)


def _participant(db: Session, row: TournamentParticipant):
    user = db.query(User).filter(User.id == row.user_id).first()
    return {"id": str(row.id), "user_id": str(row.user_id), "username": user.username if user else "Conta removida", "seed": row.seed, "eliminated_round": row.eliminated_round}


def _match(db: Session, row: TournamentMatch):
    def username(user_id):
        user = db.query(User).filter(User.id == user_id).first() if user_id else None
        return user.username if user else None
    return {"id": str(row.id), "round": row.round_number, "match_index": row.match_index,
            "player1_id": str(row.player1_id) if row.player1_id else None, "player1": username(row.player1_id),
            "player2_id": str(row.player2_id) if row.player2_id else None, "player2": username(row.player2_id),
            "winner_id": str(row.winner_id) if row.winner_id else None, "winner": username(row.winner_id),
            "room_id": row.room_id, "status": row.status}


def advance_match_sync(room_id: str, winner_username: str) -> dict | None:
    """Persiste o resultado do match e prepara a sala da ronda seguinte, se completa."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        match = db.query(TournamentMatch).filter_by(room_id=room_id, status="in_progress").first()
        if not match:
            return None
        winner = db.query(User).filter_by(username=winner_username).first()
        if not winner or winner.id not in (match.player1_id, match.player2_id):
            return None
        match.winner_id = winner.id
        match.status = "finished"
        tournament = db.query(Tournament).filter_by(id=match.tournament_id).first()
        if not tournament:
            db.commit(); return None
        loser_id = match.player2_id if winner.id == match.player1_id else match.player1_id
        participant = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id, user_id=loser_id).first()
        if participant:
            participant.eliminated_round = match.round_number
        last_round = tournament.max_players.bit_length() - 1
        if match.round_number >= last_round:
            tournament.status = "finished"
            tournament.finished_at = datetime.now(timezone.utc)
            db.commit()
            return {"finished": True, "tournament_id": str(tournament.id), "winner": winner.username}
        following = db.query(TournamentMatch).filter_by(tournament_id=tournament.id, round_number=match.round_number + 1, match_index=match.match_index // 2).first()
        if not following:
            db.commit(); return None
        if match.match_index % 2 == 0:
            following.player1_id = winner.id
        else:
            following.player2_id = winner.id
        created_room = None
        if following.player1_id and following.player2_id and not following.room_id:
            created_room = uuid.uuid4().hex[:6].upper()
            following.room_id = created_room
            following.status = "in_progress"
            for player_id in (following.player1_id, following.player2_id):
                db.add(Notification(user_id=player_id, type="tournament_match", payload={"tournament_id": str(tournament.id), "room_id": created_room, "name": tournament.name}))
        db.commit()
        return {"finished": False, "tournament_id": str(tournament.id), "room_id": created_room,
                "player1_id": str(following.player1_id), "player2_id": str(following.player2_id)}
    finally:
        db.close()


def is_allowed_tournament_player(room_id: str, user_id: str | None, username: str) -> bool | None:
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        match = db.query(TournamentMatch).filter_by(room_id=room_id, status="in_progress").first()
        if not match:
            return None
        user = db.query(User).filter_by(id=user_id, username=username).first() if user_id else None
        return bool(user and user.id in (match.player1_id, match.player2_id))
    finally:
        db.close()


@router.post("", status_code=201)
def create_tournament(payload: TournamentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.plan.strip().lower() not in {"pro", "team"}:
        raise HTTPException(403, "Criar torneios de 8 ou 16 jogadores requer plano Pro")
    if payload.max_players not in (8, 16):
        raise HTTPException(422, "O torneio deve ter 8 ou 16 participantes")
    tournament = Tournament(name=payload.name.strip(), host_id=user.id, max_players=payload.max_players, status="registration")
    db.add(tournament); db.flush()
    db.add(TournamentParticipant(tournament_id=tournament.id, user_id=user.id, seed=1))
    db.commit(); db.refresh(tournament)
    return {"id": str(tournament.id), "name": tournament.name, "host_id": str(tournament.host_id), "max_players": tournament.max_players, "status": tournament.status, "created_at": tournament.created_at}


@router.post("/{tournament_id}/join", status_code=201)
def join_tournament(tournament_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).with_for_update().first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    if tournament.status != "registration": raise HTTPException(409, "As inscrições estão encerradas")
    existing = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id, user_id=user.id).first()
    if existing: raise HTTPException(409, "Já estás inscrito")
    count = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id).count()
    if count >= tournament.max_players: raise HTTPException(409, "Torneio cheio")
    row = TournamentParticipant(tournament_id=tournament.id, user_id=user.id, seed=count + 1)
    db.add(row); db.commit()
    return {"joined": True, "seed": row.seed}


@router.delete("/{tournament_id}/participants/{participant_user_id}", status_code=204)
def remove_tournament_participant(tournament_id: uuid.UUID, participant_user_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter_by(id=tournament_id).with_for_update().first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    if tournament.host_id != user.id: raise HTTPException(403, "Só o organizador pode gerir participantes")
    if tournament.status != "registration": raise HTTPException(409, "Os participantes só podem ser removidos antes do início")
    if participant_user_id == tournament.host_id: raise HTTPException(409, "O organizador não pode remover-se do torneio")
    participant = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id, user_id=participant_user_id).first()
    if not participant: raise HTTPException(404, "Participante não encontrado")
    db.delete(participant)
    db.flush()
    remaining = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id).order_by(TournamentParticipant.seed).all()
    for seed, row in enumerate(remaining, start=1): row.seed = seed
    db.commit()


@router.delete("/{tournament_id}", status_code=204)
def cancel_tournament(tournament_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter_by(id=tournament_id).with_for_update().first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    if tournament.host_id != user.id: raise HTTPException(403, "Só o organizador pode cancelar o torneio")
    if tournament.status != "registration": raise HTTPException(409, "Só é possível cancelar antes do início")
    db.delete(tournament)
    db.commit()


@router.post("/{tournament_id}/start")
def start_tournament(tournament_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter_by(id=tournament_id).with_for_update().first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    if tournament.host_id != user.id: raise HTTPException(403, "Só o organizador pode iniciar")
    participants = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id).order_by(TournamentParticipant.seed).all()
    if tournament.status != "registration" or len(participants) != tournament.max_players:
        raise HTTPException(409, "O bracket deve estar completo antes de iniciar")
    first_round_rooms = []
    for index in range(tournament.max_players // 2):
        room_id = uuid.uuid4().hex[:6].upper()
        first_round_rooms.append(room_id)
        db.add(TournamentMatch(tournament_id=tournament.id, round_number=1, match_index=index,
            player1_id=participants[index * 2].user_id, player2_id=participants[index * 2 + 1].user_id,
            room_id=room_id, status="in_progress"))
        for player_id in (participants[index * 2].user_id, participants[index * 2 + 1].user_id):
            db.add(Notification(user_id=player_id, type="tournament_match", payload={"tournament_id": str(tournament.id), "room_id": room_id, "name": tournament.name}))
    rounds = tournament.max_players.bit_length() - 1
    for round_no in range(2, rounds + 1):
        for index in range(tournament.max_players // (2 ** round_no)):
            db.add(TournamentMatch(tournament_id=tournament.id, round_number=round_no, match_index=index, status="pending"))
    tournament.status = "in_progress"; tournament.started_at = datetime.now(timezone.utc)
    db.commit()
    for room_id in first_round_rooms:
        manager.create_room(host_id="", room_id=room_id, is_private=True, max_players=2)
    return {"status": tournament.status}


@router.get("")
def list_tournaments(db: Session = Depends(get_db)):
    rows = db.query(Tournament).order_by(Tournament.created_at.desc()).limit(100).all()
    return [{"id": str(t.id), "name": t.name, "host_id": str(t.host_id), "max_players": t.max_players, "status": t.status,
             "participants_count": db.query(TournamentParticipant).filter_by(tournament_id=t.id).count(), "created_at": t.created_at} for t in rows]


@router.get("/{tournament_id}/matches")
def list_tournament_matches(tournament_id: uuid.UUID, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter_by(id=tournament_id).first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    rows = db.query(TournamentMatch).filter_by(tournament_id=tournament.id).order_by(TournamentMatch.round_number, TournamentMatch.match_index).all()
    return [_match(db, row) for row in rows]


@router.get("/{tournament_id}")
def tournament_detail(tournament_id: uuid.UUID, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter_by(id=tournament_id).first()
    if not tournament: raise HTTPException(404, "Torneio não encontrado")
    participants = db.query(TournamentParticipant).filter_by(tournament_id=tournament.id).order_by(TournamentParticipant.seed).all()
    matches = db.query(TournamentMatch).filter_by(tournament_id=tournament.id).order_by(TournamentMatch.round_number, TournamentMatch.match_index).all()
    return {"id": str(tournament.id), "name": tournament.name, "host_id": str(tournament.host_id), "max_players": tournament.max_players,
            "status": tournament.status, "created_at": tournament.created_at, "started_at": tournament.started_at,
            "finished_at": tournament.finished_at, "participants": [_participant(db, row) for row in participants],
            "matches": [_match(db, row) for row in matches]}
