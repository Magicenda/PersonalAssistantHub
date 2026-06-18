import datetime
import enum
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Enum as SAEnum
from app.database import Base


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ProductivityReport(Base):
    __tablename__ = "productivity_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    report_date = Column(Date, nullable=False)
    tasks_completed = Column(Integer, default=0)
    total_expenses = Column(Float, default=0.0)
    entertainment_expenses = Column(Float, default=0.0)
    correlation_score = Column(Float, default=0.0)
    insight = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class BudgetForecast(Base):
    __tablename__ = "budget_forecasts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    forecast_date = Column(Date, nullable=False)
    predicted_expenses = Column(Float, default=0.0)
    budget_limit = Column(Float, default=0.0)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.MEDIUM)
    recommendation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
