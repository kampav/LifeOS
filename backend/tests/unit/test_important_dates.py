"""
Sprint 10 — Important Dates API tests.
"""
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.api.v1.important_dates import next_occurrence, days_until


@pytest.fixture
def test_user():
    return MagicMock(id="test-user-123", email="test@lifeos.ai", tier="pro")


@pytest.fixture
def mock_sb():
    sb = MagicMock()
    chain = MagicMock()
    sb.table.return_value = chain
    chain.select.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.delete.return_value = chain
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    return sb


@pytest.fixture
def client(test_user, mock_sb):
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── next_occurrence unit tests ─────────────────────────────────────────────────

def test_next_occurrence_non_recurring_returns_original():
    """Non-recurring dates always return the original date."""
    d = date(2020, 3, 15)
    assert next_occurrence(d, recurring=False) == d


def test_next_occurrence_future_this_year():
    """Recurring date still in the future this year returns this year's occurrence."""
    today = date.today()
    future = today + timedelta(days=30)
    result = next_occurrence(future, recurring=True)
    assert result.year == today.year
    assert result.month == future.month
    assert result.day == future.day


def test_next_occurrence_past_this_year_returns_next_year():
    """Recurring date already passed returns next year's occurrence."""
    today = date.today()
    past = today - timedelta(days=30)
    result = next_occurrence(past, recurring=True)
    assert result.year == today.year + 1
    assert result.month == past.month
    assert result.day == past.day


def test_next_occurrence_feb29_non_leap_year():
    """Feb 29 birthday returns Mar 1 in non-leap years."""
    feb29 = date(2000, 2, 29)
    result = next_occurrence(feb29, recurring=True)
    # Result should be either Mar 1 of this year or next year
    assert result.month == 3 and result.day == 1


# ── API endpoint tests ─────────────────────────────────────────────────────────

def test_list_dates_empty(client, mock_sb):
    """GET /important-dates returns empty list when no dates."""
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
    resp = client.get("/api/v1/important-dates")
    assert resp.status_code == 200
    body = resp.json()
    assert body["dates"] == []
    assert body["total"] == 0


def test_list_dates_enriches_with_next_occurrence(client, mock_sb):
    """GET /important-dates enriches each row with next_occurrence and days_until."""
    today = date.today()
    future = today + timedelta(days=10)
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[{"id": "d1", "title": "Test", "date": future.isoformat(), "recurring": False, "category": "other"}]
    )
    resp = client.get("/api/v1/important-dates")
    assert resp.status_code == 200
    row = resp.json()["dates"][0]
    assert "next_occurrence" in row
    assert "days_until" in row
    assert row["days_until"] == 10


def test_upcoming_dates_filters_within_window(client, mock_sb):
    """GET /important-dates/upcoming only returns dates within days window."""
    today = date.today()
    within = today + timedelta(days=5)
    outside = today + timedelta(days=200)
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "d1", "title": "Soon", "date": within.isoformat(), "recurring": False},
            {"id": "d2", "title": "Far", "date": outside.isoformat(), "recurring": False},
        ]
    )
    resp = client.get("/api/v1/important-dates/upcoming?days=90")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["upcoming"][0]["title"] == "Soon"


def test_upcoming_dates_sorted_by_days_until(client, mock_sb):
    """GET /important-dates/upcoming returns results sorted ascending by days_until."""
    today = date.today()
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "d2", "title": "Later", "date": (today + timedelta(days=20)).isoformat(), "recurring": False},
            {"id": "d1", "title": "Sooner", "date": (today + timedelta(days=5)).isoformat(), "recurring": False},
        ]
    )
    resp = client.get("/api/v1/important-dates/upcoming?days=90")
    body = resp.json()
    assert body["upcoming"][0]["title"] == "Sooner"
    assert body["upcoming"][1]["title"] == "Later"


def test_create_date_valid(client, mock_sb):
    """POST /important-dates with valid payload creates record."""
    mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "new-id", "title": "Mum birthday", "date": "1985-06-15", "category": "birthday"}]
    )
    resp = client.post("/api/v1/important-dates", json={
        "title": "Mum birthday",
        "date": "1985-06-15",
        "category": "birthday",
        "recurring": True,
    })
    assert resp.status_code == 201
    assert resp.json()["title"] == "Mum birthday"


def test_create_date_invalid_category(client):
    """POST /important-dates with unknown category returns 400."""
    resp = client.post("/api/v1/important-dates", json={
        "title": "Test",
        "date": "2025-01-01",
        "category": "spaceship_launch",
    })
    assert resp.status_code == 400


def test_delete_date_not_found(client, mock_sb):
    """DELETE /important-dates/{id} for non-existent date returns 404."""
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    resp = client.delete("/api/v1/important-dates/ghost-id")
    assert resp.status_code == 404


def test_update_date_not_found(client, mock_sb):
    """PUT /important-dates/{id} for non-existent date returns 404."""
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    resp = client.put("/api/v1/important-dates/ghost-id", json={
        "title": "Updated",
        "date": "2025-06-01",
        "category": "other",
    })
    assert resp.status_code == 404


def test_update_date_invalid_category(client, mock_sb):
    """PUT /important-dates/{id} with invalid category returns 400."""
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": "d1"}]
    )
    resp = client.put("/api/v1/important-dates/d1", json={
        "title": "Updated",
        "date": "2025-06-01",
        "category": "invalid_cat",
    })
    assert resp.status_code == 400
