from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.result import Result
from app.models.user import User
from app.schemas.result import ResultCreate, ResultResponse, ResultStats

router = APIRouter(prefix="/results", tags=["results"])


@router.post("", response_model=ResultResponse, status_code=status.HTTP_201_CREATED)
def create_result(
    payload: ResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = Result(user_id=current_user.id, **payload.model_dump())
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.get("", response_model=list[ResultResponse])
def list_results(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Result)
        .filter(Result.user_id == current_user.id)
        .order_by(Result.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.get("/stats", response_model=ResultStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(
            func.count(Result.id).label("count"),
            func.coalesce(func.max(Result.wpm), 0).label("best_wpm"),
            func.coalesce(func.avg(Result.wpm), 0).label("avg_wpm"),
            func.coalesce(func.avg(Result.accuracy), 0).label("avg_accuracy"),
            func.coalesce(func.avg(Result.consistency), 0).label("avg_consistency"),
            func.coalesce(func.sum(Result.time_seconds), 0).label("total_time_seconds"),
        )
        .filter(Result.user_id == current_user.id)
        .one()
    )

    return ResultStats(
        count=row.count,
        best_wpm=int(row.best_wpm),
        avg_wpm=round(float(row.avg_wpm), 1),
        avg_accuracy=round(float(row.avg_accuracy), 1),
        avg_consistency=round(float(row.avg_consistency), 1),
        total_time_seconds=round(float(row.total_time_seconds), 1),
    )