from datetime import datetime
from pydantic import BaseModel


class AchievementResponse(BaseModel):
    code: str
    label: str
    description: str
    unlocked_at: datetime


class AchievementInfo(BaseModel):
    code: str
    label: str
    description: str
    unlocked: bool
    unlocked_at: datetime | None
