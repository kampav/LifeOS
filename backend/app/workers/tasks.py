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


@celery_app.task(name="app.workers.tasks.send_evening_reflections", bind=True, max_retries=3)
def send_evening_reflections(self):
    """Send 9 PM evening reflection prompt to all active users."""
    from app.db.client import get_supabase

    log.info("evening_reflection_task_started")
    try:
        sb = get_supabase()
        users = sb.table("profiles").select("id").eq("onboarding_completed", True).execute()
        for user in (users.data or []):
            sb.table("notifications").insert({
                "user_id": user["id"],
                "type": "evening_reflection",
                "title": "Evening Reflection",
                "body": "How was your day? Rate it, log 3 wins, and prep for tomorrow.",
                "read": False,
            }).execute()
        log.info("evening_reflections_sent", count=len(users.data or []))
    except Exception as exc:
        log.error("evening_reflection_task_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.workers.tasks.regenerate_homescreen", bind=True, max_retries=2)
def regenerate_homescreen(self, user_id: str | None = None):
    """6 AM daily — pre-compute home screen panels for all users (or one user)."""
    from app.db.client import get_supabase
    import asyncio
    from app.api.v1.homescreen import _build_homescreen
    from datetime import datetime, timezone, timedelta

    log.info("homescreen_regen_started", user_id=user_id)
    try:
        sb = get_supabase()
        if user_id:
            user_ids = [user_id]
        else:
            users = sb.table("profiles").select("id").eq("onboarding_completed", True).execute()
            user_ids = [u["id"] for u in (users.data or [])]

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        now = datetime.now(timezone.utc)
        for uid in user_ids:
            try:
                data = loop.run_until_complete(_build_homescreen(uid, sb))
                sb.table("homescreen_cache").upsert({
                    "user_id": uid,
                    "today": data["today"],
                    "this_week": data["this_week"],
                    "this_month": data["this_month"],
                    "this_year": data["this_year"],
                    "generated_at": now.isoformat(),
                    "stale_after": (now + timedelta(hours=6)).isoformat(),
                }).execute()
            except Exception as e:
                log.warning("homescreen_regen_user_failed", user_id=uid, error=str(e))
        loop.close()
        log.info("homescreen_regen_done", count=len(user_ids))
    except Exception as exc:
        log.error("homescreen_regen_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.workers.tasks.archive_done_tasks")
def archive_done_tasks():
    """Daily — archive 'done' tasks older than 14 days."""
    from app.db.client import get_supabase
    from datetime import datetime, timezone, timedelta

    log.info("archive_done_tasks_started")
    try:
        sb = get_supabase()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
        result = sb.table("tasks").update({"status": "archived"}).eq("status", "done").lte("updated_at", cutoff).execute()
        count = len(result.data or [])
        log.info("archive_done_tasks_done", archived=count)
    except Exception as exc:
        log.error("archive_done_tasks_failed", error=str(exc))


