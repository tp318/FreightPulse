from datetime import datetime, timedelta, timezone
import pytest
from app.impact.business_impact import calculate_no_action_cost
from app.recovery.scenario_generator import generate_scenarios
from app.decision.optimizer import choose_best_plan


@pytest.mark.asyncio
async def test_recovery_flow_without_external_services(shipment, event):
    no_action = calculate_no_action_cost(shipment, 3.5, event)
    scenarios = await generate_scenarios(shipment, event, no_action, neo4j_session=None)
    chosen = choose_best_plan([{**s, "id": i} for i, s in enumerate(scenarios)])
    assert chosen["utility"] > 0.6
    assert chosen["scenario"]
    assert datetime.now(timezone.utc) < datetime.now(timezone.utc) + timedelta(days=1)
