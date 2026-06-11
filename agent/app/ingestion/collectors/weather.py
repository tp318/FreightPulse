import asyncio
from datetime import datetime, timedelta, timezone
import httpx
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.graph.seeder import PORTS
from app.ingestion.normalizer import normalize_and_store
from app.models.pydantic_schemas import DisruptionEventCreate


@celery_app.task(name="app.ingestion.collectors.weather.collect_weather")
def collect_weather() -> int:
    async def _run() -> int:
        settings = get_settings()
        created = 0
        async with httpx.AsyncClient(timeout=12) as client, AsyncSessionLocal() as session:
            for code, _, lat, lon, *_ in PORTS:
                try:
                    res = await client.get(settings.OPEN_METEO_URL, params={"latitude": lat, "longitude": lon, "hourly": "wave_height,wind_wave_height,wind_speed_10m", "forecast_days": 2})
                    hourly = res.json().get("hourly", {})
                    wave = max(hourly.get("wave_height", [0]) or [0])
                    wind = max(hourly.get("wind_speed_10m", [0]) or [0])
                except Exception:
                    continue
                if wave > 4 or wind > 30:
                    now = datetime.now(timezone.utc)
                    severity = min(1.0, (wave / 10 + wind / 50) / 2)
                    await normalize_and_store(session, DisruptionEventCreate(event_type="severe_weather", source="weather_api", raw_data={"wave_height": wave, "wind_speed": wind}, confidence=0.85, severity=severity, start_time=now, end_time=now + timedelta(hours=48), affected_ports=[code]))
                    created += 1
        return created
    return asyncio.run(_run())
