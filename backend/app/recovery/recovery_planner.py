import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.decision.optimizer import mark_chosen_plan
from app.explanation.explainer import build_explanation
from app.impact.business_impact import calculate_no_action_cost
from app.models.relational import DisruptionEvent, RecoveryPlan, Shipment
from app.notification.alert_manager import send_alerts_async
from app.recovery.scenario_generator import generate_scenarios


async def generate_recovery_plans(session: AsyncSession, shipment: Shipment, event: DisruptionEvent, neo4j_session=None) -> tuple[list[RecoveryPlan], RecoveryPlan, dict]:
    expected_delay_days = max(1.0, event.severity * 5)
    no_action = calculate_no_action_cost(shipment, expected_delay_days, event)
    scenarios = await generate_scenarios(shipment, event, no_action, neo4j_session)
    plans = [RecoveryPlan(shipment_id=shipment.id, **scenario) for scenario in scenarios]
    session.add_all(plans)
    await session.flush()
    chosen = await mark_chosen_plan(session, plans)
    explanation = build_explanation(event, plans, chosen)
    await send_alerts_async(session, shipment, chosen.scenario, explanation)
    return plans, chosen, explanation


async def ensure_recovery_for_shipment(session: AsyncSession, shipment_id: uuid.UUID, neo4j_session=None) -> tuple[list[RecoveryPlan], RecoveryPlan | None, dict]:
    shipment = await session.get(Shipment, shipment_id)
    if shipment is None:
        raise ValueError("Shipment not found")
    existing = (await session.execute(select(RecoveryPlan).where(RecoveryPlan.shipment_id == shipment_id).order_by(RecoveryPlan.created_at.desc()))).scalars().all()
    if existing:
        chosen = next((p for p in existing if p.chosen), None)
        event_id = None
        for plan in existing:
            if plan.plan_details and plan.plan_details.get("event_id"):
                event_id = plan.plan_details["event_id"]
                break
        event = await session.get(DisruptionEvent, uuid.UUID(event_id)) if event_id else None
        if event is None:
            event = (await session.execute(select(DisruptionEvent).order_by(DisruptionEvent.created_at.desc()).limit(1))).scalar_one_or_none()
        explanation = build_explanation(event, existing, chosen) if chosen and event else {"reason": "Existing recovery plans returned.", "evaluated_scenarios": [p.scenario for p in existing], "chosen_scenario": chosen.scenario if chosen else None}
        return existing, chosen, explanation
    event = (await session.execute(select(DisruptionEvent).order_by(DisruptionEvent.created_at.desc()).limit(1))).scalar_one_or_none()
    if event is None:
        event = DisruptionEvent(event_type="port_congestion", source="synthetic", raw_data={}, confidence=0.5, severity=0.3, start_time=shipment.etd or shipment.created_at, affected_ports=[shipment.destination_port_code], affected_vessels=[])
        session.add(event)
        await session.flush()
    return await generate_recovery_plans(session, shipment, event, neo4j_session)
