from datetime import datetime, timezone
from app.graph.pathfinder import find_alternative_paths


async def generate_scenarios(shipment, event, no_action_cost: dict, neo4j_session=None) -> list[dict]:
    blocked_ports = event.affected_ports or []
    blocked_vessels = event.affected_vessels or []
    paths = await find_alternative_paths(shipment.origin_port_code, shipment.destination_port_code, blocked_ports, blocked_vessels, datetime.now(timezone.utc), session=neo4j_session)
    plans = [{
        "scenario": "no_action",
        "cost_impact": float(no_action_cost["total"]),
        "delay_impact_hours": max(24.0, event.severity * 120),
        "risk_of_plan": min(1.0, event.severity),
        "plan_details": {"event_id": str(event.id), "impact_components": no_action_cost, "customer_impact": no_action_cost.get("customer_impact", 0)},
    }]
    labels = ["wait", "alt_port", "alt_vessel", "multimodal"]
    for i, path in enumerate(paths):
        scenario = "wait" if path["mode"] == "wait" else ("multimodal" if path["mode"] in {"rail", "road", "multimodal"} else labels[min(i, len(labels) - 1)])
        additional = float(path["total_cost"]) + (250 if scenario != "wait" else 0)
        plans.append({
            "scenario": scenario,
            "cost_impact": additional,
            "delay_impact_hours": float(path["transit_hours"]),
            "risk_of_plan": float(path["risk"]),
            "plan_details": path,
        })
    unique: dict[str, dict] = {}
    for plan in plans:
        existing = unique.get(plan["scenario"])
        if existing is None or plan["cost_impact"] + plan["delay_impact_hours"] < existing["cost_impact"] + existing["delay_impact_hours"]:
            unique[plan["scenario"]] = plan
    return list(unique.values())
