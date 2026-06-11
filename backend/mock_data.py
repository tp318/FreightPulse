from datetime import datetime, timezone

def get_mock_payload(location: str = "Rotterdam") -> dict:
    ts = datetime.now(timezone.utc).isoformat()
    return {
        "ais": {
            "track_id": "TRK123456",
            "vessel_id": "VSL987",
            "latitude": 51.9,
            "longitude": 4.1,
            "speed_knots": 2.1,
            "heading": 85,
            "course_over_ground": 84.5,
            "rate_of_turn": 0.0,
            "navigational_status": "Anchored",
            "position_accuracy": 1,
            "distance_from_route_nm": 12.4,
            "timestamp": ts
        },
        "social": {
            "platform": "Twitter",
            "post_id": "tw-0000001",
            "author": "@portwatch",
            "followers": 5200,
            "text": f"Delays reported near {location} port #logistics",
            "likes": 18,
            "comments": 3,
            "reposts": 1,
            "engagement_rate": 0.004,
            "timestamp": ts
        },
        "customs": {
            "country": "NL",
            "port": "RTM",
            "inspection_rate": 0.03,
            "average_clearance_hours": 6.0,
            "customs_delay_probability": 0.12,
            "documentation_requirements": ["Bill of Lading", "Packing List"],
            "regulatory_changes": [],
            "active_advisories": [],
            "effective_date": "2026-01-01"
        },
        "government": {
            "agency": "Maritime Authority",
            "notice_type": "Port Restriction",
            "affected_ports": ["RTM"],
            "affected_regions": ["EU"],
            "effective_date": "2026-06-05",
            "expiry_date": "2026-07-05",
            "description": "Disruption reported at port.",
            "priority_level": "high"
        },
        "sanctions": {
            "country": "NL",
            "sanction_level": 0,
            "issuing_authority": "UN",
            "effective_date": "2026-01-01",
            "affected_goods": [],
            "restricted_entities": [],
            "trade_restriction_score": 0.0
        },
        "geopolitical": {
            "country": "NL",
            "political_stability_score": 0.91,
            "civil_unrest_score": 0.45,
            "strike_probability": 0.72,
            "terrorism_risk": 0.02,
            "military_activity_score": 0.04,
            "border_closure_probability": 0.01,
            "risk_update_time": ts
        },
        "infrastructure": {
            "road_segment": "A1-12",
            "rail_segment": "NL-RTM-AMS",
            "bridge_segment": "Bridge-12",
            "closure_status": False,
            "delay_hours": 0.0,
            "cause": "",
            "severity": 0,
            "estimated_recovery_time": 0,
            "last_update": ts
        },
        "carrier": {
            "carrier_name": "Maersk Line",
            "carrier_id": "MAE123",
            "schedule_reliability": 0.96,
            "historical_delay_days": 0.8,
            "reroute_support": True,
            "fleet_utilization": 0.85,
            "on_time_performance": 0.94,
            "customer_rating": 4.7,
            "service_coverage": ["EU", "ASIA", "NA"]
        },
        "alternative_port": {
            "port_name": "Port of Antwerp",
            "country": "BE",
            "latitude": 51.2194,
            "longitude": 4.4025,
            "berths_total": 100,
            "berths_available": 45,
            "avg_wait_hours": 3.2,
            "congestion_score": 0.31,
            "customs_delay_hours": 2.5,
            "historical_reliability": 0.88,
            "daily_throughput": 1500.0,
            "port_capacity": 2000.0
        },
        "financial": {
            "daily_demurrage_usd": 1250.0,
            "daily_detention_usd": 800.0,
            "daily_storage_usd": 400.0,
            "inventory_holding_cost_percent": 0.15,
            "sla_penalty_per_day": 1500.0,
            "insurance_deductible": 50000.0,
            "expected_profit_margin": 0.12,
            "replacement_cost": 200000.0
        },
        "customer": {
            "customer_id": "CUST123",
            "customer_name": "Exporter",
            "customer_tier": "gold",
            "annual_revenue": 5200000.0,
            "sla_strictness": 0.95,
            "response_time_hours": 4.0,
            "strategic_importance": 0.88,
            "historical_retention_rate": 0.92
        },
        "historical": {
            "port": "RTM",
            "avg_delay_days": 1.2,
            "max_delay_days": 5.0,
            "historical_reliability": 0.87,
            "weather_disruption_frequency": 0.22,
            "strike_frequency": 0.07,
            "congestion_frequency": 0.15,
            "reroute_success_rate": 0.78,
            "average_recovery_days": 2.3
        },
        "disruption": {
            "event_id": f"EVT-{datetime.utcnow().strftime('%Y%m%d')}-001",
            "event_type": "strike",
            "event_subtype": "labor",
            "event_location": location,
            "event_radius_km": 50.0,
            "event_start": ts,
            "event_end": "",
            "event_severity": 0.78,
            "source": "GDELT",
            "confidence": 0.85,
            "affected_ports": ["RTM"],
            "affected_routes": ["RTM-HAM"],
            "affected_countries": ["NL", "DE"]
        }
    }