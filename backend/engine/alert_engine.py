"""
Disruption Detection Engine — standing Kafka consumer that classifies
incoming ingestion messages and emits disruption.detected events.

Classifiers:
  - News:            keyword + location match
  - Weather:         wind_speed > 55 km/h OR wave_height > 4m
  - Port congestion: avg_wait_hours > 24
  - AIS:             distance_from_route_nm > 30

When a disruption is detected it:
  1. Publishes to `disruption.detected`
  2. Writes a DisruptionEvent node to Neo4j
  3. Publishes engine.stage-updates {stage: "detection", status: "complete"}
  4. Triggers the decision engine pipeline
"""
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ─── Keyword → disruption type mapping ───────────────────────────────────────
_KEYWORD_MAP = {
    "strike":       "strike",
    "union":        "strike",
    "labor":        "strike",
    "labour":       "strike",
    "stoppage":     "strike",
    "walkout":      "strike",
    "houthi":       "attack",
    "missile":      "attack",
    "attack":       "attack",
    "piracy":       "attack",
    "blockade":     "closure",
    "closure":      "closure",
    "closed":       "closure",
    "congestion":   "congestion",
    "delay":        "congestion",
    "disruption":   "congestion",
}

_KNOWN_PORT_CODES = {
    "rotterdam":  "NLRTM",
    "hamburg":    "DEHAM",
    "felixstowe": "GBFXT",
    "antwerp":    "BEANR",
    "singapore":  "SGSIN",
    "mundra":     "INMUN",
    "jnpt":       "INJNP",
    "chennai":    "INMAA",
    "dubai":      "AEDXB",
}

_PORT_META = {
    "NLRTM": {"name": "Rotterdam",  "lat": 51.90, "lon": 4.48},
    "DEHAM": {"name": "Hamburg",    "lat": 53.55, "lon": 9.97},
    "GBFXT": {"name": "Felixstowe", "lat": 51.96, "lon": 1.35},
    "BEANR": {"name": "Antwerp",    "lat": 51.23, "lon": 4.40},
    "SGSIN": {"name": "Singapore",  "lat": 1.29,  "lon": 103.85},
    "INMUN": {"name": "Mundra",     "lat": 22.84, "lon": 69.70},
    "INJNP": {"name": "JNPT",       "lat": 18.95, "lon": 72.95},
    "INMAA": {"name": "Chennai",    "lat": 13.08, "lon": 80.27},
    "AEDXB": {"name": "Dubai",      "lat": 25.20, "lon": 55.27},
}


def _classify_news(payload: dict):
    title = (payload.get("title") or "").lower()
    content = (payload.get("content") or "").lower()
    text = title + " " + content

    disruption_type = None
    for kw, dtype in _KEYWORD_MAP.items():
        if kw in text:
            disruption_type = dtype
            break

    if disruption_type is None:
        return None

    # Location match
    port_code = None
    for port_name, code in _KNOWN_PORT_CODES.items():
        if port_name in text:
            port_code = code
            break

    if port_code is None:
        # Try the location field
        loc = (payload.get("location") or "").lower()
        for port_name, code in _KNOWN_PORT_CODES.items():
            if port_name in loc:
                port_code = code
                break

    if port_code is None:
        return None

    severity = "high" if disruption_type in ("attack", "strike") else "medium"
    port_meta = _PORT_META.get(port_code, {"name": port_code, "lat": 0, "lon": 0})

    return {
        "disruption_id": str(uuid.uuid4()),
        "type": disruption_type,
        "severity": severity,
        "location": {
            "port_code": port_code,
            "name": port_meta["name"],
            "lat": port_meta["lat"],
            "lon": port_meta["lon"],
        },
        "description": payload.get("title", "Disruption detected from news feed"),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "raw_source": payload,
    }


def _classify_weather(payload: dict):
    wind = payload.get("wind_speed_kmh", 0)
    wave = payload.get("wave_height_m", 0)

    if wind < 55 and wave < 4:
        return None

    location_name = payload.get("location", "Unknown").replace("Port of ", "")
    port_code = _KNOWN_PORT_CODES.get(location_name.lower())

    if port_code is None:
        return None

    port_meta = _PORT_META.get(port_code, {"name": location_name, "lat": 0, "lon": 0})
    severity = "high" if wind > 80 or wave > 6 else "medium"

    return {
        "disruption_id": str(uuid.uuid4()),
        "type": "weather",
        "severity": severity,
        "location": {
            "port_code": port_code,
            "name": port_meta["name"],
            "lat": port_meta["lat"],
            "lon": port_meta["lon"],
        },
        "description": (
            f"Severe weather at {location_name}: "
            f"winds {wind} km/h, waves {wave}m"
        ),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "raw_source": payload,
    }


def _classify_port_congestion(payload: dict):
    avg_wait = payload.get("avg_wait_hours", 0)
    if avg_wait <= 24:
        return None

    port_code = payload.get("port_code")
    port_name = payload.get("port_name", port_code)

    if port_code not in _PORT_META:
        return None

    port_meta = _PORT_META[port_code]
    severity = "high" if avg_wait > 48 else "medium"

    return {
        "disruption_id": str(uuid.uuid4()),
        "type": "congestion",
        "severity": severity,
        "location": {
            "port_code": port_code,
            "name": port_name,
            "lat": port_meta["lat"],
            "lon": port_meta["lon"],
        },
        "description": (
            f"Port congestion at {port_name}: "
            f"avg wait {avg_wait:.1f}h (threshold: 24h)"
        ),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "raw_source": payload,
    }


