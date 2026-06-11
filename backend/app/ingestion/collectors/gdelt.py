import asyncio
from datetime import datetime, timedelta, timezone
import httpx
from textblob import TextBlob
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.ingestion.normalizer import normalize_and_store
from app.models.pydantic_schemas import DisruptionEventCreate

LOCATION_TO_PORT = {"mumbai": "INNSA", "nhava sheva": "INNSA", "chennai": "INMAA", "kolkata": "INKOL", "rotterdam": "NLRTM", "hamburg": "DEHAM", "antwerp": "BEANR", "singapore": "SGSIN", "colombo": "LKCMB", "los angeles": "USLAX", "new york": "USNYC"}
KEYWORDS = ["port strike", "vessel delay", "container shortage", "storm", "port congestion"]


def classify(title: str) -> str:
    t = title.lower()
    if "strike" in t:
        return "port_strike"
    if "storm" in t or "weather" in t:
        return "severe_weather"
    if "congestion" in t or "shortage" in t:
        return "port_congestion"
    return "vessel_delay"


@celery_app.task(name="app.ingestion.collectors.gdelt.collect_gdelt")
def collect_gdelt() -> int:
    async def _run() -> int:
        settings = get_settings()
        created = 0
        async with httpx.AsyncClient(timeout=15) as client, AsyncSessionLocal() as session:
            for keyword in KEYWORDS:
                params = {"query": keyword, "mode": "ArtList", "format": "json", "maxrecords": 10, "sort": "DateDesc"}
                try:
                    data = (await client.get(settings.GDELT_API_URL, params=params)).json()
                except Exception:
                    continue
                for article in data.get("articles", []):
                    title = article.get("title", "")
                    text = f"{title} {article.get('seendate', '')}".lower()
                    ports = [code for name, code in LOCATION_TO_PORT.items() if name in text]
                    if not ports:
                        continue
                    polarity = TextBlob(title).sentiment.polarity
                    severity = max(0.3, min(0.9, 0.6 - polarity * 0.3))
                    start = datetime.now(timezone.utc)
                    event = DisruptionEventCreate(event_type=classify(title), source="gdelt", raw_data=article, confidence=0.7, severity=severity, start_time=start, end_time=start + timedelta(days=3), affected_ports=sorted(set(ports)))
                    await normalize_and_store(session, event)
                    created += 1
        return created
    return asyncio.run(_run())
