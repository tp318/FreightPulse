"""
Decision Engine — triggered by every disruption.detected event.
Executes steps A→E sequentially, publishing engine.stage-updates at each step
so the frontend can visualise the pipeline live.

Steps:
  A. Graph query     — find affected shipments via Neo4j
  B. ML prediction   — predict delay/confidence/escalation per shipment
  C. Scoring         — rank by weighted risk score
  D. Alt routes      — find alternative routes avoiding disrupted port
  E. LLM reasoning   — call Anthropic to decide + generate call script
  → Calling agent    — place Twilio call
"""
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


def _broadcast(stage: str, status: str, data: Optional[dict] = None):
    """Publish engine.stage-updates and broadcast to WS clients."""
    from kafka.producer import publish

    msg = {"stage": stage, "status": status}
    if data:
        msg["data"] = data

    publish("engine.stage-updates", msg, source="decision-engine")

    # Direct WS broadcast (non-blocking)
    try:
        from api.websocket import broadcast_stage_update
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(broadcast_stage_update(msg))
        except RuntimeError:
            pass  # No event loop in this thread — WS consumer will forward Kafka msg
    except Exception:
        pass


def trigger_decision_pipeline(disruption: dict):
    """
    Entry point — called from a background thread by the detection engine.
    Runs the full A→E pipeline synchronously within the thread.
    """
    dis_id = disruption.get("disruption_id", "unknown")
    dtype  = disruption.get("type", "unknown")
    port   = disruption.get("location", {})

    logger.info(f"▶ Decision pipeline starting for disruption {dis_id} [{dtype}]")

    # ─── Step A: Graph Query ─────────────────────────────────────────────────
    _broadcast("graph-query", "active")
    time.sleep(0.5)  # give WS clients a moment to render "active"

    try:
        from db.neo4j_client import get_affected_shipments
        affected = get_affected_shipments(dis_id)

        if not affected:
            # Fall back to mock data so the pipeline still runs end-to-end
            logger.warning("No affected shipments from Neo4j — using mock data.")
            affected = _mock_affected_shipments()

        _broadcast("graph-query", "complete", {
            "affected_shipments": affected,
            "disruption_port":    port,
            "query": "MATCH (d:DisruptionEvent {id})<-[:AFFECTED_BY]-(p:Port)<-[:VIA_PORT]-(r:Route)<-[:ON_ROUTE]-(v:Vessel)<-[:ON_VESSEL]-(s:Shipment) RETURN s, v, r, p",
        })
    except Exception as e:
        logger.error(f"Step A failed: {e}")
        affected = _mock_affected_shipments()
        _broadcast("graph-query", "complete", {"affected_shipments": affected, "note": "neo4j-fallback"})

    # ─── Step B: ML Prediction ────────────────────────────────────────────────
    _broadcast("ml-prediction", "active")
    time.sleep(0.5)

    try:
        from ml.mock_predictor import predict_disruption_impact
        predictions = {}
        predictions_list = []

        for ship in affected:
            pred = predict_disruption_impact(disruption, ship)
            sid = ship.get("shipment_id", ship.get("id", "?"))
            predictions[sid] = pred
            predictions_list.append({"shipment_id": sid, **pred})

        _broadcast("ml-prediction", "complete", {
            "predictions": predictions_list,
            "model": "mock-heuristic-v1",
            "note": "MOCK MODEL — replace ml/mock_predictor.py with real trained model",
        })
    except Exception as e:
        logger.error(f"Step B failed: {e}")
        predictions = {}
        _broadcast("ml-prediction", "error", {"error": str(e)})

    # ─── Step C: Scoring & Ranking ────────────────────────────────────────────
    _broadcast("scoring", "active")
    time.sleep(0.4)

    try:
        from engine.scorer import rank_shipments
        ranked = rank_shipments(affected, predictions)

        _broadcast("scoring", "complete", {"ranked_shipments": ranked})
    except Exception as e:
        logger.error(f"Step C failed: {e}")
        ranked = affected
        _broadcast("scoring", "error", {"error": str(e)})

    # ─── Step D: Alternative Routes ───────────────────────────────────────────
    _broadcast("alt-routes", "active")
    time.sleep(0.5)

    top_shipment = ranked[0] if ranked else {}
    try:
        from db.neo4j_client import get_alt_routes

        disrupted_port = port.get("port_code", "NLRTM")
        # Determine from/to from top shipment's route
        route_name = top_shipment.get("route_name", "")
        from_port = top_shipment.get("port_code", "INMUN")

        # For demo: always use the disrupted port's alt (Antwerp as alt to Rotterdam)
        alt_port_map = {
            "NLRTM": "BEANR",  # Rotterdam → Antwerp
            "DEHAM": "BEANR",  # Hamburg → Antwerp
            "GBFXT": "NLRTM",  # Felixstowe → Rotterdam
        }
        alt_port = alt_port_map.get(disrupted_port, "BEANR")

        neo_alts = get_alt_routes(from_port, alt_port, disrupted_port)

        # Supplement with hardcoded alternatives so frontend always has data
        alternatives = neo_alts if neo_alts else _mock_alt_routes(disrupted_port)

        _broadcast("alt-routes", "complete", {
            "alternatives": alternatives,
            "disrupted_port": disrupted_port,
            "top_shipment_id": top_shipment.get("shipment_id"),
        })
    except Exception as e:
        logger.error(f"Step D failed: {e}")
        alternatives = _mock_alt_routes(port.get("port_code", "NLRTM"))
        _broadcast("alt-routes", "complete", {"alternatives": alternatives, "note": "neo4j-fallback"})

    # ─── Step E: LLM Reasoning ────────────────────────────────────────────────
    _broadcast("llm-reasoning", "active")
    time.sleep(0.3)

    llm_result = None
    try:
        llm_result = _run_llm(disruption, ranked, predictions, alternatives)
    except Exception as e:
        logger.error(f"Step E (LLM) failed: {e}")
        llm_result = _fallback_llm_result(disruption, top_shipment)
        _broadcast("llm-reasoning", "complete", {"note": "llm-unavailable-using-fallback", **llm_result})

    # ─── Calling Agent ────────────────────────────────────────────────────────
    if llm_result:
        try:
            from engine.calling_agent import place_call
            place_call(dis_id, llm_result.get("call_script", "Disruption alert. Please check the FreightPulse dashboard."))
        except Exception as e:
            logger.error(f"Calling agent failed: {e}")
            _broadcast("calling-agent", "error", {"error": str(e)})

    logger.info(f"✅ Decision pipeline complete for disruption {dis_id}")


