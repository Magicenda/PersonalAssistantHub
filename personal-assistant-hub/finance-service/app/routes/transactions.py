from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models import Transaction, Account, Category, TransactionType
from app.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from app.cache import cache_invalidate
from app.auth import get_current_user_id

router = APIRouter(tags=["transactions"])


async def _enrich_transaction(db: AsyncSession, txn: Transaction):
    """Populate category_name, category_color, account_name on a Transaction ORM object."""
    if txn.category_id:
        cat = await db.get(Category, txn.category_id)
        if cat:
            txn.category_name = cat.name
            txn.category_color = cat.color
    if txn.account_id:
        acc = await db.get(Account, txn.account_id)
        if acc:
            txn.account_name = acc.name
    return txn


async def apply_balance_change(
    db: AsyncSession,
    account_id: int,
    user_id: int,
    amount: Decimal,
    txn_type: TransactionType,
    reverse: bool = False,
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if reverse:
        if txn_type == TransactionType.INCOME:
            account.balance -= amount
        elif txn_type == TransactionType.EXPENSE:
            account.balance += amount
    else:
        if txn_type == TransactionType.INCOME:
            account.balance += amount
        elif txn_type == TransactionType.EXPENSE:
            account.balance -= amount

    await db.flush()


@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    transaction_type: Optional[TransactionType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    filters = [Transaction.user_id == user_id]
    if category_id is not None:
        filters.append(Transaction.category_id == category_id)
    if transaction_type is not None:
        filters.append(Transaction.transaction_type == transaction_type)
    if date_from is not None:
        filters.append(Transaction.date >= date_from)
    if date_to is not None:
        filters.append(Transaction.date <= date_to)

    query = (
        select(Transaction)
        .where(and_(*filters))
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(query)
    transactions = result.scalars().all()
    for txn in transactions:
        await _enrich_transaction(db, txn)
    return transactions


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    txn = Transaction(
        user_id=user_id,
        account_id=data.account_id,
        category_id=data.category_id,
        amount=data.amount,
        description=data.description,
        transaction_type=data.transaction_type,
        date=data.transaction_date,
        is_recurring=data.is_recurring,
        recurring_day=data.recurring_day,
    )

    await apply_balance_change(db, data.account_id, user_id, data.amount, data.transaction_type)

    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    await cache_invalidate(f"accounts:{user_id}")
    await _enrich_transaction(db, txn)
    return txn


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await _enrich_transaction(db, txn)
    return txn


@router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse old balance effect
    await apply_balance_change(db, txn.account_id, user_id, txn.amount, txn.transaction_type, reverse=True)

    update_data = data.model_dump(exclude_unset=True, by_alias=True)
    for field, value in update_data.items():
        setattr(txn, field, value)

    # Apply new balance effect
    if data.amount is not None or data.transaction_type is not None:
        await apply_balance_change(db, txn.account_id, user_id, txn.amount, txn.transaction_type)

    await db.commit()
    await db.refresh(txn)
    await cache_invalidate(f"accounts:{user_id}")
    await _enrich_transaction(db, txn)
    return txn


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse balance effect on delete
    await apply_balance_change(db, txn.account_id, user_id, txn.amount, txn.transaction_type, reverse=True)

    await db.delete(txn)
    await db.commit()
    await cache_invalidate(f"accounts:{user_id}")
