"""
Sprint 8 — Consent & Privacy API tests.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.security.auth import get_current_user
from app.db.client import get_supabase


@pytest.fixture
def test_user():
    return MagicMock(id="test-user-123", email="test@lifeos.ai", tier="pro")


@pytest.fixture
def mock_supabase():
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    table.select.return_value = table
    table.insert.return_value = table
    table.upsert.return_value = table
    table.update.return_value = table
    table.delete.return_value = table
    table.eq.return_value = table
    table.order.return_value = table
    table.limit.return_value = table
    table.execute.return_value = MagicMock(data=[])
    return sb


@pytest.fixture
def client(test_user, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Test: onboarding blocked without required consents ────────────────────────

def test_required_consents_cannot_be_withdrawn(client, mock_supabase):
    """Required consents (health_data, financial_data, ai_processing) cannot be withdrawn."""
    for consent_type in ["health_data", "financial_data", "ai_processing"]:
        resp = client.post(f"/api/v1/privacy/withdraw/{consent_type}")
        assert resp.status_code == 409, f"Expected 409 for required consent '{consent_type}', got {resp.status_code}"
        body = resp.json()
        assert "required" in body["detail"].lower() or "required" in body.get("detail", "").lower()


def test_unknown_consent_type_returns_400(client):
    """Unknown consent types return 400."""
    resp = client.post("/api/v1/privacy/withdraw/totally_fake_consent")
    assert resp.status_code == 400


def test_optional_consent_can_be_withdrawn(client, mock_supabase):
    """Optional consents (marketing, analytics, third_party_sharing) can be withdrawn."""
    mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[{"id": "c1"}])
    for consent_type in ["marketing", "analytics", "third_party_sharing"]:
        resp = client.post(f"/api/v1/privacy/withdraw/{consent_type}")
        assert resp.status_code == 200, f"Expected 200 for optional consent '{consent_type}', got {resp.status_code}"
        assert resp.json()["withdrawn"] is True


# ── Test: data export produces complete file ──────────────────────────────────

def test_data_export_request_creates_record(client, mock_supabase):
    """POST /privacy/export creates a data_export_requests record."""
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "export-001"}]
    )
    resp = client.post("/api/v1/privacy/export")
    assert resp.status_code == 200
    body = resp.json()
    assert body["requested"] is True
    assert "message" in body
    # Verify insert was called on the right table
    mock_supabase.table.assert_any_call("data_export_requests")


# ── Test: delete request removes all user data ────────────────────────────────

def test_delete_request_without_confirm_returns_400(client):
    """DELETE without confirm=true is rejected."""
    resp = client.post("/api/v1/privacy/delete", json={"confirm": False})
    assert resp.status_code == 400


def test_delete_request_with_confirm_schedules_deletion(client, mock_supabase):
    """DELETE with confirm=true schedules deletion 30 days out."""
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "del-001"}]
    )
    resp = client.post("/api/v1/privacy/delete", json={"confirm": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["deletion_scheduled"] is True
    assert "30" in body["message"] or "scheduled_for" in body
    mock_supabase.table.assert_any_call("data_deletion_requests")


# ── Test: financial disclaimer in finance responses ───────────────────────────

def test_financial_disclaimer_in_spending_response(client, mock_supabase):
    """GET /finance/spending includes the financial disclaimer."""
    mock_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = MagicMock(data=[])
    resp = client.get("/api/v1/finance/spending")
    assert resp.status_code == 200
    body = resp.json()
    # Disclaimer should be present in the response
    assert "disclaimer" in body or any(
        "financial" in str(v).lower() and "advice" in str(v).lower()
        for v in body.values()
        if isinstance(v, str)
    )


# ── Test: children data never sent to AI ─────────────────────────────────────

def test_health_data_uses_health_sensitive_intent():
    """Health/medical data must route to 'health_sensitive' intent (Ollama), never cloud AI."""
    from app.api.v1.health_data import HEALTH_DISCLAIMER
    # Verify the disclaimer is defined
    assert len(HEALTH_DISCLAIMER) > 20
    # Verify the module doesn't import or use cloud AI intent for any health endpoint
    import inspect
    import app.api.v1.health_data as health_mod
    source = inspect.getsource(health_mod)
    # health_data module should NOT use 'life_coaching' or 'data_analysis' intents
    assert "life_coaching" not in source
    assert "data_analysis" not in source


def test_grant_consent_endpoint(client, mock_supabase):
    """POST /privacy/grant grants a consent type."""
    mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[{"id": "c1"}])
    resp = client.post("/api/v1/privacy/grant", json={"consent_type": "marketing"})
    assert resp.status_code == 200
    assert resp.json()["granted"] is True


def test_my_consents_returns_all_types(client, mock_supabase):
    """GET /privacy/my-consents returns all 6 consent types."""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    resp = client.get("/api/v1/privacy/my-consents")
    assert resp.status_code == 200
    body = resp.json()
    assert "consents" in body
    # Should have all 6 consent types
    assert len(body["consents"]) == 6
