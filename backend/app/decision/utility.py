import math
from app.core.config import get_settings


def u_cost(cost_impact: float, max_cost_impact: float) -> float:
    if max_cost_impact <= 0:
        return 1.0
    return math.exp(-max(0.0, cost_impact) / max_cost_impact)


def u_delay(delay_hours: float, max_delay: float) -> float:
    if max_delay <= 0:
        return 1.0
    return max(0.0, 1 - max(0.0, delay_hours) / max_delay)


def u_risk(risk: float) -> float:
    return max(0.0, min(1.0, 1 - risk))


def u_customer(impact: float, max_customer_impact: float) -> float:
    return u_cost(impact, max_customer_impact)


def compute_utilities(plans: list[dict]) -> list[dict]:
    weights = get_settings().decision_weights()
    max_cost = max([p.get("cost_impact", 0.0) for p in plans] + [1.0])
    max_delay = max([p.get("delay_impact_hours", 0.0) for p in plans] + [1.0])
    max_customer = max([p.get("customer_impact", p.get("cost_impact", 0.0)) for p in plans] + [1.0])
    scored: list[dict] = []
    for plan in plans:
        parts = {
            "cost": u_cost(plan.get("cost_impact", 0.0), max_cost),
            "delay": u_delay(plan.get("delay_impact_hours", 0.0), max_delay),
            "risk": u_risk(plan.get("risk_of_plan", 0.0)),
            "customer": u_customer(plan.get("customer_impact", plan.get("cost_impact", 0.0)), max_customer),
        }
        utility = weights[0] * parts["cost"] + weights[1] * parts["delay"] + weights[2] * parts["risk"] + weights[3] * parts["customer"]
        scored.append({**plan, "utility": utility, "utility_parts": parts})
    return scored
