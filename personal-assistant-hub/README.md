# Personal Assistant Hub

Интеллектуальная система управления финансами и временем. Кроссплатформенное десктопное приложение, объединяющее учет финансов, планирование задач, управление привычками и аналитику продуктивности.

## Архитектура

```
                         ┌──────────────┐
                         │   Frontend   │
                         │  Electron +  │
                         │  React + MUI │
                         └──────┬───────┘
                                │ HTTP/WS
                         ┌──────▼───────┐
                         │  API Gateway │
                         │   (port 8000)│
                         └──┬───┬───┬───┘
                            │   │   │
              ┌─────────────┘   │   └─────────────┐
              ▼                 ▼                 ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │ Auth       │   │ Finance    │   │ Tasks      │
     │ Service    │   │ Service    │   │ Service    │
     │ :8001      │   │ :8002      │   │ :8003      │
     └────────────┘   └────────────┘   └────────────┘
              │              │                 │
              ▼              ▼                 ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │Notification│   │Integration │   │  Celery    │
     │ Service    │◄──│ Service    │──►│ Workers    │
     │ :8004      │   │ :8005      │   │            │
     └────────────┘   └────────────┘   └────────────┘

              ┌────────────┐   ┌────────────┐
              │ PostgreSQL │   │   Redis    │
              │  (primary) │   │  (cache +  │
              │            │   │   broker)  │
              └────────────┘   └────────────┘
```

### Сервисы

| Сервис | Порт | Назначение |
|--------|------|------------|
| API Gateway | 8000 | Единая точка входа, JWT, rate limiting |
| Auth Service | 8001 | Регистрация, авторизация, JWT-токены |
| Finance Service | 8002 | Учет финансов, транзакции, бюджеты, отчеты |
| Tasks Service | 8003 | Задачи, проекты, привычки, Kanban |
| Notification Service | 8004 | Email/Telegram/Push уведомления (Celery) |
| Integration Service | 8005 | Связь финансов и задач, аналитика, прогнозы |
| Frontend | 3000/5173 | Electron + React десктопное приложение |

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+ (для разработки фронтенда)
- Python 3.12+ (для разработки бэкенда)

### Запуск через Docker Compose (рекомендуется)

```bash
# Клонировать проект
cd personal-assistant-hub

# Скопировать .env
cp .env.example .env

# Запустить все сервисы
docker-compose up -d

# Проверить статус
docker-compose ps
```

### Инициализация базы данных

```bash
# Заполнить демо-данными
docker-compose exec integration-service python scripts/seed_data.py
```

### Доступ к сервисам

| Сервис | URL |
|--------|-----|
| Frontend (Electron) | http://localhost:5173 |
| API Gateway Swagger | http://localhost:8000/docs |
| Auth Service Swagger | http://localhost:8001/docs |
| Finance Service Swagger | http://localhost:8002/docs |
| Tasks Service Swagger | http://localhost:8003/docs |
| Notification Service Swagger | http://localhost:8004/docs |
| Integration Service Swagger | http://localhost:8005/docs |

### Демо-пользователь

После запуска seed-данных:
- Email: `demo@example.com`
- Password: `password123`

## Разработка

### Запуск бэкенда локально

```bash
# Каждый сервис запускается отдельно
cd auth-service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Запуск фронтенда локально

```bash
cd frontend
npm install
npm run dev          # Vite dev server
npm run electron:dev # Electron + Vite
```

## Тестирование

```bash
# Установить зависимости
pip install -r tests/requirements-test.txt

# Запустить тесты
pytest tests/ -v

# С coverage
pytest tests/ --cov=. --cov-report=term-missing
```

## Ключевые особенности

### Интеллектуальная интеграция

- **Автоматические задачи**: создание регулярного платежа автоматически создает задачу на оплату
- **Анализ продуктивности**: ежедневный расчет корреляции между выполненными задачами и расходами
- **Прогнозирование бюджета**: предсказание превышения бюджета на основе запланированных событий

### Финансы

- Мультивалютные счета (Cash, Bank, Card, Savings)
- Категории доходов и расходов
- Бюджеты с прогресс-барами
- Интерактивные графики (Pie, Bar, Line)

### Задачи

- Kanban-доска с drag-and-drop
- Приоритеты (LOW, MEDIUM, HIGH, CRITICAL)
- Фильтры и поиск
- Привычки с отслеживанием streak

### UI/UX

- Современный SaaS-дизайн (темная тема)
- Плавные анимации (Framer Motion)
- Material UI компоненты
- Desktop-приложение на Electron

## License

MIT
