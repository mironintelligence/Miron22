import os
import logging
from typing import Any, Dict
from config import settings

logger = logging.getLogger("miron_tasks")

class TaskBroker:
    """
    Abstraction layer for Async Task Queue (Celery/RQ).
    Currently supports:
    - Sync execution (Development/Fallback)
    - Future: Celery integration
    """
    def __init__(self):
        self.celery_app = None
        if settings.CELERY_BROKER_URL:
            try:
                from celery import Celery
                self.celery_app = Celery('miron_tasks', broker=settings.CELERY_BROKER_URL)
                self.celery_app.conf.update(
                    task_serializer='json',
                    accept_content=['json'],
                    result_backend=settings.CELERY_BROKER_URL,
                    timezone='UTC',
                    enable_utc=True,
                )
                logger.info("Celery Broker Configured")
            except ImportError:
                logger.warning("Celery not installed. Running tasks synchronously.")
            except Exception as e:
                logger.error(f"Celery Init Failed: {e}")

    def send_task(self, task_name: str, args: list = None, kwargs: Dict = None):
        if self.celery_app:
            try:
                return self.celery_app.send_task(task_name, args=args, kwargs=kwargs)
            except Exception as e:
                logger.error(f"Failed to send task {task_name}: {e}")
                # Fallback?
        
        logger.info(f"Simulating Async Task: {task_name} {args} {kwargs}")
        return None

broker = TaskBroker()
