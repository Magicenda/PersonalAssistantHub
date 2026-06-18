from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.models import AccountType, TransactionType, CategoryType, BudgetPeriod


class AccountCreate(BaseModel):
    name: str = Field(..., max_length=128)
    type: AccountType = AccountType.CASH
    balance: Decimal = Decimal("0.00")
    currency: str = Field(default="USD", max_length=3)


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    type: Optional[AccountType] = None
    balance: Optional[Decimal] = None
    currency: Optional[str] = Field(None, max_length=3)


class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: AccountType
    balance: Decimal
    currency: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=128)
    type: CategoryType
    icon: Optional[str] = Field(None, max_length=64)
    color: Optional[str] = Field(None, max_length=7)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    type: Optional[CategoryType] = None
    icon: Optional[str] = Field(None, max_length=64)
    color: Optional[str] = Field(None, max_length=7)


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: CategoryType
    icon: Optional[str]
    color: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    amount: Decimal
    description: Optional[str] = Field(None, max_length=256)
    transaction_type: TransactionType
    date: date
    is_recurring: bool = False
    recurring_day: Optional[int] = Field(None, ge=1, le=31)


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = Field(None, max_length=256)
    transaction_type: Optional[TransactionType] = None
    date: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurring_day: Optional[int] = Field(None, ge=1, le=31)


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    account_id: int
    category_id: Optional[int]
    amount: Decimal
    description: Optional[str]
    transaction_type: TransactionType
    date: date
    is_recurring: bool
    recurring_day: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    category_id: int
    limit_amount: Decimal
    period: BudgetPeriod = BudgetPeriod.MONTHLY


class BudgetUpdate(BaseModel):
    limit_amount: Optional[Decimal] = None
    period: Optional[BudgetPeriod] = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    limit_amount: Decimal
    spent_amount: Decimal
    period: BudgetPeriod
    progress: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MonthlySummaryResponse(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    net: Decimal


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: Decimal
    percentage: float


class MonthlyTrendItem(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal


class BalanceHistoryItem(BaseModel):
    date: str
    balance: Decimal


class DashboardResponse(BaseModel):
    total_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_net: Decimal
