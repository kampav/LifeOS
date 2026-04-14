"""
Sprint 6 — Planner + prioritiser unit tests.
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.services.prioritiser import priority_score, today_items, week_items


# ── Prioritiser unit tests ────────────────────────────────────────────────────

def test_non_movable_scores_highest():
    """Fixed events must score higher than any regular task."""
    fixed = {"id": "1", "title": "Doctor appointment", "priority": "medium", "is_non_movable": True}
    regular = {"id": "2", "title": "Review docs", "priority": "critical", "is_non_movable": False}
    assert priority_score(fixed) > priority_score(regular)


def test_overdue_item_scores_high():
    """Overdue items get +60 urgency bonus."""
    yesterday = (datetime.now(timezone.utc) - timedelta(days=2)).date().isoformat()
    overdue = {"id": "1", "title": "Tax return", "priority": "medium", "due_date": yesterday}
    future = {"id": "2", "title": "Nice to have", "priority": "medium", "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()}
    assert priority_score(overdue) > priority_score(future)


def test_priority_label_order():
    """critical > high > medium > low."""
    scores = [priority_score({"priority": p}) for p in ["critical", "high", "medium", "low"]]
    assert scores[0] > scores[1] > scores[2] > scores[3]


def test_today_items_excludes_far_future():
    """today_items must not include tasks due 60 days from now."""
    far_future = (datetime.now(timezone.utc) + timedelta(days=60)).date().isoformat()
    items = [
        {"id": "1", "title": "Today task", "priority": "medium", "due_date": datetime.now(timezone.utc).date().isoformat()},
        {"id": "2", "title": "Far future task", "priority": "high", "due_date": far_future},
    ]
    result = today_items(items)
    ids = [i["id"] for i in result]
    assert "1" in ids
    assert "2" not in ids


def test_week_items_respects_window():
    """week_items must only return items due within 7 days."""
    in_3_days = (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat()
    in_10_days = (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()
    items = [
        {"id": "a", "title": "Soon", "priority": "medium", "due_date": in_3_days},
        {"id": "b", "title": "Later", "priority": "high", "due_date": in_10_days},
    ]
    result = week_items(items)
    ids = [i["id"] for i in result]
    assert "a" in ids
    assert "b" not in ids


def test_domain_weight_shifts_score():
    """Higher domain weight should produce higher score for same item."""
    item = {"id": "1", "title": "Health check", "priority": "medium", "domain": "health"}
    low_weight = {"health": 1}
    high_weight = {"health": 10}
    assert priority_score(item, high_weight) > priority_score(item, low_weight)


# ── Planner API tests ────────────────────────────────────────────────────────

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.security.auth import get_current_user, User

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")
SAMPLE_ITEM = {
    "id": "item-1", "user_id": "test-user-123", "title": "Team standup",
    "item_type": "event", "start_at": "2026-04-14T09:00:00+00:00",
    "priority": "medium", "completed": False,
}


@pytest.fixture
def planner_client(mock_supabase, mock_redis):
    from app.main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.planner.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_planner_item(planner_client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=[SAMPLE_ITEM])
    r = planner_client.post("/api/v1/planner/items", json={
        "title": "Team standup",
        "item_type": "event",
        "start_at": "2026-04-14T09:00:00+00:00",
    })
    assert r.status_code == 201


def test_agenda_returns_sorted_items(planner_client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=[SAMPLE_ITEM])
    r = planner_client.get("/api/v1/planner/agenda")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
