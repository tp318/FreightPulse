"""
Shipment risk scorer — combines ML predictions with shipment attributes
into a single weighted risk score, with per-factor breakdown for UI display.

Formula:
  risk_score = (
    w1 * priority_weight(shipment.priority)         # urgency of shipment
  + w2 * normalize_value(shipment.value)            # cargo value
  + w3 * normalize_delay(predicted_delay_hours)     # ML delay prediction
  + w4 * escalation_probability                     # ML escalation risk
  + w5 * deadline_proximity_factor(deadline)        # how soon is the deadline
  ) * 100 (scaled to 0-100)
"""
from datetime import datetime, timezone


# ─── Weights (sum = 1.0) ─────────────────────────────────────────────────────
W = {
    "priority":              0.25,
    "value":                 0.20,
    "delay":                 0.25,
    "escalation":            0.15,
    "deadline_proximity":    0.15,
}

_PRIORITY_WEIGHTS = {
    "critical": 1.0,
    "high":     0.75,
    "medium":   0.50,
    "low":      0.25,
}

_MAX_VALUE = 5_000_000       # USD — normalise cargo value
_MAX_DELAY = 120.0           # hours — normalise predicted delay


def _normalize(value: float, max_value: float) -> float:
    """Clamp and normalize to [0, 1]."""
    return min(1.0, max(0.0, value / max_value))


def _deadline_proximity(deadline_str: str) -> float:
    """
    Returns 0-1 score where 1 = deadline is today, 0 = deadline is > 30 days away.
    """
    if not deadline_str:
        return 0.5
    try:
        deadline = datetime.strptime(deadline_str, "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
        now = datetime.now(timezone.utc)
        days_remaining = (deadline - now).days
        if days_remaining <= 0:
            return 1.0
        if days_remaining >= 30:
            return 0.0
        return 1.0 - (days_remaining / 30.0)
    except Exception:
        return 0.5


def score_shipment(shipment: dict, prediction: dict) -> dict:
    """
    Score a single shipment given ML prediction output.

    Returns the shipment dict augmented with:
      - risk_score (0-100)
      - score_breakdown (dict of factor → contribution)
    """
    priority_score   = _PRIORITY_WEIGHTS.get(shipment.get("priority", "medium"), 0.5)
    value_score      = _normalize(shipment.get("value", 0), _MAX_VALUE)
    delay_score      = _normalize(prediction.get("predicted_delay_hours", 0), _MAX_DELAY)
    escalation_score = prediction.get("escalation_probability", 0)
    deadline_score   = _deadline_proximity(shipment.get("deadline", ""))

    weighted = (
        W["priority"]           * priority_score
        + W["value"]            * value_score
        + W["delay"]            * delay_score
        + W["escalation"]       * escalation_score
        + W["deadline_proximity"] * deadline_score
    )

    risk_score = round(weighted * 100, 1)

    return {
        **shipment,
        "prediction": prediction,
        "risk_score": risk_score,
        "score_breakdown": {
            "priority":           {"weight": W["priority"],           "raw": round(priority_score, 3),   "contribution": round(W["priority"]           * priority_score   * 100, 1)},
            "value":              {"weight": W["value"],              "raw": round(value_score, 3),      "contribution": round(W["value"]              * value_score      * 100, 1)},
            "delay":              {"weight": W["delay"],              "raw": round(delay_score, 3),      "contribution": round(W["delay"]              * delay_score      * 100, 1)},
            "escalation":         {"weight": W["escalation"],         "raw": round(escalation_score, 3), "contribution": round(W["escalation"]         * escalation_score * 100, 1)},
            "deadline_proximity": {"weight": W["deadline_proximity"], "raw": round(deadline_score, 3),   "contribution": round(W["deadline_proximity"] * deadline_score   * 100, 1)},
        },
    }


def rank_shipments(shipments: list, predictions: dict) -> list:
    """
    Score and rank a list of shipments.

    Args:
        shipments:   list of shipment dicts (from Neo4j)
        predictions: dict of shipment_id → prediction dict (from ML module)

    Returns:
        List of scored shipments sorted descending by risk_score.
    """
    scored = []
    for ship in shipments:
        sid = ship.get("shipment_id", "")
        pred = predictions.get(sid, {
            "predicted_delay_hours": 24.0,
            "confidence": 0.70,
            "escalation_probability": 0.50,
        })
        scored.append(score_shipment(ship, pred))

    return sorted(scored, key=lambda x: x["risk_score"], reverse=True)
