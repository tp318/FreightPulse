import asyncio
import random
from datetime import date, datetime, timedelta, timezone
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.graph.seeder import PORTS
from app.ingestion.normalizer import normalize_and_store
from app.models.pydantic_schemas import DisruptionEventCreate


@celery_app.task(name="app.ingestion.collectors.congestion_sim.run_congestion_simulator")
def run_congestion_simulator() -> int:
    async def _run() -> int:
        created = 0
        today = date.today().isoformat()
        async with AsyncSessionLocal() as session:
            for code, *_ in PORTS:
                rng = random.Random(f"{code}:{today}")
                factor = max(0, min(1, rng.gauss(0.3, 0.1)))
                if factor > 0.5:
                    now = datetime.now(timezone.utc)
                    await normalize_and_store(session, DisruptionEventCreate(event_type="port_congestion", source="congestion_sim", raw_data={"factor": factor}, confidence=0.75, severity=factor, start_time=now, end_time=now + timedelta(hours=12), affected_ports=[code]))
                    created += 1
        return created
    return asyncio.run(_run())
