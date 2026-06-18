import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import get_current_user_id
from app.models import Habit, HabitLog
from app.schemas import HabitCreate, HabitUpdate, HabitResponse, HabitLogResponse, CalendarDay

router = APIRouter(prefix="/api/habits", tags=["habits"])


@router.get("", response_model=list[HabitResponse])
async def list_habits(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.user_id == user_id).order_by(Habit.created_at))
    return result.scalars().all()


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
    body: HabitCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    habit = Habit(
        user_id=user_id,
        title=body.title,
        description=body.description,
        frequency=body.frequency.upper() if body.frequency else "DAILY",
        color=body.color,
    )
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    return habit


@router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
    habit_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return habit


@router.patch("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: int,
    body: HabitUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    update_data = body.model_dump(exclude_unset=True)
    if "frequency" in update_data and update_data["frequency"]:
        update_data["frequency"] = update_data["frequency"].upper()
    for key, value in update_data.items():
        setattr(habit, key, value)
    await db.commit()
    await db.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    await db.delete(habit)
    await db.commit()


@router.post("/{habit_id}/log", response_model=HabitLogResponse, status_code=status.HTTP_201_CREATED)
async def log_habit(
    habit_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    today = datetime.date.today()
    existing = await db.execute(
        select(HabitLog).where(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == user_id,
            HabitLog.completed_date == today,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Habit already logged today")

    now = datetime.datetime.now(datetime.timezone.utc)
    log = HabitLog(habit_id=habit_id, user_id=user_id, completed_date=today)
    db.add(log)

    prev_completed = habit.last_completed

    if habit.frequency == "daily":
        if prev_completed and (now - prev_completed).days <= 1:
            habit.streak += 1
        else:
            habit.streak = 1
    elif habit.frequency == "weekly":
        habit.streak += 1
    elif habit.frequency == "monthly":
        habit.streak += 1

    habit.last_completed = now

    await db.commit()
    await db.refresh(log)
    return log


@router.get("/{habit_id}/calendar")
async def get_habit_calendar(
    habit_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id))
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    today = datetime.date.today()
    first_day = today.replace(day=1)
    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - datetime.timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - datetime.timedelta(days=1)

    logs_result = await db.execute(
        select(HabitLog.completed_date).where(
            HabitLog.habit_id == habit_id,
            HabitLog.user_id == user_id,
            HabitLog.completed_date >= first_day,
            HabitLog.completed_date <= last_day,
        )
    )
    completed_dates = {row[0] for row in logs_result.fetchall()}

    days = []
    current = first_day
    while current <= last_day:
        days.append(CalendarDay(date=current.isoformat(), completed=current in completed_dates))
        current += datetime.timedelta(days=1)

    return {"habit_id": habit_id, "year": today.year, "month": today.month, "days": days}
