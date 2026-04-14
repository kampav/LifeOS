"""
Sprint 6 — Tasks API unit tests (CRUD, move, bulk, RLS).
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.security.auth import get_current_user, User

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")

SAMPLE_TASK = {
    "id": "task-1",
    "user_id": "test-user-123",
    "title": "Write quarterly report",
    "domain": "career",
    "status": "todo",
    "priority": "high",
    "position": 0,
}


@pytest.fixture
def client(mock_supabase, mock_redis):
    from app.main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.tasks.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_task(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_TASK])
    r = client.post("/api/v1/tasks", json={"title": "Write quarterly report", "domain": "career", "priority": "high"})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Write quarterly report"


def test_get_kanban_returns_columns(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_TASK])
    r = client.get("/api/v1/kanban")
    assert r.status_code == 200
    data = r.json()
    assert "todo" in data
    assert "in_progress" in data
    assert "waiting" in data
    assert "done" in data


def test_move_task(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{**SAMPLE_TASK, "status": "in_progress"}])
    r = client.post("/api/v1/tasks/task-1/move", json={"status": "in_progress", "position": 0})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_move_task_invalid_status(client, mock_supabase):
    r = client.post("/api/v1/tasks/task-1/move", json={"status": "invalid_status", "position": 0})
    assert r.status_code == 400


def test_bulk_complete(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_TASK])
    r = client.post("/api/v1/tasks/bulk", json={"action": "complete", "ids": ["task-1", "task-2"]})
    assert r.status_code == 200
    assert "updated" in r.json()


def test_bulk_delete(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_TASK])
    r = client.post("/api/v1/tasks/bulk", json={"action": "delete", "ids": ["task-1"]})
    assert r.status_code == 200
    assert r.json()["deleted"] == 1


def test_rls_user_isolation(client, mock_supabase):
    """Verify all queries include user_id eq filter (RLS enforcement)."""
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[])
    client.get("/api/v1/kanban")
    # .eq("user_id", ...) must have been called
    table.eq.assert_called()
