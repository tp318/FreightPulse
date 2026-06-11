from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.decision.utility import compute_utilities
from app.models.relational import RecoveryPlan


def choose_best_plan(plan_dicts: list[dict]) -> dict:
    scored = sorted(compute_utilities(plan_dicts), key=lambda p: p["utility"], reverse=True)
    if not scored:
        raise ValueError("No plans to optimize")
    chosen = scored[0]
    if chosen["scenario"] == "no_action" and chosen["utility"] > 0.8 and len(scored) > 1 and scored[1]["utility"] > chosen["utility"] + 0.05:
        chosen = scored[1]
    return chosen


async def mark_chosen_plan(session: AsyncSession, plans: list[RecoveryPlan]) -> RecoveryPlan:
    plan_dicts = [
        {
            "id": p.id,
            "scenario": p.scenario,
            "cost_impact": p.cost_impact,
            "delay_impact_hours": p.delay_impact_hours,
            "risk_of_plan": p.risk_of_plan,
            "customer_impact": (p.plan_details or {}).get("customer_impact", p.cost_impact),
        }
        for p in plans
    ]
    chosen = choose_best_plan(plan_dicts)
    scored_by_id = {p["id"]: p for p in compute_utilities(plan_dicts)}
    await session.execute(update(RecoveryPlan).where(RecoveryPlan.shipment_id == plans[0].shipment_id).values(chosen=False))
    for plan in plans:
        plan.utility = scored_by_id[plan.id]["utility"]
        plan.chosen = plan.id == chosen["id"]
    await session.commit()
    return next(p for p in plans if p.id == chosen["id"])
