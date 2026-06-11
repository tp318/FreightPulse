from app.decision.optimizer import choose_best_plan
from app.decision.utility import compute_utilities


def test_utility_calculation_and_selection():
    plans = [
        {"id": 1, "scenario": "no_action", "cost_impact": 10000, "delay_impact_hours": 96, "risk_of_plan": 0.8},
        {"id": 2, "scenario": "alt_port", "cost_impact": 3000, "delay_impact_hours": 48, "risk_of_plan": 0.25},
    ]
    scored = compute_utilities(plans)
    assert all(0 <= p["utility"] <= 1 for p in scored)
    assert choose_best_plan(plans)["scenario"] == "alt_port"
