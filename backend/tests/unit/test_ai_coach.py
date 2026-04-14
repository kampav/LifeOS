import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch


@pytest.fixture
def mock_ai(monkeypatch):
    """Override conftest mock_ai to patch import site in ai_coach module."""
    async def fake_ai(*args, **kwargs):
        return "Test AI response", "claude-sonnet-4-6"
    monkeypatch.setattr("app.services.ai_service.ai_complete", fake_ai)
    monkeypatch.setattr("app.api.v1.ai_coach.ai_complete", fake_ai)
    return fake_ai


@pytest.fixture
def client(mock_supabase, mock_ai, mock_redis, monkeypatch):
    async def fake_domain_ctx(user_id, domain, days=7):
        return f"[{domain.upper()} CONTEXT]\nNo data."

    async def fake_full_ctx(user_id, domains=None):
        return "[FULL CONTEXT]\nNo data."

    async def fake_memories(user_id, query, limit=5):
        return "No prior memories."

    async def fake_store(user_id, content):
        pass

    monkeypatch.setattr("app.memory.compressor.build_domain_context", fake_domain_ctx)
    monkeypatch.setattr("app.memory.compressor.build_full_context", fake_full_ctx)
    monkeypatch.setattr("app.memory.mem0_client.get_memories", fake_memories)
    monkeypatch.setattr("app.memory.mem0_client.store_memory", fake_store)
    monkeypatch.setattr("app.api.v1.ai_coach.get_memories", fake_memories)
    monkeypatch.setattr("app.api.v1.ai_coach.store_memory", fake_store)
    monkeypatch.setattr("app.api.v1.ai_coach.build_domain_context", fake_domain_ctx)
    monkeypatch.setattr("app.api.v1.ai_coach.build_full_context", fake_full_ctx)

    with patch("app.db.client.create_client"), \
         patch("app.api.v1.ai_coach.get_supabase", return_value=mock_supabase):
        from app.main import app
        from app.security.auth import get_current_user, User
        mock_user = User(id="test-user-123", email="test@lifeos.ai", tier="pro")
        app.dependency_overrides[get_current_user] = lambda: mock_user
        yield TestClient(app)
        app.dependency_overrides.clear()


# ── Chat endpoint ────────────────────────────────────────────────────────────

def test_chat_new_conversation(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.post("/api/v1/ai/chat", json={"message": "How is my health?"})
    assert r.status_code == 200
    data = r.json()
    assert "conversation_id" in data
    # message is now a JSON CoachResponse string
    import json
    coach = json.loads(data["message"])
    assert "sections" in coach
    assert coach["sections"][0]["content"] == "Test AI response"


def test_chat_with_domain(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.post("/api/v1/ai/chat", json={"message": "Help me sleep better", "domain": "health"})
    assert r.status_code == 200
    assert r.json()["domain"] == "health"


def test_chat_existing_conversation(client, mock_supabase):
    existing = {
        "id": "conv-abc",
        "user_id": "test-user-123",
        "messages": [{"role": "user", "content": "previous", "timestamp": "2026-01-01T00:00:00Z"}],
        "domain": None,
    }
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=existing)
    r = client.post("/api/v1/ai/chat", json={"message": "Follow up", "conversation_id": "conv-abc"})
    assert r.status_code == 200
    assert r.json()["conversation_id"] == "conv-abc"


def test_chat_conversation_not_found(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.post("/api/v1/ai/chat", json={"message": "Hello", "conversation_id": "nonexistent"})
    assert r.status_code == 404


def test_chat_rate_limit_exceeded(client, mock_supabase, mock_redis):
    mock_redis.incr.return_value = 101
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.post("/api/v1/ai/chat", json={"message": "test"})
    assert r.status_code == 429


# ── Conversations endpoints ──────────────────────────────────────────────────

def test_list_conversations(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])
    r = client.get("/api/v1/ai/conversations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_conversation_found(client, mock_supabase):
    conv = {
        "id": "conv-1", "user_id": "test-user-123", "domain": "health",
        "title": "Health chat", "messages": [], "model_used": "claude-sonnet-4-6",
        "tokens_used": 100, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=conv)
    r = client.get("/api/v1/ai/conversations/conv-1")
    assert r.status_code == 200
    assert r.json()["id"] == "conv-1"


def test_get_conversation_not_found(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.get("/api/v1/ai/conversations/missing")
    assert r.status_code == 404


# ── Review endpoints ─────────────────────────────────────────────────────────

def test_daily_brief(client, monkeypatch):
    async def fake_brief(user_id):
        return "Your brief for today."
    monkeypatch.setattr("app.services.review_service.generate_daily_brief", fake_brief)
    r = client.get("/api/v1/ai/daily-brief")
    assert r.status_code == 200
    assert r.json()["brief"] == "Your brief for today."


def test_weekly_review(client, monkeypatch):
    async def fake_review(user_id):
        return {"review": "Weekly analysis.", "generated_at": "2026-01-01T00:00:00Z"}
    monkeypatch.setattr("app.services.review_service.generate_weekly_review", fake_review)
    r = client.post("/api/v1/ai/weekly-review")
    assert r.status_code == 200
    assert "review" in r.json()


# ── Memory endpoint ──────────────────────────────────────────────────────────

def test_get_memory(client, monkeypatch):
    mock_mem0 = MagicMock()
    mock_mem0.get_all.return_value = []
    monkeypatch.setattr("app.memory.mem0_client.get_mem0", lambda: mock_mem0)
    r = client.get("/api/v1/ai/memory")
    assert r.status_code == 200
    assert r.json() == {"memories": []}


def test_delete_memory(client, monkeypatch):
    mock_mem0 = MagicMock()
    monkeypatch.setattr("app.memory.mem0_client.get_mem0", lambda: mock_mem0)
    r = client.delete("/api/v1/ai/memory/mem-123")
    assert r.status_code == 204
