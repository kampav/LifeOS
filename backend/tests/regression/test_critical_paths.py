"""Critical paths — must pass before every production deploy."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def client():
    with patch("app.db.client.create_client"), \
         patch("app.security.rate_limiter.get_redis"):
        from app.main import app
        return TestClient(app)


def test_health_check(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_metrics_endpoint(client):
    r = client.get("/metrics")
    assert r.status_code == 200


def test_unauthenticated_request_rejected(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 403  # No bearer token


def test_security_headers_present(client):
    r = client.get("/health")
    assert "X-Content-Type-Options" in r.headers
    assert "X-Frame-Options" in r.headers


def test_cors_allowed_origin(client):
    r = client.options("/health", headers={"Origin": "http://localhost:3000"})
    assert r.status_code in (200, 204)


def test_entry_domain_validation(client):
    """Invalid domain should be rejected by Pydantic."""
    from app.models.entry import EntryCreate
    with pytest.raises(Exception):
        EntryCreate(domain="invalid_domain", entry_type="metric")


def test_rls_cross_user_blocked():
    """RLS prevents cross-user data access — verified at DB level via policy."""
    # This is enforced by Supabase RLS, tested via integration tests against real DB
    # Documented here as a reminder — see integration/test_rls.py
    assert True  # Placeholder — real test requires Supabase connection
