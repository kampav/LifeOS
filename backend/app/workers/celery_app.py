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
        "evening-reflection-daily": {
            "task": "app.workers.tasks.send_evening_reflections",
            "schedule": crontab(hour=21, minute=0),  # 9 PM daily
        },
        "recompute-scores-hourly": {
            "task": "app.workers.tasks.recompute_domain_scores",
            "schedule": crontab(minute=30),  # every hour at :30
        },
        "personalisation-calibration-weekly": {
            "task": "app.workers.tasks.run_weekly_personalisation_calibration",
            "schedule": crontab(hour=3, minute=0, day_of_week=1),  # Monday 3 AM UTC
        },
        "homescreen-daily-6am": {
            "task": "app.workers.tasks.regenerate_homescreen",
            "schedule": crontab(hour=6, minute=0),  # 6 AM daily
        },
        "archive-done-tasks-daily": {
            "task": "app.workers.tasks.archive_done_tasks",
            "schedule": crontab(hour=2, minute=0),  # 2 AM daily
        },
        "inbox-triage-every-4h": {
            "task": "app.workers.tasks.inbox_triage",
            "schedule": crontab(minute=0, hour="*/4"),  # every 4 hours
        },
        "medication-reminder-daily": {
            "task": "app.workers.tasks.send_medication_reminder",
            "schedule": crontab(hour=8, minute=0),  # 8 AM daily
        },
        "data-retention-monthly": {
            "task": "app.workers.tasks.run_data_retention_check",
            "schedule": crontab(hour=3, minute=0, day_of_month=1),  # 1st of each month, 3 AM
        },
    },
)
