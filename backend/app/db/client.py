from supabase import create_client, Client
from app.config import settings
import structlog

log = structlog.get_logger()
_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        log.info("supabase_connected", url=settings.SUPABASE_URL[:30])
    return _client


def get_supabase_anon() -> Client:
    """Anon client — for auth operations only."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
