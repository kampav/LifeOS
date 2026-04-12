"""
Mem0 memory layer. Falls back gracefully if Mem0 unavailable.
"""
from app.config import settings
from app.observability.logging import get_logger

log = get_logger()
_mem0 = None


def get_mem0():
    global _mem0
    if _mem0 is None:
        try:
            from mem0 import MemoryClient
            _mem0 = MemoryClient(api_key=settings.MEM0_API_KEY)
        except Exception as e:
            log.warning("mem0_unavailable", error=str(e))
            _mem0 = _FallbackMemory()
    return _mem0


class _FallbackMemory:
    """No-op memory when Mem0 is not configured."""
    def search(self, query: str, user_id: str = None, limit: int = 5):
        return []

    def add(self, messages, user_id: str = None):
        pass

    def get_all(self, user_id: str = None):
        return []

    def delete(self, memory_id: str):
        pass


async def get_memories(user_id: str, query: str, limit: int = 5) -> str:
    try:
        mem0 = get_mem0()
        results = mem0.search(query, user_id=user_id, limit=limit)
        if not results:
            return "No prior memories."
        return "\n".join(f"- {r.get('memory', r)}" for r in results[:limit])
    except Exception as e:
        log.warning("mem0_search_failed", error=str(e))
        return ""


async def store_memory(user_id: str, content: str):
    try:
        mem0 = get_mem0()
        mem0.add([{"role": "assistant", "content": content}], user_id=user_id)
    except Exception as e:
        log.warning("mem0_store_failed", error=str(e))
