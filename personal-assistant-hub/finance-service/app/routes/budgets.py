from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
from datetime import date, timedelta
from app.database import get_db
from app.models import Budget, Transaction, TransactionType, BudgetPeriod
from app.schemas import BudgetCreate, BudgetUpdate, BudgetResponse
from app.auth import get_current_user_id

router = APIRouter(tags=["budgets"])


def _period_start(budget: Budget) -> date:
    today = date.today()
    if budget.period == BudgetPeriod.WEEKLY:
        return today - timedelta(days=today.weekday())
    elif budget.period == BudgetPeriod.YEARLY:
        return today.replace(month=1, day=1)
    else:
        return today.replace(day=1)


async def compute_spent(db: AsyncSession, user_id: int, budget: Budget) -> Decimal:
    start = _period_start(budget)
    result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user_id,
            Transaction.category_id == budget.category_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= start,
        )
    )
    return result.scalar()


def to_response(budget: Budget) -> BudgetResponse:
    progress = float(budget.spent_amount) / float(budget.limit_amount) * 100 if budget.limit_amount else 0
    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        category_id=budget.category_id,
        limit_amount=budget.limit_amount,
        spent_amount=budget.spent_amount,
        period=budget.period,
        progress=round(progress, 2),
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


@router.get("/budgets", response_model=list[BudgetResponse])
async def list_budgets(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Budget).where(Budget.user_id == user_id))
    budgets = result.scalars().all()
    items = []
    for b in budgets:
        b.spent_amount = await compute_spent(db, user_id, b)
        items.append(to_response(b))
    return items


@router.post("/budgets", response_model=BudgetResponse, status_code=201)
async def create_budget(
    data: BudgetCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    budget = Budget(
        user_id=user_id,
        category_id=data.category_id,
        limit_amount=data.limit_amount,
        period=data.period,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    budget.spent_amount = await compute_spent(db, user_id, budget)
    return to_response(budget)


@router.get("/budgets/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    budget.spent_amount = await compute_spent(db, user_id, budget)
    return to_response(budget)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)

    await db.commit()
    await db.refresh(budget)
    budget.spent_amount = await compute_spent(db, user_id, budget)
    return to_response(budget)


@router.delete("/budgets/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    await db.delete(budget)
    await db.commit()
