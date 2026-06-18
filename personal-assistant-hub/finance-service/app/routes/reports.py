from fastapi import APIRouter, Depends
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models import Transaction, TransactionType, Account, Category
from app.schemas import (
    MonthlySummaryResponse,
    CategoryBreakdownItem,
    MonthlyTrendItem,
    BalanceHistoryItem,
    DashboardResponse,
)
from app.cache import cache_get, cache_set
from app.auth import get_current_user_id

router = APIRouter(tags=["reports"])


@router.get("/reports/monthly-summary", response_model=list[MonthlySummaryResponse])
async def monthly_summary(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    months: int = 6,
):
    cache_key = f"report:monthly_summary:{user_id}:{months}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    today = date.today()
    start = today.replace(day=1)
    for _ in range(months - 1):
        start = (start.replace(day=1) - timedelta(days=1)).replace(day=1)

    result = await db.execute(
        select(
            sa_func.to_char(Transaction.date, "YYYY-MM").label("month"),
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.INCOME), 0
            ).label("income"),
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.EXPENSE), 0
            ).label("expenses"),
        )
        .where(Transaction.user_id == user_id, Transaction.date >= start)
        .group_by(sa_func.to_char(Transaction.date, "YYYY-MM"))
        .order_by(sa_func.to_char(Transaction.date, "YYYY-MM"))
    )
    rows = result.all()
    data = [
        MonthlySummaryResponse(month=r.month, income=r.income, expenses=r.expenses, net=r.income - r.expenses)
        for r in rows
    ]
    await cache_set(cache_key, [d.model_dump() for d in data])
    return data


@router.get("/reports/category-breakdown", response_model=list[CategoryBreakdownItem])
async def category_breakdown(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    year: Optional[int] = None,
    month: Optional[int] = None,
):
    today = date.today()
    y = year or today.year
    m = month or today.month

    cache_key = f"report:category_breakdown:{user_id}:{y}:{m}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await db.execute(
        select(
            Transaction.category_id,
            sa_func.coalesce(sa_func.sum(Transaction.amount), 0).label("amount"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            sa_func.extract("year", Transaction.date) == y,
            sa_func.extract("month", Transaction.date) == m,
        )
        .group_by(Transaction.category_id)
    )
    rows = result.all()
    total = sum(r.amount for r in rows) or Decimal("1")

    data = []
    for r in rows:
        cat_result = await db.execute(select(Category).where(Category.id == r.category_id))
        cat = cat_result.scalar_one_or_none()
        cat_name = cat.name if cat else "Unknown"
        data.append(
            CategoryBreakdownItem(
                category=cat_name,
                amount=r.amount,
                percentage=float(r.amount) / float(total) * 100,
            )
        )
    await cache_set(cache_key, [d.model_dump() for d in data])
    return data


@router.get("/reports/monthly-trends", response_model=list[MonthlyTrendItem])
async def monthly_trends(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    months: int = 12,
):
    cache_key = f"report:monthly_trends:{user_id}:{months}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    today = date.today()
    start = today.replace(day=1)
    for _ in range(months - 1):
        start = (start.replace(day=1) - timedelta(days=1)).replace(day=1)

    result = await db.execute(
        select(
            sa_func.to_char(Transaction.date, "YYYY-MM").label("month"),
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.INCOME), 0
            ).label("income"),
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.EXPENSE), 0
            ).label("expenses"),
        )
        .where(Transaction.user_id == user_id, Transaction.date >= start)
        .group_by(sa_func.to_char(Transaction.date, "YYYY-MM"))
        .order_by(sa_func.to_char(Transaction.date, "YYYY-MM"))
    )
    rows = result.all()
    data = [MonthlyTrendItem(month=r.month, income=r.income, expenses=r.expenses) for r in rows]
    await cache_set(cache_key, [d.model_dump() for d in data])
    return data


@router.get("/reports/balance-history", response_model=list[BalanceHistoryItem])
async def balance_history(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    days: int = 30,
):
    cache_key = f"report:balance_history:{user_id}:{days}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    today = date.today()
    start = today - timedelta(days=days)

    result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = result.scalars().all()
    current_balance = sum(a.balance for a in accounts) if accounts else Decimal("0")

    txn_result = await db.execute(
        select(
            Transaction.date,
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.INCOME), 0
            ).label("income"),
            sa_func.coalesce(
                sa_func.sum(Transaction.amount).filter(Transaction.transaction_type == TransactionType.EXPENSE), 0
            ).label("expense"),
        )
        .where(Transaction.user_id == user_id, Transaction.date >= start)
        .group_by(Transaction.date)
        .order_by(Transaction.date)
    )
    txn_rows = txn_result.all()

    daily_net = {}
    for r in txn_rows:
        daily_net[str(r.date)] = (r.income or 0) - (r.expense or 0)

    cursor = today
    data = []
    balance = current_balance
    while cursor >= start:
        data.append(BalanceHistoryItem(date=str(cursor), balance=balance))
        net = daily_net.get(str(cursor), Decimal("0"))
        balance -= net
        cursor -= timedelta(days=1)

    data.reverse()
    await cache_set(cache_key, [d.model_dump() for d in data])
    return data


@router.get("/reports/dashboard", response_model=DashboardResponse)
async def dashboard(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"report:dashboard:{user_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    today = date.today()
    month_start = today.replace(day=1)

    result = await db.execute(select(Account).where(Account.user_id == user_id))
    accounts = result.scalars().all()
    total_balance = sum(a.balance for a in accounts) if accounts else Decimal("0")

    income_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.date >= month_start,
        )
    )
    monthly_income = income_result.scalar()

    expense_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= month_start,
        )
    )
    monthly_expenses = expense_result.scalar()

    data = DashboardResponse(
        total_balance=total_balance,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        monthly_net=monthly_income - monthly_expenses,
    )
    await cache_set(cache_key, data.model_dump())
    return data
