from app.core.config import get_settings


def calculate_no_action_cost(shipment, expected_delay_days: float, event=None) -> dict[str, float]:
    settings = get_settings()
    days = max(0.0, float(expected_delay_days))
    cargo_value = float(getattr(shipment, "cargo_value", 0) or 0)
    demurrage = settings.DEMURRAGE_DAILY_RATE * max(0.0, days - 3)
    detention = settings.DETENTION_DAILY_RATE * days
    storage = settings.STORAGE_DAILY_RATE * days
    sla_penalty = settings.SLA_PENALTY_PER_DAY * days
    customer_impact = cargo_value * 0.005 * days
    total = demurrage + detention + storage + sla_penalty + customer_impact
    return {
        "demurrage": demurrage,
        "detention": detention,
        "storage": storage,
        "sla_penalty": sla_penalty,
        "customer_impact": customer_impact,
        "total": total,
    }
