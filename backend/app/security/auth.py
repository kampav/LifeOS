from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import settings
from app.db.client import get_supabase
import structlog

log = structlog.get_logger()
bearer = HTTPBearer()


class User:
    def __init__(self, id: str, email: str, tier: str = "free"):
        self.id = id
        self.email = email
        self.tier = tier


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> User:
    token = credentials.credentials
    try:
        supabase = get_supabase()
        user_resp = supabase.auth.get_user(token)
        if not user_resp.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        u = user_resp.user
        meta = u.user_metadata or {}
        return User(id=u.id, email=u.email, tier=meta.get("subscription_tier", "free"))
    except Exception as e:
        log.warning("auth_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


def require_tier(*tiers: str):
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.tier not in tiers:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires tier: {tiers}")
        return user
    return _check