# ─── LLM call ────────────────────────────────────────────────────────────────

def _run_llm(disruption: dict, ranked: list, predictions: dict, alternatives: list) -> dict:
    from core.config import settings

    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY not set — using fallback LLM result.")
        return _fallback_llm_result(disruption, ranked[0] if ranked else {})

    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    top = ranked[:3]  # top 3 highest-risk shipments
    top_ids = [s.get("shipment_id") for s in top]
    top_preds = [predictions.get(sid, {}) for sid in top_ids]

    prompt = f"""You are FreightPulse, an AI logistics disruption analyst.

A disruption has been detected. Based on the data below, decide what action to take
and generate a brief spoken message for the freight forwarder.

## Disruption
Type: {disruption.get('type')}
Severity: {disruption.get('severity')}
Location: {disruption.get('location', {}).get('name')} ({disruption.get('location', {}).get('port_code')})
Description: {disruption.get('description')}
Detected at: {disruption.get('detected_at')}

## Affected Shipments (ranked by risk score)
{_format_shipments(top, top_preds)}

## Alternative Routes
{_format_routes(alternatives)}

Respond ONLY with valid JSON in this exact format:
{{
  "decision": "reroute" | "hold" | "expedite" | "split-shipment",
  "rationale": "2-3 sentences explaining the decision",
  "call_script": "A 2-3 sentence natural-language brief to read to the forwarder over the phone. Should mention the disruption, the most affected shipment, and the recommended action."
}}"""

    # Stream the response
    full_text = ""
    _broadcast("llm-reasoning", "streaming", {"chunk": ""})

    with client.messages.stream(
        model="claude-sonnet-4-5",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for chunk in stream.text_stream:
            full_text += chunk
            _broadcast("llm-reasoning", "streaming", {"chunk": chunk, "accumulated": full_text})

    # Parse JSON from response
    import json, re
    try:
        # Strip any markdown code fences
        clean = re.sub(r"```json\s*|\s*```", "", full_text).strip()
        result = json.loads(clean)
    except Exception:
        result = {
            "decision": "hold",
            "rationale": full_text,
            "call_script": full_text,
        }

    _broadcast("llm-reasoning", "complete", result)
    return result


def _format_shipments(shipments: list, predictions: list) -> str:
    lines = []
    for i, (s, p) in enumerate(zip(shipments, predictions)):
        lines.append(
            f"{i+1}. {s.get('shipment_id')} | {s.get('cargo_type')} | "
            f"Value: ${s.get('value', 0):,.0f} | Priority: {s.get('priority')} | "
            f"Risk Score: {s.get('risk_score', '?')} | "
            f"Predicted delay: {p.get('predicted_delay_hours', '?')}h | "
            f"Escalation prob: {p.get('escalation_probability', '?')}"
        )
    return "\n".join(lines) if lines else "No shipments data available."


def _format_routes(alternatives: list) -> str:
    if not alternatives:
        return "No alternative routes found."
    lines = []
    for alt in alternatives[:3]:
        if isinstance(alt, dict):
            ports = alt.get("ports", [])
            if isinstance(ports, list):
                port_names = " → ".join(
                    p.get("name", p) if isinstance(p, dict) else str(p) for p in ports
                )
                lines.append(f"• {port_names} ({alt.get('hops', '?')} hops)")
            else:
                lines.append(f"• {alt}")
    return "\n".join(lines) if lines else "No alternatives available."


# ─── Fallback data ────────────────────────────────────────────────────────────

def _fallback_llm_result(disruption: dict, top_shipment: dict) -> dict:
    dtype    = disruption.get("type", "disruption")
    port     = disruption.get("location", {}).get("name", "the affected port")
    ship_id  = top_shipment.get("shipment_id", "SHP-001")
    priority = top_shipment.get("priority", "high")

    decision = "reroute" if dtype in ("strike", "closure", "congestion") else "hold"
    rationale = (
        f"A {dtype} at {port} is causing significant disruption. "
        f"Shipment {ship_id} (priority: {priority}) has the highest risk exposure. "
        f"Rerouting via an alternative port is recommended to minimise delay."
    )
    call_script = (
        f"Hello, this is FreightPulse with an urgent disruption alert. "
        f"A {dtype} has been confirmed at {port}. "
        f"Your shipment {ship_id} is at high risk — we recommend {decision.replace('-', ' ')} immediately. "
        f"Please log in to FreightPulse for full details and action options."
    )
    result = {"decision": decision, "rationale": rationale, "call_script": call_script}
    _broadcast("llm-reasoning", "complete", result)
    return result


def _mock_affected_shipments() -> list:
    return [
        {
            "shipment_id": "SHP-001",
            "cargo_type":  "Electronics",
            "value":       1850000,
            "priority":    "critical",
            "deadline":    "2026-06-22",
            "customer":    "TechCorp India",
            "vessel_name": "MSC MAYA",
            "route_name":  "Mundra → Singapore → Rotterdam",
            "port_name":   "Rotterdam",
            "forwarder_name":  "Mehta Freight Services",
            "forwarder_phone": "+91-98765-43210",
        },
        {
            "shipment_id": "SHP-002",
            "cargo_type":  "Textiles",
            "value":       720000,
            "priority":    "medium",
            "deadline":    "2026-06-28",
            "customer":    "Euro Fashion Group",
            "vessel_name": "EVER GIVEN II",
            "route_name":  "JNPT → Dubai → Hamburg",
            "port_name":   "Hamburg",
            "forwarder_name":  "TransOcean Logistics",
            "forwarder_phone": "+91-98123-45678",
        },
    ]


def _mock_alt_routes(disrupted_port: str) -> list:
    """Return hardcoded alt routes for demo when Neo4j traversal finds nothing."""
    alt_map = {
        "NLRTM": [
            {"ports": [{"code": "INMUN", "name": "Mundra", "lat": 22.84, "lon": 69.70},
                       {"code": "SGSIN", "name": "Singapore", "lat": 1.29, "lon": 103.85},
                       {"code": "BEANR", "name": "Antwerp", "lat": 51.23, "lon": 4.40}],
             "hops": 2, "est_extra_days": 1.5, "note": "Via Antwerp — 38h extra transit"},
            {"ports": [{"code": "INMUN", "name": "Mundra", "lat": 22.84, "lon": 69.70},
                       {"code": "AEDXB", "name": "Dubai", "lat": 25.20, "lon": 55.27},
                       {"code": "DEHAM", "name": "Hamburg", "lat": 53.55, "lon": 9.97}],
             "hops": 2, "est_extra_days": 3.0, "note": "Via Hamburg — 3 day delay"},
        ],
    }
    return alt_map.get(disrupted_port, [
        {"ports": [{"code": "ALT", "name": "Alternative Port", "lat": 51.23, "lon": 4.40}],
         "hops": 1, "est_extra_days": 1.0, "note": "Alternative routing available"},
    ])
