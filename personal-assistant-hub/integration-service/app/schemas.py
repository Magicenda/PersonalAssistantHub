from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List


class EventPayload(BaseModel):
    event_type: str
    user_id: int
    data: dict = Field(default_factory=dict)


class ProductivityReportOut(BaseModel):
    id: int
    user_id: int
    report_date: date
    tasks_completed: int
    total_expenses: float
    entertainment_expenses: float
    correlation_score: float
    insight: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BudgetForecastOut(BaseModel):
    id: int
    user_id: int
    forecast_date: date
    predicted_expenses: float
    budget_limit: float
    risk_level: str
    recommendation: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CorrelationData(BaseModel):
    dates: List[str]
    tasks_completed: List[int]
    expenses: List[float]
    correlation_score: float


class InsightOut(BaseModel):
    insight: str
