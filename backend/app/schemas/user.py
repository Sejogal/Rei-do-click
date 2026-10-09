import uuid
from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime
    elo: int
    xp: int
    level: int
    matches_played: int
    matches_won: int
    plan: str = "free"
    plan_started_at: datetime | None = None
    plan_expires_at: datetime | None = None
    plan_cancel_at_period_end: bool = False
    is_admin: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str

    model_config = ConfigDict(from_attributes=True)


class UserPublicProfile(BaseModel):
    id: uuid.UUID
    username: str
    elo: int
    xp: int
    level: int
    matches_played: int
    matches_won: int
    plan: str
    created_at: datetime
    best_wpm: int = 0
    avg_wpm: float = 0
    total_races: int = 0
    win_rate: float = 0

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=50)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_requested_changes(self):
        if all(value is None for value in (self.email, self.username, self.new_password)):
            raise ValueError("Indica pelo menos um dado para atualizar")
        if (self.current_password is None) != (self.new_password is None):
            raise ValueError("Para alterar a palavra-passe, informa a atual e a nova")
        return self


class UserDeleteRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    is_active: bool
    is_admin: bool
    plan: str
    plan_started_at: datetime | None
    plan_expires_at: datetime | None
    plan_cancel_at_period_end: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    is_admin: bool = False


class AdminUserUpdateRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=50)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool | None = None
    is_admin: bool | None = None

    @model_validator(mode="after")
    def require_update(self):
        if all(value is None for value in (self.email, self.username, self.new_password, self.is_active, self.is_admin)):
            raise ValueError("Indica pelo menos um campo para atualizar")
        return self


class AdminSubscriptionActionRequest(BaseModel):
    action: Literal["activate", "renew", "cancel", "resume", "revoke"]
    plan: Literal["pro", "team"] | None = None