@celery_app.task(name="app.workers.tasks.run_weekly_personalisation_calibration", bind=True, max_retries=2)
def run_weekly_personalisation_calibration(self):
    """Monday 3 AM UTC — analyse engagement patterns + suggest personalisation updates."""
    from app.db.client import get_supabase

    log.info("personalisation_calibration_started")
    try:
        sb = get_supabase()
        users = sb.table("profiles").select("id").eq("onboarding_completed", True).execute()
        for user in (users.data or []):
            # Fetch personalisation row
            prefs = sb.table("user_personalisation").select("*").eq("user_id", user["id"]).single().execute()
            if not prefs.data:
                continue
            # Count entries per domain in the last 7 days
            from datetime import datetime, timezone, timedelta
            since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            entries = sb.table("entries").select("domain").eq("user_id", user["id"]).gte("logged_at", since).execute()
            domain_counts: dict[str, int] = {}
            for e in (entries.data or []):
                d = e.get("domain", "")
                domain_counts[d] = domain_counts.get(d, 0) + 1
            if not domain_counts:
                continue
            # Nudge weights toward observed engagement (blend 80% old / 20% observed)
            current_weights = prefs.data.get("domain_weights", {})
            max_count = max(domain_counts.values()) or 1
            new_weights = {}
            for domain in current_weights:
                observed = domain_counts.get(domain, 0)
                bump = int((observed / max_count) * 10)
                old = current_weights.get(domain, 5)
                new_weights[domain] = max(1, min(10, int(old * 0.8 + bump * 0.2)))
            sb.table("user_personalisation").update({"domain_weights": new_weights}).eq("user_id", user["id"]).execute()
        log.info("personalisation_calibration_done", count=len(users.data or []))
    except Exception as exc:
        log.error("personalisation_calibration_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="app.workers.tasks.schedule_gcs_deletion")
def schedule_gcs_deletion(gcs_path: str):
    """
    Set a 24-hour lifecycle rule on a GCS object so it is automatically deleted.
    Called immediately after a document upload is processed.
    """
    try:
        from google.cloud import storage
        from app.config import settings
        bucket_name = getattr(settings, "GCS_BUCKET", "")
        if not bucket_name or not gcs_path:
            log.info("gcs_deletion_skipped", reason="no bucket or path configured")
            return
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(gcs_path)
        # Set custom-time so lifecycle rule triggers after 24h
        from datetime import datetime, timezone
        blob.custom_time = datetime.now(timezone.utc)
        blob.patch()
        log.info("gcs_lifecycle_set", path=gcs_path)
    except Exception as e:
        log.warning("gcs_deletion_schedule_failed", path=gcs_path, error=str(e))


@celery_app.task(name="app.workers.tasks.inbox_triage", bind=True, max_retries=2)
def inbox_triage(self):
    """
    Every 4h — fetch Gmail subject+snippet for active users with Google integration,
    classify with Gemini Flash-Lite (10 tokens max), upsert to inbox_items table.
    """
    from app.db.client import get_supabase

    log.info("inbox_triage_started")
    try:
        sb = get_supabase()
        # Find users with active Google integration
        integrations = sb.table("integrations").select("user_id").eq(
            "provider", "google"
        ).eq("status", "active").execute()

        for row in (integrations.data or []):
            user_id = row["user_id"]
            try:
                _triage_user_inbox(user_id, sb)
            except Exception as e:
                log.warning("inbox_triage_user_failed", user_id=user_id, error=str(e))

        log.info("inbox_triage_done", users=len(integrations.data or []))
    except Exception as exc:
        log.error("inbox_triage_failed", error=str(exc))
        raise self.retry(exc=exc, countdown=600)


def _triage_user_inbox(user_id: str, sb):
    """Classify up to 20 unread inbox items for one user using Gemini Flash-Lite."""
    import asyncio
    from app.services.ai_service import ai_complete

    # Fetch unread inbox items not yet categorised
    items = sb.table("inbox_items").select("id, subject, snippet").eq(
        "user_id", user_id
    ).eq("is_read", False).is_("category", "null").limit(20).execute()

    if not items.data:
        return

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for item in items.data:
        subject = item.get("subject", "")
        snippet = item.get("snippet", "")
        prompt = (
            f"Email subject: {subject[:100]}\n"
            f"Snippet: {snippet[:200]}\n"
            "Classify as one word: action | info | waiting | archive"
        )
        try:
            category = loop.run_until_complete(
                ai_complete(
                    messages=[{"role": "user", "content": prompt}],
                    intent="quick_response",
                    user_id=user_id,
                )
            ).strip().lower()
            if category not in ("action", "info", "waiting", "archive"):
                category = "unknown"
        except Exception:
            category = "unknown"

        sb.table("inbox_items").update({"category": category}).eq("id", item["id"]).execute()

    loop.close()


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
