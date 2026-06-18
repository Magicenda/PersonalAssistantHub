import asyncio
import os
from datetime import date, timedelta

import httpx
import numpy as np
from scipy import stats
from sqlalchemy import select

from app.celery_app import celery_app
from app.database import async_session
from app.models import BudgetForecast, ProductivityReport, RiskLevel

FINANCE_SERVICE_URL = os.getenv("FINANCE_SERVICE_URL", "http://localhost:8003")
TASKS_SERVICE_URL = os.getenv("TASKS_SERVICE_URL", "http://localhost:8004")


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task
def auto_create_task_from_payment(event_data: dict):
    event_type = event_data.get("event_type")
    if event_type != "recurring_payment_created":
        return

    data = event_data.get("data", {})
    description = data.get("description", "")
    recurring_day = data.get("recurring_day", 1)
    user_id = event_data.get("user_id")

    if not description or not user_id:
        return

    due_day = max(recurring_day - 1, 1)
    today = date.today()
    try:
        due_date = date(today.year, today.month, due_day)
        if due_date < today:
            if today.month == 12:
                due_date = date(today.year + 1, 1, due_day)
            else:
                due_date = date(today.year, today.month + 1, due_day)
    except ValueError:
        due_date = today + timedelta(days=1)

    task_data = {
        "title": f"Pay {description}",
        "due_date": due_date.isoformat(),
        "user_id": user_id,
    }

    with httpx.Client() as client:
        try:
            resp = client.post(
                f"{TASKS_SERVICE_URL}/api/tasks",
                json=task_data,
                timeout=10,
            )
            resp.raise_for_status()
        except Exception as e:
            print(f"Failed to create task from payment: {e}")


@celery_app.task
def analyze_productivity():
    run_async(_analyze_productivity_async())


async def _analyze_productivity_async():
    async with httpx.AsyncClient() as client:
        try:
            users_resp = await client.get(
                f"{FINANCE_SERVICE_URL}/api/users",
                timeout=10,
            )
            users = users_resp.json()
        except Exception:
            users = []

    for user in users:
        user_id = user.get("id") if isinstance(user, dict) else user
        await _analyze_user_productivity(user_id)


async def _analyze_user_productivity(user_id: int):
    async with httpx.AsyncClient() as client:
        try:
            tasks_resp = await client.get(
                f"{TASKS_SERVICE_URL}/api/tasks/completed",
                params={"user_id": user_id},
                timeout=10,
            )
            tasks_data = tasks_resp.json()
        except Exception:
            tasks_data = []

        try:
            expenses_resp = await client.get(
                f"{FINANCE_SERVICE_URL}/api/expenses/daily",
                params={"user_id": user_id},
                timeout=10,
            )
            expenses_data = expenses_resp.json()
        except Exception:
            expenses_data = []

    task_counts = {}
    for t in tasks_data:
        d = t.get("date") or t.get("completed_date")
        if d:
            task_counts[d] = task_counts.get(d, 0) + 1

    daily_expenses = {}
    daily_entertainment = {}
    for e in expenses_data:
        d = e.get("date")
        cat = e.get("category", "")
        amount = e.get("amount", 0)
        if d:
            daily_expenses[d] = daily_expenses.get(d, 0) + amount
            if cat.lower() in ("entertainment", "fun", "leisure"):
                daily_entertainment[d] = daily_entertainment.get(d, 0) + amount

    common_dates = sorted(set(task_counts.keys()) & set(daily_expenses.keys()))

    if len(common_dates) < 3:
        correlation_score = 0.0
        insight = "Not enough data for productivity analysis."
    else:
        x = np.array([task_counts[d] for d in common_dates], dtype=float)
        y = np.array([daily_expenses[d] for d in common_dates], dtype=float)

        try:
            r, _ = stats.pearsonr(x, y)
            correlation_score = round(r, 4)
        except Exception:
            correlation_score = 0.0

        median_x = float(np.median(x))
        low_prod_days = [d for d in common_dates if task_counts[d] <= median_x]
        high_prod_days = [d for d in common_dates if d not in low_prod_days]

        if low_prod_days:
            avg_ent_low = np.mean([daily_entertainment.get(d, 0) for d in low_prod_days])
            avg_ent_high = np.mean([daily_entertainment.get(d, 0) for d in high_prod_days]) if high_prod_days else 0
            if avg_ent_high > 0:
                pct_diff = round((avg_ent_low - avg_ent_high) / avg_ent_high * 100, 1)
                if pct_diff > 0:
                    insight = f"On low productivity days, entertainment expenses are {pct_diff}% higher"
                else:
                    insight = f"On low productivity days, entertainment expenses are {abs(pct_diff)}% lower"
            else:
                insight = "Productivity and expenses show a moderate relationship."
        else:
            insight = "No significant correlation between productivity and entertainment expenses detected."

    avg_total = float(np.mean([daily_expenses[d] for d in common_dates])) if common_dates else 0
    avg_ent = float(np.mean([daily_entertainment.get(d, 0) for d in common_dates])) if common_dates else 0

    report = ProductivityReport(
        user_id=user_id,
        report_date=date.today(),
        tasks_completed=sum(task_counts.values()),
        total_expenses=round(avg_total, 2),
        entertainment_expenses=round(avg_ent, 2),
        correlation_score=correlation_score,
        insight=insight,
    )

    async with async_session() as session:
        session.add(report)
        await session.commit()


