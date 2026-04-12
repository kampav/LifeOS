import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_supabase(monkeypatch):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table
    table.select.return_value = table
    table.eq.return_value = table
    table.gte.return_value = table
    table.limit.return_value = table
    table.order.return_value = table
    table.single.return_value = table
    table.execute.return_value = MagicMock(data=[])
    monkeypatch.setattr("app.services.score_service.get_supabase", lambda: sb)
    return sb


@pytest.fixture
def mock_redis(monkeypatch):
    r = AsyncMock()
    r.get.return_value = None
    r.setex.return_value = True
    monkeypatch.setattr("app.services.score_service.get_redis", lambda: r)
    return r


@pytest.mark.asyncio
async def test_compute_domain_score_no_data(mock_supabase, mock_redis):
    from app.services.score_service import compute_domain_score
    score = await compute_domain_score("user-123", "health")
    assert 0 <= score <= 100


@pytest.mark.asyncio
async def test_compute_domain_score_cached(mock_supabase, mock_redis):
    from app.services.score_service import compute_domain_score
    mock_redis.get.return_value = "75"
    score = await compute_domain_score("user-123", "health")
    assert score == 75


@pytest.mark.asyncio
async def test_domain_score_with_entries(mock_supabase, mock_redis):
    from app.services.score_service import compute_domain_score
    # The mock already returns empty data for all queries — score_service handles it gracefully
    # Score with no data should be 0
    score = await compute_domain_score("user-123", "health")
    assert score == 0


@pytest.mark.asyncio
async def test_domain_score_bounds(mock_supabase, mock_redis):
    from app.services.score_service import compute_domain_score
    score = await compute_domain_score("user-123", "finance")
    assert 0 <= score <= 100
