from itertools import product

EVENT_STATES = ["strike", "weather", "congestion", "delay"]
DISTANCE_STATES = ["near", "medium", "far"]
URGENCY_STATES = ["low", "medium", "high"]
PORT_STATES = ["hub", "regional", "minor"]
DELAY_VALUES = {"low": 0.1, "medium": 0.4, "high": 0.8}
FINANCIAL_FACTORS = {"low": 0.05, "medium": 0.15, "high": 0.30}


def event_state(event_type: str) -> str:
    if "strike" in event_type:
        return "strike"
    if "weather" in event_type or "storm" in event_type:
        return "weather"
    if "congestion" in event_type:
        return "congestion"
    return "delay"


def delay_distribution(event: str, distance: str, urgency: str) -> dict[str, float]:
    base_high = {
        "strike": {"near": 0.90, "medium": 0.55, "far": 0.22},
        "weather": {"near": 0.78, "medium": 0.35, "far": 0.10},
        "congestion": {"near": 0.62, "medium": 0.42, "far": 0.16},
        "delay": {"near": 0.72, "medium": 0.50, "far": 0.24},
    }[event][distance]
    base_high = min(0.96, base_high + {"low": -0.05, "medium": 0.0, "high": 0.07}[urgency])
    med = min(0.75, max(0.03, 0.55 - base_high / 2))
    low = max(0.01, 1 - base_high - med)
    total = low + med + base_high
    return {"low": low / total, "medium": med / total, "high": base_high / total}


def financial_distribution(event: str, port_importance: str, delay_probs: dict[str, float]) -> dict[str, float]:
    high_bias = {"strike": 0.22, "weather": 0.12, "congestion": 0.16, "delay": 0.18}[event]
    port_bias = {"hub": 0.20, "regional": 0.10, "minor": 0.03}[port_importance]
    delay_bias = delay_probs["medium"] * 0.12 + delay_probs["high"] * 0.34
    high = min(0.9, high_bias + port_bias + delay_bias)
    medium = min(0.8, 0.28 + port_bias + delay_probs["medium"] * 0.2)
    low = max(0.02, 1 - high - medium)
    total = low + medium + high
    return {"low": low / total, "medium": medium / total, "high": high / total}


class LogisticsBayesianNetwork:
    """Deterministic complete-CPT Bayesian scorer mirroring the required DAG."""

    def __init__(self) -> None:
        self.delay_cpt = {(e, d, u): delay_distribution(e, d, u) for e, d, u in product(EVENT_STATES, DISTANCE_STATES, URGENCY_STATES)}

    def infer(self, evidence: dict[str, str], cargo_value: float) -> dict:
        event = evidence["Event_Type"]
        distance = evidence["Distance_to_Port"]
        urgency = evidence["Shipment_Urgency"]
        importance = evidence["Port_Importance"]
        delay = self.delay_cpt[(event, distance, urgency)]
        financial = financial_distribution(event, importance, delay)
        delay_expected = sum(delay[k] * DELAY_VALUES[k] for k in delay)
        financial_expected = sum(financial[k] * FINANCIAL_FACTORS[k] * cargo_value for k in financial)
        return {
            "delay_distribution": delay,
            "financial_distribution": financial,
            "delay_probability": delay_expected,
            "financial_exposure": financial_expected,
        }
