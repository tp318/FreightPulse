from pydantic import BaseModel
from typing import Optional

class Shipment(BaseModel):
    shipment_id: str
    origin_port: str
    destination_port: str
    vessel_name: str
    eta: str
    cargo_value_usd: float
    cargo_type: str
    forwarder: str
    forwarder_contact: Optional[str] = ""

class SimulateRequest(BaseModel):
    scenario: Optional[str] = "rotterdam_strike"

class BriefRequest(BaseModel):
    shipment: dict
    disruption: dict
    decision: str
    score: int