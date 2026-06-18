from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, EmailStr
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum as SAEnum,
    DECIMAL,
    Boolean,
    Text,
    ForeignKey,
    Date,
    Float,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AccountType(str, Enum):
    CASH = "Cash"
    BANK = "Bank"
    CARD = "Card"
    SAVINGS = "Savings"


class CategoryType(str, Enum):
    INCOME = "Income"
    EXPENSE = "Expense"


class TransactionType(str, Enum):
    INCOME = "Income"
    EXPENSE = "Expense"
    TRANSFER = "Transfer"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HabitFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class BudgetPeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class NotificationType(str, Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    PUSH = "push"


class EventType(str, Enum):
    RECURRING_PAYMENT_CREATED = "recurring_payment_created"
    BUDGET_EXCEEDED = "budget_exceeded"
    TASK_OVERDUE = "task_overdue"
    HABIT_STREAK = "habit_streak"
    PRODUCTIVITY_REPORT = "productivity_report"
    BUDGET_FORECAST = "budget_forecast"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(SAEnum(AccountType), nullable=False, default=AccountType.BANK)
    balance = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(String(3), nullable=False, default="USD")


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(SAEnum(CategoryType), nullable=False)
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(DECIMAL(15, 2), nullable=False)
    description = Column(Text, nullable=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    date = Column(Date, nullable=False, server_default=func.current_date())
    is_recurring = Column(Boolean, default=False)
    recurring_day = Column(Integer, nullable=True)


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    limit_amount = Column(DECIMAL(15, 2), nullable=False)
    spent_amount = Column(DECIMAL(15, 2), default=Decimal("0.00"))
    period = Column(SAEnum(BudgetPeriod), nullable=False, default=BudgetPeriod.MONTHLY)


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(SAEnum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM)
    status = Column(SAEnum(TaskStatus), nullable=False, default=TaskStatus.TODO)
    deadline = Column(Date, nullable=True)
    order_index = Column(Integer, default=0)


class Habit(Base, TimestampMixin):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(SAEnum(HabitFrequency), nullable=False, default=HabitFrequency.DAILY)
    streak = Column(Integer, default=0)
    last_completed = Column(Date, nullable=True)
    color = Column(String(7), nullable=True, default="#10B981")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_date = Column(Date, nullable=False)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)


class ProductivityReport(Base, TimestampMixin):
    __tablename__ = "productivity_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_date = Column(Date, nullable=False)
    tasks_completed = Column(Integer, default=0)
    total_expenses = Column(DECIMAL(15, 2), default=Decimal("0.00"))
    entertainment_expenses = Column(DECIMAL(15, 2), default=Decimal("0.00"))
    correlation_score = Column(Float, nullable=True)
    insight = Column(Text, nullable=True)


class BudgetForecast(Base, TimestampMixin):
    __tablename__ = "budget_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False)
    predicted_expenses = Column(DECIMAL(15, 2), default=Decimal("0.00"))
    budget_limit = Column(DECIMAL(15, 2), default=Decimal("0.00"))
    risk_level = Column(String(20), default="low")
    recommendation = Column(Text, nullable=True)
