from celery import Celery
from celery.schedules import crontab
from app.core.config import get_settings

settings = get_settings()
celery_app = Celery("lrie", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.timezone = "UTC"
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.beat_schedule = {
    "gdelt_collector_15m": {"task": "app.ingestion.collectors.gdelt.collect_gdelt", "schedule": crontab(minute="*/15")},
    "weather_collector_3h": {"task": "app.ingestion.collectors.weather.collect_weather", "schedule": crontab(minute=0, hour="*/3")},
    "ais_simulator_1h": {"task": "app.ingestion.collectors.ais_simulator.run_ais_simulator", "schedule": crontab(minute=5)},
    "congestion_simulator_2h": {"task": "app.ingestion.collectors.congestion_sim.run_congestion_simulator", "schedule": crontab(minute=10, hour="*/2")},
    "event_fusion_30m": {"task": "app.ingestion.event_fusion.fuse_recent_events", "schedule": crontab(minute="*/30")},
}
celery_app.autodiscover_tasks(["app.ingestion.collectors", "app.risk", "app.notification"])
