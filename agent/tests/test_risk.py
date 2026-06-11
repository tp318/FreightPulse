from app.risk.bayesian_network import LogisticsBayesianNetwork


def test_weather_near_has_material_delay_probability():
    bn = LogisticsBayesianNetwork()
    out = bn.infer({"Event_Type": "weather", "Distance_to_Port": "near", "Shipment_Urgency": "high", "Port_Importance": "hub"}, 10_000_000)
    assert 0.45 < out["delay_probability"] < 0.8
    assert out["financial_exposure"] > 1_000_000


def test_weather_far_lower_than_strike_near():
    bn = LogisticsBayesianNetwork()
    far = bn.infer({"Event_Type": "weather", "Distance_to_Port": "far", "Shipment_Urgency": "low", "Port_Importance": "minor"}, 1_000_000)
    strike = bn.infer({"Event_Type": "strike", "Distance_to_Port": "near", "Shipment_Urgency": "high", "Port_Importance": "hub"}, 1_000_000)
    assert strike["delay_probability"] > far["delay_probability"]
