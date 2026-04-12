import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(scope="session")
def test_user():
    return {"id": "test-user-123", "email": "test@lifeos.ai", "tier": "pro"}


@pytest.fixture
def mock_supabase(monkeypatch):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    table.select.return_value = table
    table.insert.return_value = table
    table.update.return_value = table
    table.delete.return_value = table
    table.upsert.return_value = table
    table.eq.return_value = table
    table.neq.return_value = table
    table.gte.return_value = table
    table.lte.return_value = table
    table.lt.return_value = table
    table.not_.return_value = table
    table.is_.return_value = table
    table.order.return_value = table
    table.limit.return_value = table
    table.single.return_value = table
    table.execute.return_value = MagicMock(data=[])
    monkeypatch.setattr("app.db.client.get_supabase", lambda: sb)
    return sb


@pytest.fixture
def mock_ai(monkeypatch):
    async def fake_ai(*args, **kwargs):
        return "Test AI response", "claude-haiku-4-5-20251001"
    monkeypatch.setattr("app.services.ai_service.ai_complete", fake_ai)
    return fake_ai


@pytest.fixture
def mock_redis(monkeypatch):
    r = AsyncMock()
    r.get.return_value = None
    r.set.return_value = True
    r.setex.return_value = True
    r.incr.return_value = 1
    r.expire.return_value = True
    monkeypatch.setattr("app.security.rate_limiter.get_redis", lambda: r)
    return r