@celery_app.task
def forecast_budget():
    run_async(_forecast_budget_async())


async def _forecast_budget_async():
    async with httpx.AsyncClient() as client:
        try:
            users_resp = await client.get(
                f"{TASKS_SERVICE_URL}/api/users",
                timeout=10,
            )
            users = users_resp.json()
        except Exception:
            users = []

    for user in users:
        user_id = user.get("id") if isinstance(user, dict) else user
        await _forecast_user_budget(user_id)


async def _forecast_user_budget(user_id: int):
    async with httpx.AsyncClient() as client:
        try:
            upcoming_tasks_resp = await client.get(
                f"{TASKS_SERVICE_URL}/api/tasks/upcoming",
                params={"user_id": user_id},
                timeout=10,
            )
            upcoming_tasks = upcoming_tasks_resp.json()
        except Exception:
            upcoming_tasks = []

        try:
            upcoming_expenses_resp = await client.get(
                f"{FINANCE_SERVICE_URL}/api/expenses/upcoming",
                params={"user_id": user_id},
                timeout=10,
            )
            upcoming_expenses = upcoming_expenses_resp.json()
        except Exception:
            upcoming_expenses = []

        try:
            budget_resp = await client.get(
                f"{FINANCE_SERVICE_URL}/api/budget",
                params={"user_id": user_id},
                timeout=10,
            )
            budget_data = budget_resp.json()
        except Exception:
            budget_data = {}

    predicted = sum(t.get("estimated_cost", 0) for t in upcoming_tasks) + sum(
        e.get("amount", 0) for e in upcoming_expenses
    )

    budget_limit = budget_data.get("monthly_limit", 0)

    if budget_limit > 0:
        ratio = predicted / budget_limit
        if ratio > 0.9:
            risk_level = RiskLevel.HIGH
            recommendation = (
                "Your predicted expenses exceed 90% of your budget limit. "
                "Consider reducing discretionary spending."
            )
        elif ratio > 0.7:
            risk_level = RiskLevel.MEDIUM
            recommendation = (
                "Your predicted expenses are approaching your budget limit. "
                "Monitor your spending closely."
            )
        else:
            risk_level = RiskLevel.LOW
            recommendation = "Your budget looks healthy. Keep up the good financial habits."
    else:
        risk_level = RiskLevel.MEDIUM
        recommendation = "Set a budget limit to enable forecasting and risk assessment."

    forecast = BudgetForecast(
        user_id=user_id,
        forecast_date=date.today(),
        predicted_expenses=round(predicted, 2),
        budget_limit=round(budget_limit, 2),
        risk_level=risk_level,
        recommendation=recommendation,
    )

    async with async_session() as session:
        session.add(forecast)
        await session.commit()