def _classify_ais(payload: dict):
    distance_nm = payload.get("distance_from_route_nm", 0)
    if distance_nm <= 30:
        return None

    vessel_name = payload.get("vessel_name", "Unknown Vessel")
    # Determine disruption type heuristically
    # Large deviation (>60nm) → likely attack/closure; smaller → inspection/closure
    dtype = "attack" if distance_nm > 60 else "closure"

    return {
        "disruption_id": str(uuid.uuid4()),
        "type": dtype,
        "severity": "high" if distance_nm > 60 else "medium",
        "location": {
            "port_code": "OPEN_SEA",
            "name": f"{vessel_name} position",
            "lat": payload.get("lat", 0),
            "lon": payload.get("lon", 0),
        },
        "description": (
            f"AIS anomaly: {vessel_name} is {distance_nm}nm off expected route"
        ),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "raw_source": payload,
    }


# ─── Deduplication — avoid flooding on same event ────────────────────────────
_recent_disruptions: list = []  # stores (type, port_code, timestamp)
_COOLDOWN_SECONDS = 300         # 5 minutes per type+port combo


def _is_duplicate(dtype: str, port_code: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    for entry in list(_recent_disruptions):
        if entry["type"] == dtype and entry["port"] == port_code:
            if now - entry["ts"] < _COOLDOWN_SECONDS:
                return True
            _recent_disruptions.remove(entry)
    return False


def _register_disruption(dtype: str, port_code: str):
    _recent_disruptions.append(
        {"type": dtype, "port": port_code, "ts": datetime.now(timezone.utc).timestamp()}
    )


def _emit_disruption(disruption: dict):
    """Publish disruption.detected and engine.stage-updates, write to Neo4j."""
    from kafka.producer import publish
    from db.neo4j_client import write_disruption_event
    from api.state import state

    port_code = disruption["location"].get("port_code", "UNKNOWN")
    dtype = disruption["type"]

    if _is_duplicate(dtype, port_code):
        logger.debug(f"Skipping duplicate disruption: {dtype} @ {port_code}")
        return

    _register_disruption(dtype, port_code)

    logger.info(
        f"🚨 Disruption detected: [{dtype.upper()}] @ {disruption['location']['name']} "
        f"severity={disruption['severity']} id={disruption['disruption_id']}"
    )

    # Publish disruption.detected
    publish("disruption.detected", disruption, source="detector")

    # Write to Neo4j
    try:
        write_disruption_event(disruption)
    except Exception as e:
        logger.warning(f"Neo4j write failed: {e}")

    # Publish engine stage update
    publish(
        "engine.stage-updates",
        {
            "stage": "detection",
            "status": "complete",
            "data": disruption,
        },
        source="detector",
    )

    # Also broadcast to WS clients directly (for immediate UI update)
    try:
        from api.websocket import broadcast_sync
        broadcast_sync({
            "stage": "detection",
            "status": "complete",
            "data": disruption,
        })
    except Exception:
        pass

    # Trigger decision engine in background
    try:
        from engine.decision import trigger_decision_pipeline
        import threading
        threading.Thread(
            target=trigger_decision_pipeline,
            args=(disruption,),
            daemon=True,
        ).start()
    except Exception as e:
        logger.error(f"Decision engine trigger failed: {e}")


# ─── Message handlers (called by Kafka consumer thread) ──────────────────────

def handle_news(envelope: dict):
    payload = envelope.get("payload", {})
    disruption = _classify_news(payload)
    if disruption:
        _emit_disruption(disruption)


def handle_weather(envelope: dict):
    payload = envelope.get("payload", {})
    disruption = _classify_weather(payload)
    if disruption:
        _emit_disruption(disruption)


def handle_port_congestion(envelope: dict):
    payload = envelope.get("payload", {})
    disruption = _classify_port_congestion(payload)
    if disruption:
        _emit_disruption(disruption)


def handle_ais(envelope: dict):
    payload = envelope.get("payload", {})
    disruption = _classify_ais(payload)
    if disruption:
        _emit_disruption(disruption)


# ─── Start consumer threads ───────────────────────────────────────────────────

_consumer_threads = []


def start_detection_consumers(brokers: str):
    from kafka.consumer import start_consumer

    consumers = [
        (["ingestion.news"],             "fp-detector-news",        handle_news),
        (["ingestion.weather"],          "fp-detector-weather",     handle_weather),
        (["ingestion.port-congestion"],  "fp-detector-congestion",  handle_port_congestion),
        (["ingestion.ais"],              "fp-detector-ais",         handle_ais),
    ]

    for topics, group_id, handler in consumers:
        t = start_consumer(topics, group_id, handler, brokers)
        _consumer_threads.append(t)
        logger.info(f"Detection consumer started: {group_id} → {topics}")

    logger.info("🔍 Disruption detection engine running.")


def stop_detection_consumers():
    for t in _consumer_threads:
        t.stop()
    _consumer_threads.clear()
