"""
FreightPulse backend — FastAPI application entry point.
Wires together: ingestion polling, Kafka consumers, Neo4j seed,
WebSocket endpoint, and all API routes.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup, clean up on shutdown."""
    from api.state import state
    from signals.gdelt import fetch_gdelt
    from signals.weather import fetch_weather
    from signals.ais_mock import ais_polling_loop
    from signals.port_congestion_mock import port_congestion_polling_loop
    from core.config import settings

    # ── Capture main event loop for WS broadcasts from threads ─────────────
    from api.websocket import set_main_loop
    set_main_loop(asyncio.get_running_loop())

    # ── Seed Neo4j graph ────────────────────────────────────────────────────
    try:
        from scripts.seed_neo4j import seed_if_empty
        seed_if_empty()
    except Exception as e:
        logger.warning(f"Neo4j seed skipped: {e}")

    # ── Start disruption detection consumers ────────────────────────────────
    try:
        from engine.alert_engine import start_detection_consumers
        start_detection_consumers(settings.kafka_brokers)
    except Exception as e:
        logger.warning(f"Detection consumers not started: {e}")

    # ── Start Kafka consumer that forwards engine.stage-updates → WebSocket ─
    try:
        from kafka.consumer import start_consumer
        from api.websocket import broadcast_stage_update

        def _ws_forwarder(envelope: dict):
            payload = envelope.get("payload", {})
            # Schedule coroutine on the event loop
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(broadcast_stage_update(payload))
            except Exception:
                pass

        start_consumer(
            ["engine.stage-updates"],
            "fp-ws-forwarder",
            _ws_forwarder,
            settings.kafka_brokers,
        )
    except Exception as e:
        logger.warning(f"WS forwarder consumer not started: {e}")

    # ── Async polling tasks ─────────────────────────────────────────────────
    async def polling_loop():
        while True:
            try:
                news = await fetch_gdelt()
                weather = await fetch_weather("Rotterdam")
                if news:
                    state["latest_news"] = news
                    state["active_signals"].append(news)
                if weather:
                    state["latest_weather"] = weather
            except Exception as e:
                logger.error(f"Polling error: {e}")
            await asyncio.sleep(60)

    tasks = [
        asyncio.create_task(polling_loop()),
        asyncio.create_task(ais_polling_loop()),
        asyncio.create_task(port_congestion_polling_loop()),
    ]

    logger.info("✅ FreightPulse backend started — all services initialised.")
    yield

    # Shutdown
    for task in tasks:
        task.cancel()
    try:
        from engine.alert_engine import stop_detection_consumers
        stop_detection_consumers()
    except Exception:
        pass
    try:
        from kafka.producer import flush
        flush()
    except Exception:
        pass
    try:
        from db.neo4j_client import close as neo4j_close
        neo4j_close()
    except Exception:
        pass
    logger.info("FreightPulse backend shut down.")


# ─── App factory ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="FreightPulse Engine API",
    version="2.0.0",
    description="Freight disruption intelligence platform with real-time pipeline",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
from api.routes import router
from api.websocket import ws_router
from api.twiml_routes import twiml_router

app.include_router(router)
app.include_router(ws_router)
app.include_router(twiml_router)


@app.get("/")
def root():
    return {
        "status": "FreightPulse backend running",
        "version": "2.0.0",
        "docs": "/docs",
        "ws": "ws://localhost:8000/ws/engine",
    }