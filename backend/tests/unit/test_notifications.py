import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def client(mock_supabase):
    with patch("app.db.client.create_client"), \
         patch("app.security.rate_limiter.get_redis"), \
         patch("app.api.v1.notifications.get_supabase", return_value=mock_supabase):
        from app.main import app
        from app.security.auth import get_current_user, User
        mock_user = User(id="test-user-123", email="test@lifeos.ai", tier="pro")
        app.dependency_overrides[get_current_user] = lambda: mock_user
        yield TestClient(app)
        app.dependency_overrides.clear()


def test_list_notifications_empty(client, mock_supabase):
    r = client.get("/api/v1/notifications")
    assert r.status_code == 200
    assert r.json() == []


def test_list_notifications_with_data(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(
        data=[{"id": "n1", "title": "Test", "body": "Body", "read": False, "created_at": "2026-01-01T00:00:00Z", "type": "system"}]
    )
    r = client.get("/api/v1/notifications")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == "n1"


def test_mark_read(client, mock_supabase):
    r = client.put("/api/v1/notifications/abc-123/read")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_mark_all_read(client, mock_supabase):
    mock_supabase.table.return_value.execute.return_value = MagicMock(
        data=[{"id": "n1"}, {"id": "n2"}]
    )
    r = client.put("/api/v1/notifications/read-all")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["updated"] == 2


def test_mark_all_read_none_data(client, mock_supabase):
    # Supabase returns None for empty update result
    mock_supabase.table.return_value.execute.return_value = MagicMock(data=None)
    r = client.put("/api/v1/notifications/read-all")
    assert r.status_code == 200
    assert r.json()["updated"] == 0


def test_delete_notification(client, mock_supabase):
    r = client.delete("/api/v1/notifications/abc-123")
    assert r.status_code == 204


def test_unauthenticated_rejected():
    with patch("app.db.client.create_client"), \
         patch("app.security.rate_limiter.get_redis"):
        from app.main import app
    c = TestClient(app)
    r = c.get("/api/v1/notifications")
    assert r.status_code in (401, 403)
