"""
Sprint 9 — Assets & Vault API tests.
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.security.auth import get_current_user, User
from app.db.client import get_supabase


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
    chain.upsert.return_value = chain
    chain.eq.return_value = chain
    chain.neq.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.not_.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    return sb


@pytest.fixture
def client(test_user, mock_sb):
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Assets CRUD ───────────────────────────────────────────────────────────────

def test_list_assets_returns_totals(client, mock_sb):
    """GET /assets returns assets list with totals."""
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "a1", "name": "Home", "asset_type": "property", "current_value": 350000.0, "liability": 200000.0},
            {"id": "a2", "name": "ISA", "asset_type": "savings", "current_value": 20000.0, "liability": 0.0},
        ]
    )
    resp = client.get("/api/v1/assets")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["assets"]) == 2
    assert body["total_value"] == 370000.0
    assert body["total_liability"] == 200000.0
    assert body["net_equity"] == 170000.0


def test_create_asset_valid(client, mock_sb):
    """POST /assets with valid payload creates asset."""
    mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "new-id", "name": "Car", "asset_type": "vehicle", "current_value": 15000.0}]
    )
    resp = client.post("/api/v1/assets", json={"name": "Car", "asset_type": "vehicle", "current_value": 15000.0})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Car"


def test_create_asset_invalid_type(client):
    """POST /assets with unknown asset_type returns 400."""
    resp = client.post("/api/v1/assets", json={"name": "Mystery", "asset_type": "unicorn"})
    assert resp.status_code == 400


def test_delete_asset_not_found(client, mock_sb):
    """DELETE /assets/{id} for non-existent asset returns 404."""
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    resp = client.delete("/api/v1/assets/nonexistent-id")
    assert resp.status_code == 404


def test_assets_summary_groups_by_type(client, mock_sb):
    """GET /assets/summary groups assets by type with equity calc."""
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"asset_type": "property", "current_value": 300000.0, "liability": 180000.0},
            {"asset_type": "property", "current_value": 250000.0, "liability": 150000.0},
            {"asset_type": "savings", "current_value": 10000.0, "liability": 0.0},
        ]
    )
    resp = client.get("/api/v1/assets/summary")
    assert resp.status_code == 200
    body = resp.json()
    property_row = next(r for r in body["breakdown"] if r["asset_type"] == "property")
    assert property_row["value"] == 550000.0
    assert property_row["net_equity"] == 220000.0


# ── Vault — Document Vault ────────────────────────────────────────────────────

def test_list_vault_documents(client, mock_sb):
    """GET /vault/documents returns documents list."""
    mock_sb.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[{"id": "d1", "title": "Passport", "document_type": "passport", "expiry_date": "2030-01-01"}]
    )
    resp = client.get("/api/v1/vault/documents")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["documents"][0]["title"] == "Passport"


def test_create_vault_document_invalid_type(client):
    """POST /vault/documents with unknown document_type returns 400."""
    resp = client.post("/api/v1/vault/documents", json={"title": "Test", "document_type": "spaceship_deed"})
    assert resp.status_code == 400


def test_create_vault_document_valid(client, mock_sb):
    """POST /vault/documents with valid payload creates record."""
    mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "doc-1", "title": "Will", "document_type": "will"}]
    )
    resp = client.post("/api/v1/vault/documents", json={"title": "Will", "document_type": "will"})
    assert resp.status_code == 201


# ── Vault — Legacy Vault ──────────────────────────────────────────────────────

def test_create_legacy_entry_is_encrypted(client, mock_sb):
    """POST /vault/legacy always sets is_encrypted=True."""
    captured = {}

    def fake_insert(payload):
        captured.update(payload)
        chain = MagicMock()
        chain.execute.return_value = MagicMock(data=[{**payload, "id": "leg-1"}])
        return chain

    mock_sb.table.return_value.insert.side_effect = fake_insert

    resp = client.post("/api/v1/vault/legacy", json={
        "entry_type": "message",
        "title": "To my family",
        "content": "I love you all.",
        "release_on": "death",
    })
    assert resp.status_code == 201
    assert captured.get("is_encrypted") is True


def test_create_legacy_invalid_entry_type(client):
    """POST /vault/legacy with invalid entry_type returns 400."""
    resp = client.post("/api/v1/vault/legacy", json={"entry_type": "secret_evil_plan", "title": "Test"})
    assert resp.status_code == 400


def test_delete_legacy_entry_not_found(client, mock_sb):
    """DELETE /vault/legacy/{id} for non-existent entry returns 404."""
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    resp = client.delete("/api/v1/vault/legacy/ghost-id")
    assert resp.status_code == 404
