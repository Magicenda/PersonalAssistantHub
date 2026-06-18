import os
from celery import Celery

celery_app = Celery(
    "notification_service",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/5"),
    backend=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/5"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
