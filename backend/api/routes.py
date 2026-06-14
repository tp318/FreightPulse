from fastapi import APIRouter
from api.state import state
from api.schemas import SimulateRequest
from signals.gdelt import fetch_gdelt
from signals.weather import fetch_weather
from mock_data import get_mock_payload
from typing import List
from api.schemas import Shipment
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()


# ─── Existing dashboard endpoints ────────────────────────────────────────────

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


# ─── Engine pipeline endpoints ────────────────────────────────────────────────

class SimulateDisruptionRequest(BaseModel):
    type: str = "strike"
    port_code: str = "NLRTM"
    description: Optional[str] = None


_PORT_NAMES = {
    "NLRTM": "Rotterdam",
    "DEHAM": "Hamburg",
    "GBFXT": "Felixstowe",
    "BEANR": "Antwerp",
    "SGSIN": "Singapore",
    "INMUN": "Mundra",
    "INJNP": "JNPT",
    "INMAA": "Chennai",
    "AEDXB": "Dubai",
}

_TYPE_TITLES = {
    "strike":     "Dockworkers union announces work stoppage",
    "attack":     "Maritime security incident reported",
    "congestion": "Severe port congestion alert",
    "weather":    "Extreme weather event impacting operations",
    "closure":    "Port closure notice issued",
}


@router.post("/api/simulate-disruption")
async def simulate_disruption(req: SimulateDisruptionRequest):
    """
    Inject a realistic mock disruption into the ingestion pipeline.
    Publishes to ingestion.news (NOT directly to disruption.detected)
    so the full detection → decision engine → LLM → call pipeline runs.
    When Kafka is offline, directly triggers the decision engine pipeline.
    """
    from kafka.producer import publish
    from api.websocket import broadcast_stage_update

    port_name = _PORT_NAMES.get(req.port_code, req.port_code)
    title = req.description or f"{port_name} port: {_TYPE_TITLES.get(req.type, 'Disruption reported')}"

    # Build a fake news article that looks like GDELT output
    fake_article = {
        "article_id": f"sim-{uuid.uuid4().hex[:8]}",
        "source":     "Simulated",
        "author":     "FreightPulse Demo",
        "title":      title,
        "content":    f"Simulated {req.type} event at {port_name} port for FreightPulse demo. "
                      f"This message was injected via the Simulate Disruption feature.",
        "url":        "",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "language":   "en",
        "region":     req.port_code[:2],
        "sentiment":  -0.95,
        "credibility_score": 0.99,
        "location":   port_name,
        # Ensure keyword match for detection
        "keywords":   [req.type, "port", "disruption", port_name.lower()],
    }

    # Reset all stage cards to idle for connected WS clients
    await broadcast_stage_update({"stage": "reset", "status": "idle", "data": {}})

    # Broadcast ingestion happening
    await broadcast_stage_update({
        "stage": "ingestion",
        "status": "active",
        "data": {
            "source": "simulated",
            "title": title,
            "port": port_name,
            "type": req.type,
        },
    })

    # Try to publish to Kafka (if Redpanda is running, consumers will also pick it up)
    try:
        publish("ingestion.news", fake_article, source="simulated")
    except Exception:
        pass

    import asyncio
    await asyncio.sleep(0.3)
    await broadcast_stage_update({
        "stage": "ingestion",
        "status": "complete",
        "data": {"items_received": 1, "source_counts": {"simulated": 1}},
    })

    await broadcast_stage_update({
        "stage": "kafka",
        "status": "active",
        "data": {"topic": "ingestion.news", "messages": 1},
    })
    await asyncio.sleep(0.2)
    await broadcast_stage_update({
        "stage": "kafka",
        "status": "complete",
        "data": {"topics_active": ["ingestion.news", "disruption.detected", "engine.stage-updates"]},
    })

    await broadcast_stage_update({
        "stage": "storage",
        "status": "active",
        "data": {},
    })
    await asyncio.sleep(0.2)
    await broadcast_stage_update({
        "stage": "storage",
        "status": "complete",
        "data": {"neo4j": "seeded-mock", "timescaledb": "seeded-mock"},
    })

    # ── Always directly trigger the full A→E decision pipeline ─────────────────
    # confluent-kafka's produce() doesn't raise when the broker is offline —
    # it just queues silently, so the consumer thread never sees the message.
    # For the demo (no Docker / Redpanda), we always spawn the pipeline directly
    # so the full 10-stage flow runs end-to-end every time Simulate is clicked.
    import threading
    from engine.alert_engine import _classify_news, _PORT_META

    # Capture request values for thread closure
    _req_type = req.type
    _req_port_code = req.port_code
    _title = title
    _port_name = port_name
    _article = fake_article

    def _direct_trigger():
        disruption = _classify_news(_article)
        if not disruption:
            # Classification fallback — build disruption from request params directly
            port_meta = _PORT_META.get(_req_port_code, {"name": _port_name, "lat": 51.90, "lon": 4.48})
            disruption = {
                "disruption_id": str(uuid.uuid4()),
                "type": _req_type,
                "severity": "high",
                "location": {
                    "port_code": _req_port_code,
                    "name": port_meta["name"],
                    "lat": port_meta["lat"],
                    "lon": port_meta["lon"],
                },
                "description": _title,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "raw_source": _article,
            }

        # Broadcast detection stage update to WS clients
        try:
            from api.websocket import broadcast_sync
            broadcast_sync({
                "stage": "detection",
                "status": "complete",
                "data": disruption,
            })
        except Exception:
            pass

        # Run the full A→E decision engine (graph query → ML → scoring → alt-routes → LLM → call)
        from engine.decision import trigger_decision_pipeline
        trigger_decision_pipeline(disruption)

    threading.Thread(target=_direct_trigger, daemon=True, name="fp-pipeline-sim").start()

    return {
        "message": "Disruption simulation injected — full A→E pipeline running",
        "article": fake_article,
    }