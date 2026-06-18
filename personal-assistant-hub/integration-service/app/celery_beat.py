from celery.schedules import crontab

from app.celery_app import celery_app

celery_app.conf.beat_schedule = {
    "analyze-productivity-daily": {
        "task": "app.tasks.analyze_productivity",
        "schedule": crontab(hour=23, minute=0),
    },
    "forecast-budget-daily": {
        "task": "app.tasks.forecast_budget",
        "schedule": crontab(hour=6, minute=0),
    },
}
