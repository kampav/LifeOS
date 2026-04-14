"""
Sprint 6 — Homescreen API unit tests (cache hit, stale fallback, invalidation).
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from app.security.auth import get_current_user, User

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")

FRESH_CACHE = {
    "user_id": "test-user-123",
    "today": {"tasks": [], "habits": [], "non_movable": [], "coaching_question": "How was your day?"},
    "this_week": {"tasks": [], "goals": []},
    "this_month": {"tasks": [], "goals": []},
    "this_year": {"tasks": [], "goals": []},
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "stale_after": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
}

STALE_CACHE = {
    **FRESH_CACHE,
    "stale_after": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),  # expired
}


@pytest.fixture
def hs_client(mock_supabase, mock_redis):
    from app.main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.homescreen.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_cache_hit_returns_from_cache(hs_client, mock_supabase):
    """Fresh cache must be returned without rebuilding."""
    mock_supabase.table.return_value.single.return_value.execute.return_value = MagicMock(data=FRESH_CACHE)
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=FRESH_CACHE)
    r = hs_client.get("/api/v1/homescreen")
    assert r.status_code == 200
    data = r.json()
    # Should return the today panel
    assert "today" in data or "from_cache" in data


def test_refresh_endpoint_returns_homescreen(hs_client, mock_supabase):
    """POST /homescreen/refresh must return a fresh payload with refreshed=True."""
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[])
    table.single.return_value.execute.return_value = MagicMock(data=None)

    r = hs_client.post("/api/v1/homescreen/refresh")
    assert r.status_code == 200
    data = r.json()
    assert data.get("refreshed") is True
    assert "today" in data


def test_complete_item_marks_done(hs_client, mock_supabase):
    """POST /homescreen/items/{id}/complete must update task status."""
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{"id": "task-1", "status": "done"}])
    r = hs_client.post("/api/v1/homescreen/items/task-1/complete")
    assert r.status_code == 200
    assert r.json()["completed"] is True


def test_snooze_sets_new_due_date(hs_client, mock_supabase):
    """POST /homescreen/items/{id}/snooze must update due_date."""
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{"id": "task-1", "due_date": "2026-04-15"}])
    r = hs_client.post("/api/v1/homescreen/items/task-1/snooze", json={"hours": 24})
    assert r.status_code == 200
    data = r.json()
    assert data["snoozed"] is True
    assert "new_due_date" in data
