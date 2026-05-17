"""
Unified LifeOS inbox and integration tests.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.security.auth import User, get_current_user

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")

SAMPLE_LIFE_ITEM = {
    "id": "life-1",
    "user_id": "test-user-123",
    "title": "Reply to school email",
    "source_type": "email",
    "source_provider": "gmail",
    "external_id": "gmail-1",
    "item_kind": "capture",
    "priority": "high",
    "status": "inbox",
}


@pytest.fixture
def client(mock_supabase, mock_redis):
    from app.main import app

    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.life.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_simple_flow_is_one_inbox_one_decision_loop(client):
    r = client.get("/api/v1/life/flow")

    assert r.status_code == 200
    data = r.json()
    assert data["loop"] == ["capture", "decide", "act"]
    assert "remember" in data["decisions"]


def test_capture_creates_life_item(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_LIFE_ITEM])

    r = client.post(
        "/api/v1/life/capture",
        json={"title": "Reply to school email", "source_type": "manual", "priority": "high"},
    )

    assert r.status_code == 201
    assert r.json()["title"] == "Reply to school email"
    inserted = table.upsert.call_args.args[0]
    assert inserted["user_id"] == TEST_USER.id
    assert inserted["status"] == "inbox"


def test_decide_do_turns_capture_into_task(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.side_effect = [
        MagicMock(data=SAMPLE_LIFE_ITEM),
        MagicMock(data=[{"id": "task-1", "title": "Reply to school email"}]),
        MagicMock(data=[{**SAMPLE_LIFE_ITEM, "status": "done", "linked_task_id": "task-1"}]),
    ]

    r = client.post("/api/v1/life/items/life-1/decide", json={"decision": "do", "due_at": "2026-05-18T09:00:00+00:00"})

    assert r.status_code == 200
    assert r.json()["linked_task_id"] == "task-1"
    task_payload = table.insert.call_args.args[0]
    assert task_payload["status"] == "todo"
    assert task_payload["due_date"] == "2026-05-18"


def test_decide_remember_turns_capture_into_knowledge(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.side_effect = [
        MagicMock(data=SAMPLE_LIFE_ITEM),
        MagicMock(data=[{"id": "knowledge-1", "title": "School email pattern"}]),
        MagicMock(data=[{**SAMPLE_LIFE_ITEM, "status": "done", "linked_knowledge_item_id": "knowledge-1"}]),
    ]

    r = client.post(
        "/api/v1/life/items/life-1/decide",
        json={"decision": "remember", "title": "School email pattern", "content": "Handle school emails before 5 PM."},
    )

    assert r.status_code == 200
    assert r.json()["linked_knowledge_item_id"] == "knowledge-1"


def test_email_ingest_adds_messages_to_life_inbox(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_LIFE_ITEM])

    r = client.post(
        "/api/v1/life/integrations/email/ingest",
        json={
            "messages": [
                {
                    "provider": "gmail",
                    "external_id": "gmail-1",
                    "subject": "School trip consent",
                    "snippet": "Please confirm consent by Friday.",
                    "from_email": "school@example.com",
                    "priority": "high",
                }
            ]
        },
    )

    assert r.status_code == 200
    assert r.json()["ingested"] == 1
    life_payload = table.upsert.call_args.args[0]
    assert life_payload["source_type"] == "email"
    assert life_payload["source_provider"] == "gmail"


def test_calendar_ingest_creates_planner_event_and_life_item(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{"id": "planner-1", "title": "Dentist"}])

    r = client.post(
        "/api/v1/life/integrations/calendar/ingest",
        json={
            "events": [
                {
                    "provider": "google_calendar",
                    "external_id": "gcal-1",
                    "title": "Dentist",
                    "start_at": "2026-05-18T10:00:00+00:00",
                    "end_at": "2026-05-18T10:30:00+00:00",
                    "location": "Town clinic",
                }
            ]
        },
    )

    assert r.status_code == 200
    assert r.json()["ingested"] == 1
    calls = [call.args[0] for call in table.upsert.call_args_list]
    assert calls[0]["source_provider"] == "google_calendar"
    assert calls[1]["source_type"] == "calendar"


def test_google_connect_reports_missing_config_without_crashing(client):
    r = client.get("/api/v1/life/integrations/google/connect")

    assert r.status_code == 200
    assert r.json()["status"] in ("config_missing", "ready")
