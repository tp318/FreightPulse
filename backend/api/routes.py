from fastapi import APIRouter
from api.state import state
from api.schemas import SimulateRequest
from signals.gdelt import fetch_gdelt
from signals.weather import fetch_weather
from mock_data import get_mock_payload
from typing import List
from api.schemas import Shipment

router = APIRouter()

@router.post("/shipments")
async def upload_shipments(shipments: List[Shipment]):
    state["shipments"] = [s.dict() for s in shipments]
    return {"message": f"{len(shipments)} shipments loaded"}

@router.get("/data")
async def get_data():
    weather = state.get("latest_weather", {}) or {}
    news = state.get("latest_news", {}) or {}

    if not weather:
        weather = await fetch_weather("Rotterdam")
        if weather:
            state["latest_weather"] = weather

    if not news or news.get("source") == "Simulated":
        live_news = await fetch_gdelt()
        if live_news:
            state["latest_news"] = live_news
            news = live_news
        elif news.get("source") == "Simulated":
            news = {}

    mock = get_mock_payload(
        location=weather.get("location", "Rotterdam").replace("Port of ", "")
    )
    return {
        "weather": weather,
        "news": news,
        **mock
    }

@router.post("/simulate")
async def simulate(req: SimulateRequest):
    from mock_data import get_mock_payload
    payload = get_mock_payload(location="Rotterdam")
    state["latest_news"] = {
        "article_id": "sim-001",
        "source": "Simulated",
        "title": "Rotterdam port strike — 72hr stoppage confirmed",
        "published_at": "2026-06-11T00:00:00Z",
        "sentiment": -0.9,
        "credibility_score": 0.99,
        "url": "",
        "language": "en",
        "region": "EU",
        "author": "Demo",
        "content": "Simulated strike event for demo purposes."
    }
    payload["disruption"]["event_severity"] = 0.95
    return {"message": "Simulated event injected", "payload": payload}

@router.get("/signals")
async def get_signals():
    return state["active_signals"]

@router.get("/alerts")
async def get_alerts():
    return state["alerts"]