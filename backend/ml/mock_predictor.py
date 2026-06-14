"""
Mock ML Predictor — returns plausible-looking disruption impact predictions.

╔══════════════════════════════════════════════════════════════════════╗
║  SWAP POINT: Replace this module with a real trained model.          ║
║  Interface contract (must be preserved):                             ║
║    predict_disruption_impact(disruption: dict, shipment: dict)       ║
║       -> {"predicted_delay_hours": float,                            ║
║            "confidence": float,                                       ║
║            "escalation_probability": float}                          ║
╚══════════════════════════════════════════════════════════════════════╝

Current implementation uses deterministic heuristics seeded from the
disruption type + severity + shipment priority to produce varied but
reproducible outputs.
"""
import hashlib
import math


# ─── Base impact by disruption type ─────────────────────────────────────────
_BASE_DELAY_HOURS = {
    "strike":     72.0,
    "attack":     48.0,
    "congestion": 24.0,
    "weather":    18.0,
    "closure":    96.0,
}

_SEVERITY_MULTIPLIER = {
    "low":    0.5,
    "medium": 1.0,
    "high":   1.6,
}

_PRIORITY_SENSITIVITY = {
    "critical": 1.3,
    "high":     1.1,
    "medium":   0.9,
    "low":      0.7,
}

_BASE_ESCALATION = {
    "strike":     0.65,
    "attack":     0.80,
    "congestion": 0.40,
    "weather":    0.35,
    "closure":    0.70,
}


def _seeded_noise(seed_str: str, amplitude: float = 1.0) -> float:
    """
    Deterministic 'noise' in [-amplitude, +amplitude] derived from a string seed.
    Ensures results are reproducible for the same disruption/shipment pair.
    """
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    # Map to [-1, 1]
    normalized = (h % 10000) / 5000.0 - 1.0
    return normalized * amplitude


def predict_disruption_impact(disruption: dict, shipment: dict) -> dict:
    """
    Predict the impact of a disruption on a specific shipment.

    Args:
        disruption: disruption.detected envelope dict
        shipment:   shipment dict from Neo4j query

    Returns:
        {
            "predicted_delay_hours":  float,
            "confidence":             float (0-1),
            "escalation_probability": float (0-1),
        }
    """
    dtype    = disruption.get("type", "congestion")
    severity = disruption.get("severity", "medium")
    priority = shipment.get("priority", "medium")
    ship_id  = shipment.get("shipment_id", "UNKNOWN")
    dis_id   = disruption.get("disruption_id", "UNKNOWN")

    # Seed string for reproducibility
    seed = f"{dis_id}:{ship_id}"

    base_delay  = _BASE_DELAY_HOURS.get(dtype, 24.0)
    sev_mult    = _SEVERITY_MULTIPLIER.get(severity, 1.0)
    prio_sens   = _PRIORITY_SENSITIVITY.get(priority, 1.0)

    # Delay: base × severity × priority_sensitivity + noise
    delay_noise = _seeded_noise(seed + ":delay", amplitude=8.0)
    predicted_delay = max(1.0, base_delay * sev_mult * prio_sens + delay_noise)

    # Confidence: higher for better-known disruption types, capped 0.55 – 0.95
    base_conf = {"strike": 0.82, "attack": 0.75, "congestion": 0.88, "weather": 0.90, "closure": 0.78}
    conf_noise = _seeded_noise(seed + ":conf", amplitude=0.05)
    confidence = min(0.95, max(0.55, base_conf.get(dtype, 0.75) + conf_noise))

    # Escalation probability
    base_esc = _BASE_ESCALATION.get(dtype, 0.5)
    esc_noise = _seeded_noise(seed + ":esc", amplitude=0.08)
    # Critical shipments more likely to escalate (tighter SLAs)
    esc_prio_bump = 0.10 if priority == "critical" else 0.0
    escalation_prob = min(0.95, max(0.05, base_esc + esc_noise + esc_prio_bump))

    return {
        "predicted_delay_hours":  round(predicted_delay, 1),
        "confidence":              round(confidence, 3),
        "escalation_probability":  round(escalation_prob, 3),
        # Metadata for transparency
        "_model": "mock-heuristic-v1",
        "_inputs": {
            "disruption_type":     dtype,
            "severity":            severity,
            "shipment_priority":   priority,
        },
    }
