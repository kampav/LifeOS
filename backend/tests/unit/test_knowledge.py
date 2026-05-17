"""
Second brain, learning, decisions and life review API tests.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.security.auth import User, get_current_user

TEST_USER = User(id="test-user-123", email="test@lifeos.ai", tier="pro")

SAMPLE_KNOWLEDGE = {
    "id": "knowledge-1",
    "user_id": "test-user-123",
    "title": "Weekly review ritual",
    "content": "Friday reflection should produce next actions.",
    "item_type": "playbook",
    "domain": "growth",
    "para_area": "areas",
    "status": "active",
    "tags": ["review", "ritual"],
    "importance": 4,
    "confidence": 4,
}


@pytest.fixture
def client(mock_supabase, mock_redis):
    from app.main import app

    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    with patch("app.db.client.create_client"):
        with patch("app.api.v1.knowledge.get_supabase", return_value=mock_supabase):
            yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_knowledge_item(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[SAMPLE_KNOWLEDGE])

    r = client.post(
        "/api/v1/knowledge",
        json={
            "title": "Weekly review ritual",
            "content": "Friday reflection should produce next actions.",
            "item_type": "playbook",
            "domain": "growth",
            "para_area": "areas",
            "tags": ["review", "ritual"],
            "importance": 4,
        },
    )

    assert r.status_code == 201
    assert r.json()["title"] == "Weekly review ritual"
    inserted = table.insert.call_args.args[0]
    assert inserted["user_id"] == TEST_USER.id
    assert inserted["captured_at"]


def test_list_knowledge_filters_by_query(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(
        data=[
            SAMPLE_KNOWLEDGE,
            {**SAMPLE_KNOWLEDGE, "id": "knowledge-2", "title": "ISA allowance notes", "domain": "finance", "tags": ["tax"]},
        ]
    )

    r = client.get("/api/v1/knowledge?q=ritual&domain=growth")

    assert r.status_code == 200
    assert [row["id"] for row in r.json()] == ["knowledge-1"]
    table.eq.assert_any_call("user_id", TEST_USER.id)
    table.eq.assert_any_call("domain", "growth")


def test_knowledge_graph_returns_items_and_links(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.side_effect = [
        MagicMock(data=[{"id": "knowledge-1", "title": "Weekly review ritual"}]),
        MagicMock(data=[{"from_item_id": "knowledge-1", "to_item_id": "knowledge-2", "relation_type": "supports"}]),
    ]

    r = client.get("/api/v1/knowledge/graph")

    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 1
    assert len(data["links"]) == 1


def test_update_knowledge_item_rejects_empty_payload(client):
    r = client.put("/api/v1/knowledge/knowledge-1", json={})

    assert r.status_code == 400


def test_create_learning_resource(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(
        data=[{"id": "resource-1", "title": "Tiny Habits", "status": "to_consume", "progress_percent": 0}]
    )

    r = client.post(
        "/api/v1/learning/resources",
        json={"title": "Tiny Habits", "resource_type": "book", "domain": "growth", "tags": ["behaviour"]},
    )

    assert r.status_code == 201
    assert r.json()["title"] == "Tiny Habits"
    assert table.insert.call_args.args[0]["user_id"] == TEST_USER.id


def test_create_decision_record(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{"id": "decision-1", "title": "Choose school pickup routine"}])

    r = client.post(
        "/api/v1/decisions",
        json={
            "title": "Choose school pickup routine",
            "domain": "family",
            "decision_type": "family",
            "options": [{"name": "Earlier pickup"}, {"name": "After club"}],
            "criteria": {"stress": 5, "child_energy": 4},
        },
    )

    assert r.status_code == 201
    assert r.json()["id"] == "decision-1"


def test_create_life_review(client, mock_supabase):
    table = mock_supabase.table.return_value
    table.execute.return_value = MagicMock(data=[{"id": "review-1", "review_type": "weekly"}])

    r = client.post(
        "/api/v1/life-reviews",
        json={
            "review_type": "weekly",
            "period_start": "2026-05-11",
            "period_end": "2026-05-17",
            "wins": ["Protected three training sessions"],
            "next_actions": ["Plan meals before Monday"],
        },
    )

    assert r.status_code == 201
    assert r.json()["review_type"] == "weekly"
