#!/usr/bin/env python3
"""Seed data script for Personal Assistant Hub."""

import asyncio
import os
import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum as PyEnum

import bcrypt
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum as SAEnum,
    DECIMAL, Boolean, Text, ForeignKey, Date, Float,
)
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://app:app_secret_2024@localhost:5432/personal_assistant_hub",
)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AccountType(str, PyEnum):
    CASH = "Cash"
    BANK = "Bank"
    CARD = "Card"
    SAVINGS = "Savings"


class CategoryType(str, PyEnum):
    INCOME = "Income"
    EXPENSE = "Expense"


class TransactionType(str, PyEnum):
    INCOME = "Income"
    EXPENSE = "Expense"
    TRANSFER = "Transfer"


class TaskStatus(str, PyEnum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class TaskPriority(str, PyEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HabitFrequency(str, PyEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class BudgetPeriod(str, PyEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


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


FOOD_DESCRIPTIONS = [
    "Продукты в Пятёрочке", "Обед в столовой", "Ужин в ресторане",
    "Кофе из кофейни", "Доставка пиццы", "Продукты на неделю в Магните",
    "Суши на ужин", "Завтрак в кафе", "Мексиканская еда на вынос", "Тайская доставка",
    "Бургер и картошка", "Салат на ланч", "Выпечка из пекарни", "Овощи с рынка",
    "Китайская еда на вынос", "Мороженое", "Сэндвич на обед", "Шашлык на выезде",
]

TRANSPORT_DESCRIPTIONS = [
    "Заправка на АЗС", "Поездка на такси", "Проездной на месяц",
    "Оплата автобуса", "Такси из аэропорта", "Парковка",
    "Мойка авто", "Шиномонтаж", "Замена масла", "Билет на поезд",
]

ENTERTAINMENT_DESCRIPTIONS = [
    "Подписка Кинопоиск", "Билеты в кино", "Билеты на концерт",
    "Яндекс Музыка", "Стриминг", "Боулинг",
    "Гольф-клуб", "Попкорн в кинотеатре", "Игры в Steam",
    "Настольные игры в антикафе", "Аркадные автоматы", "Билеты в театр",
]

UTILITIES_DESCRIPTIONS = [
    "Электричество", "Вода", "Интернет",
    "Телефон", "Газ", "Вывоз мусора",
]

SHOPPING_DESCRIPTIONS = [
    "Новые кроссовки", "Одежда в H&M", "Заказ на Ozon",
    "Аксессуары для электроники", "Декор для дома", "Кухонные принадлежности",
    "Канцелярия", "Книги", "Инструменты для сада",
    "Постельное бельё", "Рюкзак", "Зимняя куртка",
]

HEALTH_DESCRIPTIONS = [
    "Аптека - витамины", "Приём у врача", "Стоматология",
    "Абонемент в спортзал", "Проверка зрения", "Лекарства по рецепту",
    "Физиотерапия", "Массаж", "Йога",
]

EDUCATION_DESCRIPTIONS = [
    "Курсы на Stepik", "Книги по программированию", "Курс на Udemy",
    "Приложение для изучения языка", "Участие в воркшопе", "Учебные материалы",
]

SALARY_DESCRIPTION = "Ежемесячная зарплата"
FREELANCE_DESCRIPTIONS = [
    "Веб-разработка", "Дизайн UI/UX", "Консультация",
    "Написание текстов", "Ревью кода", "Технический туториал",
]


def random_amount(min_v: float, max_v: float) -> Decimal:
    return Decimal(str(round(random.uniform(min_v, max_v), 2)))


async def main():
    print("Connecting to database...")
    engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        existing = await session.execute(User.__table__.select().where(User.email == "demo@example.com"))
        if existing.first():
            print("Demo user already exists. Skipping seed.")
            await engine.dispose()
            return

        print("Creating demo user...")
        password_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
        user = User(email="demo@example.com", username="demo", password_hash=password_hash)
        session.add(user)
        await session.flush()
        user_id = user.id
        print(f"  -> User ID: {user_id}")

        print("Creating accounts...")
        cash = Account(user_id=user_id, name="Наличные", type=AccountType.CASH, balance=Decimal("500.00"))
        bank = Account(user_id=user_id, name="Банковский счёт", type=AccountType.BANK, balance=Decimal("5000.00"))
        card = Account(user_id=user_id, name="Кредитная карта", type=AccountType.CARD, balance=Decimal("-200.00"))
        session.add_all([cash, bank, card])
        await session.flush()
        accounts = {"cash": cash.id, "bank": bank.id, "card": card.id}
        print(f"  -> Cash={cash.id}, Bank={bank.id}, CreditCard={card.id}")

        print("Creating categories...")
        cat_salary = Category(user_id=user_id, name="Зарплата", type=CategoryType.INCOME, icon="briefcase", color="#10B981")
        cat_freelance = Category(user_id=user_id, name="Фриланс", type=CategoryType.INCOME, icon="laptop", color="#3B82F6")
        cat_food = Category(user_id=user_id, name="Продукты", type=CategoryType.EXPENSE, icon="shopping-cart", color="#F59E0B")
        cat_transport = Category(user_id=user_id, name="Транспорт", type=CategoryType.EXPENSE, icon="truck", color="#8B5CF6")
        cat_entertainment = Category(user_id=user_id, name="Развлечения", type=CategoryType.EXPENSE, icon="film", color="#EC4899")
        cat_utilities = Category(user_id=user_id, name="Коммунальные", type=CategoryType.EXPENSE, icon="zap", color="#EF4444")
        cat_shopping = Category(user_id=user_id, name="Покупки", type=CategoryType.EXPENSE, icon="shopping-bag", color="#F97316")
        cat_health = Category(user_id=user_id, name="Здоровье", type=CategoryType.EXPENSE, icon="heart", color="#14B8A6")
        cat_education = Category(user_id=user_id, name="Образование", type=CategoryType.EXPENSE, icon="book", color="#6366F1")
        session.add_all([cat_salary, cat_freelance, cat_food, cat_transport, cat_entertainment, cat_utilities, cat_shopping, cat_health, cat_education])
        await session.flush()
        cats = {
            "salary": cat_salary.id, "freelance": cat_freelance.id,
            "food": cat_food.id, "transport": cat_transport.id,
            "entertainment": cat_entertainment.id, "utilities": cat_utilities.id,
            "shopping": cat_shopping.id, "health": cat_health.id,
            "education": cat_education.id,
        }
        print(f"  -> {len(cats)} categories created")

        print("Creating 60+ transactions...")
        today = date.today()
        three_months_ago = today - timedelta(days=90)
        txn_count = 0

        for month_offset in range(3):
            month_date = (today.replace(day=1) - timedelta(days=month_offset * 30)).replace(day=1)
            month_start = month_date
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)

            salary_day = min(month_start.day, 1)
            payday = month_start.replace(day=min(salary_day, 28))
            session.add(Transaction(
                user_id=user_id, account_id=accounts["bank"], category_id=cats["salary"],
                amount=Decimal("3500.00"), description=SALARY_DESCRIPTION,
                transaction_type=TransactionType.INCOME, date=payday,
            ))
            txn_count += 1

            if month_offset > 0:
                freelance_day = min(random.randint(10, 25), 28)
                freq_date = month_start.replace(day=freelance_day)
                session.add(Transaction(
                    user_id=user_id, account_id=accounts["bank"], category_id=cats["freelance"],
                    amount=random_amount(200, 1500), description=random.choice(FREELANCE_DESCRIPTIONS),
                    transaction_type=TransactionType.INCOME, date=freq_date,
                ))
                txn_count += 1

            def random_day_in_month():
                max_d = month_end.day
                return month_start.replace(day=random.randint(1, max_d))

            for _ in range(random.randint(6, 9)):
                txn_date = month_start.replace(day=random.randint(1, month_end.day))
                session.add(Transaction(
                    user_id=user_id, account_id=random.choice([accounts["cash"], accounts["card"]]),
                    category_id=cats["food"], amount=random_amount(15, 80),
                    description=random.choice(FOOD_DESCRIPTIONS),
                    transaction_type=TransactionType.EXPENSE, date=txn_date,
                ))
                txn_count += 1

            for _ in range(random.randint(3, 5)):
                txn_date = month_start.replace(day=random.randint(1, month_end.day))
                session.add(Transaction(
                    user_id=user_id, account_id=accounts["card"],
                    category_id=cats["transport"], amount=random_amount(20, 50),
                    description=random.choice(TRANSPORT_DESCRIPTIONS),
                    transaction_type=TransactionType.EXPENSE, date=txn_date,
                ))
                txn_count += 1

            for _ in range(random.randint(2, 4)):
                txn_date = month_start.replace(day=random.randint(1, month_end.day))
                session.add(Transaction(
                    user_id=user_id, account_id=accounts["card"],
                    category_id=cats["entertainment"], amount=random_amount(30, 150),
                    description=random.choice(ENTERTAINMENT_DESCRIPTIONS),
                    transaction_type=TransactionType.EXPENSE, date=txn_date,
                ))
                txn_count += 1

            txn_date = month_start.replace(day=random.randint(5, 10))
            session.add(Transaction(
                user_id=user_id, account_id=accounts["bank"],
                category_id=cats["utilities"], amount=random_amount(150, 250),
                description=random.choice(UTILITIES_DESCRIPTIONS),
                transaction_type=TransactionType.EXPENSE, date=txn_date,
            ))
            txn_count += 1

            for _ in range(random.randint(1, 3)):
                txn_date = month_start.replace(day=random.randint(1, month_end.day))
                session.add(Transaction(
                    user_id=user_id, account_id=accounts["card"],
                    category_id=cats["shopping"], amount=random_amount(50, 500),
                    description=random.choice(SHOPPING_DESCRIPTIONS),
                    transaction_type=TransactionType.EXPENSE, date=txn_date,
                ))
                txn_count += 1

            for _ in range(random.randint(1, 2)):
                txn_date = month_start.replace(day=random.randint(1, month_end.day))
                session.add(Transaction(
                    user_id=user_id, account_id=accounts["cash"],
                    category_id=cats["health"], amount=random_amount(30, 200),
                    description=random.choice(HEALTH_DESCRIPTIONS),
                    transaction_type=TransactionType.EXPENSE, date=txn_date,
                ))
                txn_count += 1

            txn_date = month_start.replace(day=random.randint(15, 25))
            session.add(Transaction(
                user_id=user_id, account_id=accounts["bank"],
                category_id=cats["education"], amount=random_amount(20, 300),
                description=random.choice(EDUCATION_DESCRIPTIONS),
                transaction_type=TransactionType.EXPENSE, date=txn_date,
            ))
            txn_count += 1

        print(f"  -> {txn_count} transactions created")

        print("Creating budgets...")
        budgets_data = [
            (cats["food"], Decimal("800.00")),
            (cats["transport"], Decimal("200.00")),
            (cats["entertainment"], Decimal("300.00")),
            (cats["utilities"], Decimal("250.00")),
            (cats["shopping"], Decimal("400.00")),
            (cats["health"], Decimal("200.00")),
        ]
        for cat_id, limit in budgets_data:
            session.add(Budget(user_id=user_id, category_id=cat_id, limit_amount=limit, period=BudgetPeriod.MONTHLY))
        await session.flush()
        print(f"  -> {len(budgets_data)} budgets created")

        print("Creating projects...")
        proj_personal = Project(user_id=user_id, name="Личное", description="Личные проекты и задачи")
        proj_work = Project(user_id=user_id, name="Работа", description="Рабочие проекты и задачи")
        proj_health = Project(user_id=user_id, name="Здоровье", description="Цели по здоровью")
        session.add_all([proj_personal, proj_work, proj_health])
        await session.flush()
        projects = {"personal": proj_personal.id, "work": proj_work.id, "health": proj_health.id}
        print(f"  -> 3 projects created")

        print("Creating 20+ tasks...")
        tasks_data = [
            ("Спланировать поездку", TaskPriority.LOW, TaskStatus.TODO, projects["personal"]),
            ("Разобрать шкаф", TaskPriority.MEDIUM, TaskStatus.TODO, projects["personal"]),
            ("Прочитать '7 навыков'", TaskPriority.LOW, TaskStatus.DONE, projects["personal"]),
            ("Починить велосипед", TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, projects["personal"]),
            ("Обновить паспорт", TaskPriority.HIGH, TaskStatus.TODO, projects["personal"]),
            ("Доделать Q2 отчёт", TaskPriority.CRITICAL, TaskStatus.IN_PROGRESS, projects["work"]),
            ("Подготовить слайды", TaskPriority.HIGH, TaskStatus.TODO, projects["work"]),
            ("Написать еженедельный статус", TaskPriority.MEDIUM, TaskStatus.DONE, projects["work"]),
            ("Проверить PR команды", TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, projects["work"]),
            ("Обновить документацию", TaskPriority.LOW, TaskStatus.TODO, projects["work"]),
            ("Назначить совещание", TaskPriority.MEDIUM, TaskStatus.DONE, projects["work"]),
            ("Code review фичи", TaskPriority.HIGH, TaskStatus.TODO, projects["work"]),
            ("Утренняя зарядка", TaskPriority.HIGH, TaskStatus.DONE, projects["health"]),
            ("Записаться к врачу", TaskPriority.HIGH, TaskStatus.TODO, projects["health"]),
            ("Приготовить еду на неделю", TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, projects["health"]),
            ("Купить витамины", TaskPriority.LOW, TaskStatus.DONE, projects["health"]),
            ("Записаться к стоматологу", TaskPriority.MEDIUM, TaskStatus.TODO, projects["health"]),
            ("Обновить LinkedIn", TaskPriority.LOW, TaskStatus.TODO, None),
            ("Позвонить родителям", TaskPriority.MEDIUM, TaskStatus.DONE, None),
            ("Оплатить кредитку", TaskPriority.CRITICAL, TaskStatus.TODO, None),
            ("Бэкап ноутбука", TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, None),
            ("Купить подарок на день рождения", TaskPriority.LOW, TaskStatus.TODO, None),
        ]
        for i, (title, priority, status, project_id) in enumerate(tasks_data):
            deadline_date = today + timedelta(days=random.randint(1, 30)) if status == TaskStatus.TODO else None
            session.add(Task(
                user_id=user_id, project_id=project_id, title=title,
                description=f"Задача: {title}", priority=priority, status=status,
                deadline=deadline_date, order_index=i,
            ))
        await session.flush()
        print(f"  -> {len(tasks_data)} tasks created")

        print("Creating habits...")
        habit_drink = Habit(user_id=user_id, title="Пить воду", description="8 стаканов воды в день", frequency=HabitFrequency.DAILY, color="#3B82F6")
        habit_read = Habit(user_id=user_id, title="Читать 30 мин", description="Читать минимум 30 минут", frequency=HabitFrequency.DAILY, color="#8B5CF6")
        habit_exercise = Habit(user_id=user_id, title="Зарядка", description="Заниматься 20 минут", frequency=HabitFrequency.DAILY, color="#10B981")
        habit_meditate = Habit(user_id=user_id, title="Медитация", description="Медитировать 10 минут", frequency=HabitFrequency.DAILY, color="#F59E0B")
        habit_english = Habit(user_id=user_id, title="Английский", description="Учить английский 15 минут", frequency=HabitFrequency.DAILY, color="#EC4899")
        session.add_all([habit_drink, habit_read, habit_exercise, habit_meditate, habit_english])
        await session.flush()
        habits = {"drink": habit_drink.id, "read": habit_read.id, "exercise": habit_exercise.id, "meditate": habit_meditate.id, "english": habit_english.id}
        print(f"  -> {len(habits)} habits created")

        print("Creating habit logs for past 30 days...")
        log_count = 0
        for habit_name, habit_id in habits.items():
            skip_rate = {"drink": 0.05, "read": 0.2, "exercise": 0.3, "meditate": 0.15, "english": 0.25}
            for day_offset in range(30):
                log_date = today - timedelta(days=day_offset)
                if random.random() > skip_rate.get(habit_name, 0.1):
                    session.add(HabitLog(habit_id=habit_id, user_id=user_id, completed_date=log_date))
                    log_count += 1
        await session.flush()
        print(f"  -> {log_count} habit logs created")

        print("Creating productivity reports...")
        for day_offset in range(5):
            report_date = today - timedelta(days=day_offset * 7)
            tasks_done = random.randint(1, 6)
            total_exp = Decimal(str(round(random.uniform(50, 300), 2)))
            ent_exp = Decimal(str(round(random.uniform(0, 80), 2)))
            score = round(random.uniform(-0.3, 0.5), 2)
            session.add(ProductivityReport(
                user_id=user_id, report_date=report_date,
                tasks_completed=tasks_done, total_expenses=total_exp,
                entertainment_expenses=ent_exp, correlation_score=score,
                insight=f"Completed {tasks_done} tasks with ${total_exp} in expenses.",
            ))
        print(f"  -> 5 productivity reports created")

        print("Creating budget forecasts...")
        for day_offset in range(3):
            forecast_date = today + timedelta(days=7 * day_offset + 1)
            predicted = Decimal(str(round(random.uniform(1500, 2500), 2)))
            limit = Decimal("2200.00")
            risk = "low" if predicted < limit else "medium"
            session.add(BudgetForecast(
                user_id=user_id, forecast_date=forecast_date,
                predicted_expenses=predicted, budget_limit=limit,
                risk_level=risk,
                recommendation=f"Predicted expenses: ${predicted}. Budget limit: ${limit}. Risk: {risk}."
                if risk == "medium" else "On track to stay within budget.",
            ))
        await session.commit()
        print(f"  -> 3 budget forecasts created")

    await engine.dispose()
    print("\n== Seed data created successfully! ==")
    print("  Demo user: demo@example.com / password123")


if __name__ == "__main__":
    asyncio.run(main())
