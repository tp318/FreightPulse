from app.impact.business_impact import calculate_no_action_cost


def test_no_action_cost_components(shipment):
    cost = calculate_no_action_cost(shipment, 5)
    assert cost["demurrage"] == 250
    assert cost["detention"] == 475
    assert cost["storage"] == 350
    assert cost["sla_penalty"] == 2500
    assert cost["customer_impact"] == 250000
    assert cost["total"] == sum(v for k, v in cost.items() if k != "total")
