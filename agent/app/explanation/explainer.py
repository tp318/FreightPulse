from app.core.config import get_settings


def build_explanation(event, plans, chosen_plan) -> dict:
    weights = get_settings().decision_weights()
    evaluated = [
        {
            "scenario": p.scenario,
            "cost": p.cost_impact,
            "delay": p.delay_impact_hours,
            "risk": p.risk_of_plan,
            "utility": p.utility,
            "details": p.plan_details or {},
        }
        for p in plans
    ]
    no_action = next((p for p in plans if p.scenario == "no_action"), None)
    cost_reduction = 0.0
    if no_action and no_action.cost_impact:
        cost_reduction = max(0.0, (no_action.cost_impact - chosen_plan.cost_impact) / no_action.cost_impact * 100)
    reason = (
        f"Scenario {chosen_plan.scenario} selected with utility {chosen_plan.utility:.3f} because it offers a "
        f"{cost_reduction:.0f}% cost reduction and acceptable delay of {chosen_plan.delay_impact_hours / 24:.1f} days. "
        f"Risk level: {chosen_plan.risk_of_plan:.2f}. All factors weighted by cost={weights[0]:.2f}, "
        f"delay={weights[1]:.2f}, risk={weights[2]:.2f}, customer={weights[3]:.2f}."
    )
    return {
        "trigger_event": {
            "id": str(getattr(event, "id", "")),
            "event_type": getattr(event, "event_type", None),
            "severity": getattr(event, "severity", None),
            "affected_ports": getattr(event, "affected_ports", []) or [],
            "affected_vessels": getattr(event, "affected_vessels", []) or [],
        },
        "evaluated_scenarios": evaluated,
        "chosen_scenario": chosen_plan.scenario,
        "reason": reason,
        "full_trace": {"weights": {"cost": weights[0], "delay": weights[1], "risk": weights[2], "customer": weights[3]}, "raw_values": evaluated},
    }
