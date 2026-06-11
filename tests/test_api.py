from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import create_app


def test_api_upload_disruption_risk_and_recovery_flow():
    client = TestClient(create_app())
    headers = {"X-API-Key": "test-key"}
    now = datetime.now(timezone.utc)
    csv_body = (
        "origin_port_code,destination_port_code,cargo_value,etd,eta,vessel_name,carrier_name,forwarder_phone,forwarder_email\n"
        f"INNSA,NLRTM,10000000,{now.isoformat()},{(now + timedelta(days=5)).isoformat()},TestVessel,Maersk,,ops@example.com\n"
    )

    upload = client.post(
        "/shipments/upload",
        headers=headers,
        files={"file": ("shipments.csv", csv_body, "text/csv")},
    )
    assert upload.status_code == 200, upload.text
    shipment_id = upload.json()["shipment_ids"][0]

    disruption = client.post(
        "/webhooks/disruption",
        headers=headers,
        json={
            "event_type": "severe_weather",
            "source": "manual",
            "confidence": 0.85,
            "severity": 0.7,
            "start_time": now.isoformat(),
            "end_time": (now + timedelta(days=2)).isoformat(),
            "affected_ports": ["NLRTM"],
            "affected_vessels": [],
            "raw_data": {"wave_height": 5.2},
        },
    )
    assert disruption.status_code == 200, disruption.text

    risk = client.get(f"/shipments/{shipment_id}/risk", headers=headers)
    assert risk.status_code == 200, risk.text
    assert risk.json()[0]["risk_score"] > 0

    recovery = client.get(f"/shipments/{shipment_id}/recovery", headers=headers)
    assert recovery.status_code == 200, recovery.text
    body = recovery.json()
    assert body["chosen_plan"] is not None
    assert body["chosen_plan"]["utility"] > 0.5
    assert body["explanation"]["chosen_scenario"] == body["chosen_plan"]["scenario"]


def test_api_rejects_missing_key():
    client = TestClient(create_app())
    response = client.get("/shipments/00000000-0000-0000-0000-000000000000/risk")
    assert response.status_code == 422
