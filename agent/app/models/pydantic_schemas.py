import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional

# ----------------------
# Original LRIE schemas
# ----------------------

class ShipmentCreate(BaseModel):
    origin_port_code: str = Field(max_length=10)
    destination_port_code: str = Field(max_length=10)
    cargo_value: float = 0
    etd: datetime | None = None
    eta: datetime | None = None
    vessel_name: str | None = None
    carrier_name: str | None = None
    forwarder_phone: str | None = None
    forwarder_email: EmailStr | None = None
    container_ids: List[str] = Field(default_factory=list)

class ShipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    origin_port_code: str
    destination_port_code: str
    cargo_value: float | None
    etd: datetime | None
    eta: datetime | None
    vessel_name: str | None
    carrier_name: str | None
    current_status: str

class DisruptionEventCreate(BaseModel):
    event_type: str
    source: str = "manual"
    raw_data: dict = Field(default_factory=dict)
    confidence: float = Field(ge=0, le=1)
    severity: float = Field(ge=0, le=1)
    start_time: datetime
    end_time: datetime | None = None
    affected_ports: List[str] = Field(default_factory=list)
    affected_vessels: List[str] = Field(default_factory=list)
    geometry: str | None = None

class DisruptionEventOut(DisruptionEventCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime

class RiskScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    risk_score: float
    delay_probability: float
    financial_exposure: float
    confidence: float
    created_at: datetime
    event: DisruptionEventOut | None = None

class RecoveryPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    scenario: str
    cost_impact: float
    delay_impact_hours: float
    risk_of_plan: float
    utility: float | None
    chosen: bool
    plan_details: dict | None = None

class RecoveryResponse(BaseModel):
    plans: List[RecoveryPlanOut]
    chosen_plan: RecoveryPlanOut | None
    explanation: dict

class UploadResponse(BaseModel):
    shipment_ids: List[uuid.UUID]

# ----------------------
# New domain models
# ----------------------

class WeatherModel(BaseModel):
    location: str
    latitude: float
    longitude: float
    wind_speed_kmh: float
    wind_direction: int
    wave_height_m: float
    sea_state_index: int
    visibility_km: float
    precipitation_mm: float
    storm_probability: float
    cyclone_probability: float
    flood_probability: float
    temperature: float
    humidity: float
    pressure: float
    lightning_probability: float
    timestamp: str

class AISModel(BaseModel):
    track_id: str
    vessel_id: str
    latitude: float
    longitude: float
    speed_knots: float
    heading: float
    course_over_ground: float
    rate_of_turn: float
    navigational_status: str
    position_accuracy: int
    distance_from_route_nm: float
    timestamp: str

class NewsModel(BaseModel):
    article_id: str
    source: str
    author: str
    title: str
    content: str
    url: str
    published_at: str
    language: str
    region: str
    sentiment: float
    credibility_score: float

class SocialModel(BaseModel):
    platform: str
    post_id: str
    author: str
    followers: int
    text: str
    likes: int
    comments: int
    reposts: int
    engagement_rate: float
    timestamp: str

class CustomsModel(BaseModel):
    country: str
    port: str
    inspection_rate: float
    average_clearance_hours: float
    customs_delay_probability: float
    documentation_requirements: List[str]
    regulatory_changes: List[str]
    active_advisories: List[str]
    effective_date: str

class GovernmentModel(BaseModel):
    agency: str
    notice_type: str
    affected_ports: List[str]
    affected_regions: List[str]
    effective_date: str
    expiry_date: str
    description: str
    priority_level: str

class SanctionsModel(BaseModel):
    country: str
    sanction_level: int
    issuing_authority: str
    effective_date: str
    affected_goods: List[str]
    restricted_entities: List[str]
    trade_restriction_score: float

class GeopoliticalModel(BaseModel):
    country: str
    political_stability_score: float
    civil_unrest_score: float
    strike_probability: float
    terrorism_risk: float
    military_activity_score: float
    border_closure_probability: float
    risk_update_time: str

class InfrastructureModel(BaseModel):
    road_segment: str
    rail_segment: str
    bridge_segment: str
    closure_status: bool
    delay_hours: float
    cause: str
    severity: int
    estimated_recovery_time: int
    last_update: str

class CarrierModel(BaseModel):
    carrier_name: str
    carrier_id: str
    schedule_reliability: float
    historical_delay_days: float
    reroute_support: bool
    fleet_utilization: float
    on_time_performance: float
    customer_rating: float
    service_coverage: List[str]

class AlternativePortModel(BaseModel):
    port_name: str
    country: str
    latitude: float
    longitude: float
    berths_total: int
    berths_available: int
    avg_wait_hours: float
    congestion_score: float
    customs_delay_hours: float
    historical_reliability: float
    daily_throughput: float
    port_capacity: float

class FinancialModel(BaseModel):
    daily_demurrage_usd: float
    daily_detention_usd: float
    daily_storage_usd: float
    inventory_holding_cost_percent: float
    sla_penalty_per_day: float
    insurance_deductible: float
    expected_profit_margin: float
    replacement_cost: float

class CustomerModel(BaseModel):
    customer_id: str
    customer_name: str
    customer_tier: str
    annual_revenue: float
    sla_strictness: float
    response_time_hours: float
    strategic_importance: float
    historical_retention_rate: float

class HistoricalModel(BaseModel):
    port: str
    avg_delay_days: float
    max_delay_days: float
    historical_reliability: float
    weather_disruption_frequency: float
    strike_frequency: float
    congestion_frequency: float
    reroute_success_rate: float
    average_recovery_days: float

class DisruptionModel(BaseModel):
    event_id: str
    event_type: str
    event_subtype: str
    event_location: str
    event_radius_km: float
    event_start: str
    event_end: str
    event_severity: float
    source: str
    confidence: float
    affected_ports: List[str]
    affected_routes: List[str]
    affected_countries: List[str]
