from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "life_os",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "daily-brief-morning": {
            "task": "app.workers.tasks.send_daily_briefs",
            "schedule": crontab(hour=7, minute=0),
        },
        "weekly-review-sunday": {
            "task": "app.workers.tasks.generate_weekly_reviews",
            "schedule": crontab(hour=18, minute=0, day_of_week=0),
        },
        "recompute-scores-hourly": {
            "task": "app.workers.tasks.recompute_domain_scores",
            "schedule": crontab(minute=30),  # every hour at :30
        },
    },
)
