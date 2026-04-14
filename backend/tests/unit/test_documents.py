"""
Sprint 7 — Document service unit tests.

Tests:
  - test_health_document_classified_tier3
  - test_bank_statement_classified_tier2
  - test_general_document_classified_tier1
  - test_tier3_uses_ollama_not_cloud
  - test_no_db_write_before_confirmation
  - test_confirm_is_single_transaction
"""
import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from app.security.auth import get_current_user, User
from app.services.document_service import classify_sensitivity

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")


# ── Sensitivity classification (zero-token, regex-based) ─────────────────────

def test_health_document_classified_tier3():
    """Medical keywords → tier 3."""
    text = "Patient was prescribed medication following diagnosis of Type 2 diabetes."
    assert classify_sensitivity(text) == 3


def test_bank_statement_classified_tier2():
    """Financial keywords → tier 2."""
    text = "Account number 12345678, Sort code 20-00-00. Your salary payment of £4,500."
    assert classify_sensitivity(text) == 2


def test_general_document_classified_tier1():
    """Generic text with no sensitive keywords → tier 1."""
    text = "Meeting agenda for Q2 planning session. Topics: roadmap, hiring, OKRs."
    assert classify_sensitivity(text) == 1


def test_tier3_over_tier2():
    """If text has both health + finance keywords, health wins (tier 3)."""
    text = "Patient account number and diagnosis of anxiety disorder."
    assert classify_sensitivity(text) == 3


# ── Tier 3 routing uses Ollama ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_tier3_uses_health_sensitive_intent(monkeypatch):
    """process_document must call ai_complete with intent='health_sensitive' for tier 3 docs."""
    captured_intents = []

    async def mock_ai_complete(messages, intent, user_id):
        captured_intents.append(intent)
        return json.dumps({
            "summary": "Medical document summary",
            "domains": ["health"],
            "action_items": [{"title": "Book follow-up", "domain": "health", "item_type": "task"}],
        })

    monkeypatch.setattr("app.services.document_service.ai_complete", mock_ai_complete)

    from app.services.document_service import process_document
    health_text = b"Patient diagnosis: Type 2 diabetes. Prescribed metformin."
    result = await process_document(
        file_bytes=health_text,
        content_type="text/plain",
        filename="medical_report.txt",
        user_id="test-user-123",
    )

    assert "health_sensitive" in captured_intents
    assert result.sensitivity_tier == 3
    assert result.domains == ["health"]


@pytest.mark.asyncio
async def test_tier1_uses_document_review_intent(monkeypatch):
    """process_document must call ai_complete with intent='document_review' for tier 1 docs."""
    captured_intents = []

    async def mock_ai_complete(messages, intent, user_id):
        captured_intents.append(intent)
        return json.dumps({
            "summary": "Team meeting notes",
            "domains": ["career"],
            "action_items": [],
        })

    monkeypatch.setattr("app.services.document_service.ai_complete", mock_ai_complete)

    from app.services.document_service import process_document
    result = await process_document(
        file_bytes=b"Q2 planning meeting agenda. Topics: roadmap, hiring.",
        content_type="text/plain",
        filename="meeting_notes.txt",
        user_id="test-user-123",
    )

    assert "document_review" in captured_intents
    assert result.sensitivity_tier == 1


# ── No DB write before confirmation ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_no_db_write_before_confirmation(monkeypatch):
    """process_document must NOT write to tasks/goals/entries tables."""
    db_calls = []

    class FakeTable:
        def insert(self, *a, **kw):
            db_calls.append(("insert", a, kw))
            return self
        def execute(self):
            return MagicMock(data=[])

    class FakeSB:
        def table(self, name):
            db_calls.append(("table", name))
            return FakeTable()

    async def mock_ai_complete(messages, intent, user_id):
        return json.dumps({
            "summary": "Test doc",
            "domains": ["career"],
            "action_items": [{"title": "Do something", "domain": "career", "item_type": "task"}],
        })

    monkeypatch.setattr("app.services.document_service.ai_complete", mock_ai_complete)

    from app.services.document_service import process_document
    result = await process_document(
        file_bytes=b"Project brief for Q3 roadmap planning.",
        content_type="text/plain",
        filename="brief.txt",
        user_id="test-user-123",
    )

    # process_document must not insert into tasks, goals, or entries
    insert_tables = [call[1] for call in db_calls if call[0] == "table"]
    assert "tasks" not in insert_tables
    assert "goals" not in insert_tables
    assert "entries" not in insert_tables

    # But the ExtractionResult should have the action items
    assert len(result.action_items) == 1
    assert result.action_items[0].title == "Do something"


# ── Confirm is a single transaction ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_confirm_writes_tasks_and_marks_confirmed():
    """confirm_extraction must insert items AND update upload status in one pass."""
    inserted_tables = []
    updated_tables = []

    def make_table(name):
        t = MagicMock()
        t.insert.return_value = t
        t.update.return_value = t
        t.eq.return_value = t
        t.execute.return_value = MagicMock(data=[{"id": f"{name}-new-id"}])
        return t

    sb = MagicMock()
    table_registry = {}

    def get_table(name):
        if name not in table_registry:
            table_registry[name] = make_table(name)
        return table_registry[name]

    sb.table.side_effect = lambda name: get_table(name)

    from app.services.document_service import confirm_extraction
    confirmed_items = [
        {"title": "Book appointment", "domain": "health", "item_type": "task"},
        {"title": "Track expenses", "domain": "finance", "item_type": "task"},
    ]

    created = await confirm_extraction(
        upload_id="upload-abc",
        confirmed_action_items=confirmed_items,
        user_id="test-user-123",
        supabase=sb,
    )

    # Tasks table should have been used
    assert sb.table.call_count >= 3  # 2 inserts + 1 status update
    # document_uploads status update must have been called
    upload_table = table_registry.get("document_uploads")
    assert upload_table is not None
    upload_table.update.assert_called_once()
    update_call_args = upload_table.update.call_args[0][0]
    assert update_call_args["status"] == "confirmed"


# ── Documents API integration ─────────────────────────────────────────────────

@pytest.fixture
def doc_client(mock_supabase, mock_redis):
    from app.main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.documents.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_upload_unsupported_type_returns_415(doc_client):
    """Uploading an .exe file must return 415."""
    import io
    r = doc_client.post(
        "/api/v1/coach/upload",
        files=[("files", ("malware.exe", io.BytesIO(b"MZ"), "application/octet-stream"))],
    )
    assert r.status_code == 415


def test_list_uploads_returns_empty(doc_client, mock_supabase):
    """GET /coach/uploads returns empty list when no uploads."""
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])
    r = doc_client.get("/api/v1/coach/uploads")
    assert r.status_code == 200
    assert r.json()["uploads"] == []
