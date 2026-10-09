import calendar
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.core.security import hash_password
from app.database import get_db
from app.models.match import MatchParticipant
from app.models.user import User
from app.schemas.user import (
    AdminSubscriptionActionRequest,
    AdminUserCreateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
)

router = APIRouter(prefix="/admin", tags=["administração"])


def _next_month(value: datetime) -> datetime:
    month_index = value.month
    year = value.year + (month_index // 12)
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def _expire_if_due(user: User, now: datetime) -> bool:
    normalized_plan = user.plan.strip().lower()
    changed = normalized_plan != user.plan
    if changed:
        user.plan = normalized_plan
    expires_at = user.plan_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if normalized_plan in {"pro", "team"} and expires_at and expires_at <= now:
        user.plan = "free"
        user.plan_started_at = None
        user.plan_expires_at = None
        user.plan_cancel_at_period_end = False
        return True
    return changed


def _active_admin_count(db: Session) -> int:
    return db.query(User).filter(User.is_admin.is_(True), User.is_active.is_(True)).count()


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    now = datetime.now(timezone.utc)
    changed = False
    for user in users:
        changed = _expire_if_due(user, now) or changed
    if changed:
        db.commit()
    return users


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreateRequest,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    email = str(payload.email).strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este e-mail já está em uso")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este nome de utilizador já está em uso")

    user = User(
        email=email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: UUID,
    payload: AdminUserUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")

    would_disable_admin = user.is_admin and user.is_active and (payload.is_active is False or payload.is_admin is False)
    if would_disable_admin:
        if user.id == current_admin.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não podes remover ou desativar a tua própria conta admin")
        if _active_admin_count(db) <= 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não podes remover ou desativar o último admin ativo")

    if payload.email and payload.email != user.email:
        email = str(payload.email).strip().lower()
        if db.query(User).filter(User.email == email, User.id != user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este e-mail já está em uso")
        user.email = email
    if payload.username and payload.username != user.username:
        if db.query(User).filter(User.username == payload.username, User.id != user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este nome de utilizador já está em uso")
        user.username = payload.username
    if payload.new_password:
        user.hashed_password = hash_password(payload.new_password)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/subscription", response_model=AdminUserResponse)
def manage_subscription(
    user_id: UUID,
    payload: AdminSubscriptionActionRequest,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")

    now = datetime.now(timezone.utc)
    _expire_if_due(user, now)

    if payload.action == "activate":
        if user.plan in {"pro", "team"}:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A subscrição já está ativa; usa renovar ou retomar")
        user.plan = payload.plan or "pro"
        user.plan_started_at = now
        user.plan_expires_at = _next_month(now)
        user.plan_cancel_at_period_end = False
    elif payload.action == "renew":
        if user.plan not in {"pro", "team"}:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ativa primeiro uma subscrição Pro")
        expiry = user.plan_expires_at
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        base = expiry if expiry and expiry > now else now
        user.plan_started_at = user.plan_started_at or now
        user.plan_expires_at = _next_month(base)
        user.plan_cancel_at_period_end = False
    elif payload.action == "cancel":
        if user.plan not in {"pro", "team"} or user.plan_expires_at is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não existe uma subscrição ativa para cancelar")
        user.plan_cancel_at_period_end = True
    elif payload.action == "revoke":
        user.plan = "free"
        user.plan_started_at = None
        user.plan_expires_at = None
        user.plan_cancel_at_period_end = False
    else:  # resume
        if user.plan not in {"pro", "team"} or user.plan_expires_at is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não existe uma subscrição para retomar")
        user.plan_cancel_at_period_end = False

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não podes apagar a tua própria conta admin")
    if user.is_admin and user.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não podes apagar o último admin ativo")

    db.query(MatchParticipant).filter(MatchParticipant.user_id == user.id).update(
        {MatchParticipant.username: "Conta apagada"}, synchronize_session=False
    )
    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
