import asyncio
import random
from datetime import datetime, timedelta, timezone
import redis
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.graph.seeder import VESSELS
from app.ingestion.normalizer import normalize_and_store
from app.models.pydantic_schemas import DisruptionEventCreate


@celery_app.task(name="app.ingestion.collectors.ais_simulator.run_ais_simulator")
def run_ais_simulator() -> int:
    async def _run() -> int:
        r = redis.Redis.from_url(get_settings().REDIS_URL, decode_responses=True)
        created = 0
        async with AsyncSessionLocal() as session:
            for vessel, *_ in VESSELS:
                key = f"ais:{vessel}:deviation"
                deviation = float(r.get(key) or random.uniform(0, 60)) + random.uniform(-10, 25)
                r.set(key, max(0, deviation))
                if deviation > 80:
                    now = datetime.now(timezone.utc)
                    await normalize_and_store(session, DisruptionEventCreate(event_type="vessel_delay", source="ais_sim", raw_data={"deviation_nm": deviation}, confidence=0.8, severity=min(1, deviation / 180), start_time=now, end_time=now + timedelta(days=2), affected_vessels=[vessel]))
                    created += 1
        return created
    return asyncio.run(_run())
