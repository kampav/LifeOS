from app.workers.celery_app import celery_app
from app.observability.logging import get_logger
import asyncio

log = get_logger()


def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.send_daily_briefs", bind=True, max_retries=3)
def send_daily_briefs(self):
    """Send 7 AM daily brief to all active users."""
    from app.db.client import get_supabase
    from app.services.review_service import generate_daily_brief

    log.info("daily_brief_task_started")
    try:
        sb = get_supabase()
        users = sb.table("profiles").select("id").eq("onboarding_completed", True).execute()
        for user in (users.data or []):
            run_async(generate_daily_brief(user["id"]))
        log.info("daily_briefs_sent", count=len(users.data or []))
    except Exception as exc:
        log.error("daily_brief_task_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.workers.tasks.generate_weekly_reviews", bind=True, max_retries=2)
def generate_weekly_reviews(self):
    """Sunday 6 PM weekly review generation."""
    from app.db.client import get_supabase
    from app.services.review_service import generate_weekly_review

    log.info("weekly_review_task_started")
    try:
        sb = get_supabase()
        users = sb.table("profiles").select("id,subscription_tier").eq("onboarding_completed", True).execute()
        for user in (users.data or []):
            # Free users get weekly review, paid get more
            run_async(generate_weekly_review(user["id"]))
        log.info("weekly_reviews_generated", count=len(users.data or []))
    except Exception as exc:
        log.error("weekly_review_task_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="app.workers.tasks.recompute_domain_scores")
def recompute_domain_scores():
    """Hourly score recomputation — invalidates Redis cache."""
    from app.security.rate_limiter import get_redis
    import asyncio

    async def clear_score_caches():
        r = get_redis()
        keys = await r.keys("score:*")
        if keys:
            await r.delete(*keys)

    run_async(clear_score_caches())
    log.info("score_caches_cleared")
