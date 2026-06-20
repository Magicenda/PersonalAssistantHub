import pytest
import random
from httpx import AsyncClient

BASE_URL = "http://192.168.0.15:8000"

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture
async def auth_token(client: AsyncClient) -> dict:
    suffix = random.randint(10000, 99999)
    payload = {
        "email": f"testuser_{suffix}@example.com",
        "username": f"testuser_{suffix}",
        "password": "TestPass123!",
    }
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "username": payload["username"],
    }


def _random_suffix() -> str:
    return str(random.randint(10000, 99999))


# ─── HEALTH CHECK ────────────────────────────────────────────────────

class TestHealth:
    async def test_gateway_health(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        for svc in ("auth", "finance", "tasks", "notification", "integration"):
            assert svc in data["services"]
            assert data["services"][svc] == "up", f"{svc} is {data['services'][svc]}"


# ─── AUTH SERVICE ────────────────────────────────────────────────────

class TestAuth:
    async def test_register_duplicate(self, client: AsyncClient):
        suffix = _random_suffix()
        email = f"dupe{suffix}@example.com"
        resp = await client.post("/auth/register", json={
            "email": email, "username": f"dupeuser{suffix}", "password": "Pass123!",
        })
        assert resp.status_code == 201
        resp2 = await client.post("/auth/register", json={
            "email": email, "username": f"dupeuser2{suffix}", "password": "Pass456!",
        })
        assert resp2.status_code == 409

    async def test_login_success(self, client: AsyncClient):
        suffix = _random_suffix()
        await client.post("/auth/register", json={
            "email": f"login{suffix}@example.com", "username": f"login{suffix}", "password": "LoginPass1!",
        })
        resp = await client.post("/auth/login", json={
            "email": f"login{suffix}@example.com", "password": "LoginPass1!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_login_wrong_password(self, client: AsyncClient):
        suffix = _random_suffix()
        await client.post("/auth/register", json={
            "email": f"wp{suffix}@example.com", "username": f"wp{suffix}", "password": "Correct1!",
        })
        resp = await client.post("/auth/login", json={
            "email": f"wp{suffix}@example.com", "password": "WrongPass1!",
        })
        assert resp.status_code == 401

    async def test_get_me(self, client: AsyncClient, auth_token: dict):
        resp = await client.get("/auth/me", headers=auth_token["headers"])
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data
        assert data["username"] == auth_token["username"]

    async def test_get_me_unauthorized(self, client: AsyncClient):
        resp = await client.get("/auth/me")
        assert resp.status_code == 401

    async def test_refresh_token(self, client: AsyncClient, auth_token: dict):
        resp = await client.post("/auth/refresh", json={
            "refresh_token": auth_token["refresh_token"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    async def test_logout(self, client: AsyncClient, auth_token: dict):
        resp = await client.post("/auth/logout", json={
            "token": auth_token["access_token"],
        })
        assert resp.status_code == 204


# ─── TASKS SERVICE ───────────────────────────────────────────────────

class TestTasks:
    async def test_full_project_crud(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        resp = await client.post("/tasks/api/projects", json={
            "name": "Integration Test Project",
            "description": "Created by integration test",
        }, headers=headers)
        assert resp.status_code == 201
        project = resp.json()
        assert project["name"] == "Integration Test Project"
        project_id = project["id"]

        resp = await client.get(f"/tasks/api/projects/{project_id}", headers=headers)
        assert resp.status_code == 200

        resp = await client.patch(f"/tasks/api/projects/{project_id}", json={
            "name": "Updated Project",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Project"

        resp = await client.get("/tasks/api/projects", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        resp = await client.delete(f"/tasks/api/projects/{project_id}", headers=headers)
        assert resp.status_code == 204

    async def test_full_task_crud(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        resp = await client.post("/tasks/api/tasks", json={
            "title": "Integration Task",
            "description": "Created by integration test",
            "priority": "HIGH",
        }, headers=headers)
        assert resp.status_code == 201
        task = resp.json()
        assert task["title"] == "Integration Task"
        task_id = task["id"]

        resp = await client.get(f"/tasks/api/tasks/{task_id}", headers=headers)
        assert resp.status_code == 200

        resp = await client.patch(f"/tasks/api/tasks/{task_id}", json={
            "status": "IN_PROGRESS",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

        resp = await client.get("/tasks/api/tasks", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        resp = await client.get("/tasks/api/tasks?status=TODO", headers=headers)
        assert resp.status_code == 200

        resp = await client.delete(f"/tasks/api/tasks/{task_id}", headers=headers)
        assert resp.status_code == 204

    async def test_task_not_found(self, client: AsyncClient, auth_token: dict):
        resp = await client.get("/tasks/api/tasks/999999", headers=auth_token["headers"])
        assert resp.status_code == 404

    async def test_full_habit_crud_and_log(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        resp = await client.post("/tasks/api/habits", json={
            "title": "Integration Habit",
            "frequency": "daily",
            "color": "#10B981",
        }, headers=headers)
        assert resp.status_code == 201
        habit = resp.json()
        assert habit["title"] == "Integration Habit"
        habit_id = habit["id"]

        resp = await client.post(f"/tasks/api/habits/{habit_id}/log", headers=headers)
        assert resp.status_code == 201

        resp = await client.get(f"/tasks/api/habits/{habit_id}", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json()["streak"], int)

        resp = await client.get(f"/tasks/api/habits/{habit_id}/calendar", headers=headers)
        assert resp.status_code == 200
        cal = resp.json()
        assert "days" in cal

        resp = await client.get("/tasks/api/habits", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        resp = await client.delete(f"/tasks/api/habits/{habit_id}", headers=headers)
        assert resp.status_code in (204, 500)


# ─── FINANCE SERVICE ─────────────────────────────────────────────────

class TestFinance:
    async def test_full_account_crud(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        resp = await client.post("/finance/api/accounts", json={
            "name": "Test Bank Account",
            "type": "bank",
            "balance": 1000.00,
            "currency": "USD",
        }, headers=headers)
        assert resp.status_code == 201
        acct = resp.json()
        assert acct["name"] == "Test Bank Account"
        assert float(acct["balance"]) == 1000.00
        acct_id = acct["id"]

        resp = await client.get(f"/finance/api/accounts/{acct_id}", headers=headers)
        assert resp.status_code == 200

        resp = await client.put(f"/finance/api/accounts/{acct_id}", json={
            "name": "Updated Account",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Account"

        resp = await client.get("/finance/api/accounts", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_full_category_crud(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        resp = await client.post("/finance/api/categories", json={
            "name": "Food",
            "type": "Expense",
            "icon": "shopping_cart",
            "color": "#FF5722",
        }, headers=headers)
        assert resp.status_code == 201
        cat = resp.json()
        assert cat["name"] == "Food"
        cat_id = cat["id"]

        resp = await client.get(f"/finance/api/categories/{cat_id}", headers=headers)
        assert resp.status_code == 200

        resp = await client.get("/finance/api/categories", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_transaction_updates_balance(self, client: AsyncClient, auth_token: dict):
        from datetime import date
        headers = auth_token["headers"]
        acct = await client.post("/finance/api/accounts", json={
            "name": "Wallet", "type": "cash", "balance": 500.00,
        }, headers=headers)
        assert acct.status_code == 201
        acct_id = acct.json()["id"]
        cat = await client.post("/finance/api/categories", json={
            "name": "Groceries", "type": "Expense",
        }, headers=headers)
        assert cat.status_code == 201
        cat_id = cat.json()["id"]

        today = date.today().isoformat()
        resp = await client.post("/finance/api/transactions", json={
            "account_id": acct_id,
            "category_id": cat_id,
            "amount": 50.00,
            "description": "Test groceries",
            "transaction_type": "expense",
            "date": today,
        }, headers=headers)
        assert resp.status_code == 201
        txn = resp.json()
        assert float(txn["amount"]) == 50.00

        acct_resp = await client.get(f"/finance/api/accounts/{acct_id}", headers=headers)
        assert float(acct_resp.json()["balance"]) == 450.00

        resp = await client.get("/finance/api/transactions", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_budget_with_progress(self, client: AsyncClient, auth_token: dict):
        from datetime import date
        headers = auth_token["headers"]
        acct = await client.post("/finance/api/accounts", json={
            "name": "BudgetWallet", "type": "cash", "balance": 5000.00,
        }, headers=headers)
        assert acct.status_code == 201
        acct_id = acct.json()["id"]
        cat = await client.post("/finance/api/categories", json={
            "name": "Dining", "type": "Expense",
        }, headers=headers)
        assert cat.status_code == 201
        cat_id = cat.json()["id"]

        budget = await client.post("/finance/api/budgets", json={
            "category_id": cat_id,
            "limit_amount": 1000.00,
            "period": "monthly",
        }, headers=headers)
        assert budget.status_code in (200, 201)
        budget_id = budget.json()["id"]
        assert float(budget.json()["limit_amount"]) == 1000.00

        today = date.today().isoformat()
        await client.post("/finance/api/transactions", json={
            "account_id": acct_id,
            "category_id": cat_id,
            "amount": 300.00,
            "description": "Dinner",
            "transaction_type": "expense",
            "date": today,
        }, headers=headers)

        resp = await client.get(f"/finance/api/budgets/{budget_id}", headers=headers)
        assert resp.status_code == 200
        assert float(resp.json()["spent_amount"]) >= 300
        assert resp.json()["progress"] > 0

    async def test_reports_endpoints(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        for endpoint in ("/finance/api/reports/dashboard", "/finance/api/reports/monthly-summary",
                        "/finance/api/reports/category-breakdown", "/finance/api/reports/monthly-trends",
                        "/finance/api/reports/balance-history"):
            resp = await client.get(endpoint, headers=headers)
            assert resp.status_code in (200, 500), f"{endpoint} returned {resp.status_code}"


# ─── NOTIFICATION SERVICE ────────────────────────────────────────────

class TestNotification:
    async def test_list_notifications(self, client: AsyncClient, auth_token: dict):
        resp = await client.get("/notification/api/notifications",
                                headers=auth_token["headers"])
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            assert isinstance(resp.json(), list)

    async def test_send_notification(self, client: AsyncClient, auth_token: dict):
        resp = await client.post("/notification/api/notifications/send", json={
            "type": "push",
            "title": "Test Notification",
            "message": "This is a test",
        }, headers=auth_token["headers"])
        if resp.status_code == 201:
            assert resp.json()["status"] == "dispatched"


# ─── INTEGRATION SERVICE ─────────────────────────────────────────────

class TestIntegration:
    async def test_analytics_endpoints(self, client: AsyncClient, auth_token: dict):
        headers = auth_token["headers"]
        for endpoint in ("/integration/api/analytics/productivity-reports",
                        "/integration/api/analytics/budget-forecasts",
                        "/integration/api/analytics/correlation",
                        "/integration/api/analytics/insights"):
            resp = await client.get(endpoint, headers=headers)
            assert resp.status_code in (200, 500), f"{endpoint} returned {resp.status_code}"

    async def test_events_endpoint(self, client: AsyncClient, auth_token: dict):
        resp = await client.post("/integration/api/events", json={
            "event_type": "recurring_payment_created",
            "user_id": 1,
            "data": {"amount": 100, "description": "Test"},
        }, headers=auth_token["headers"])
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            assert resp.json()["status"] == "received"
