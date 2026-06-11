import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CHAR, DateTime, Float, ForeignKey, JSON, Numeric, String, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value if isinstance(value, uuid.UUID) else uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None or isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


JsonDict = JSON().with_variant(JSONB, "postgresql")
StringList = JSON().with_variant(ARRAY(Text), "postgresql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    origin_port_code: Mapped[str] = mapped_column(String(10), nullable=False)
    destination_port_code: Mapped[str] = mapped_column(String(10), nullable=False)
    cargo_value: Mapped[float | None] = mapped_column(Numeric(15, 2))
    etd: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    vessel_name: Mapped[str | None] = mapped_column(String(100))
    carrier_name: Mapped[str | None] = mapped_column(String(100))
    current_status: Mapped[str] = mapped_column(String(20), default="active")
    forwarder_contact: Mapped[str | None] = mapped_column(String(20))
    forwarder_email: Mapped[str | None] = mapped_column(String(100))
    container_ids: Mapped[list[str] | None] = mapped_column(StringList)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    risk_scores: Mapped[list["RiskScore"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")
    recovery_plans: Mapped[list["RecoveryPlan"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")


class DisruptionEvent(Base):
    __tablename__ = "disruption_events"
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_event_confidence"),
        CheckConstraint("severity >= 0 AND severity <= 1", name="ck_event_severity"),
    )
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    raw_data: Mapped[dict | None] = mapped_column(JsonDict)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[float] = mapped_column(Float, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    affected_ports: Mapped[list[str] | None] = mapped_column(StringList)
    affected_vessels: Mapped[list[str] | None] = mapped_column(StringList)
    geometry: Mapped[str | None] = mapped_column(Text)
    merged_into: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    risk_scores: Mapped[list["RiskScore"]] = relationship(back_populates="event")


class RiskScore(Base):
    __tablename__ = "risk_scores"
    __table_args__ = (UniqueConstraint("shipment_id", "event_id", name="uq_risk_shipment_event"),)
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    delay_probability: Mapped[float] = mapped_column(Float, nullable=False)
    financial_exposure: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    shipment: Mapped[Shipment] = relationship(back_populates="risk_scores")
    event: Mapped[DisruptionEvent] = relationship(back_populates="risk_scores")


class RecoveryPlan(Base):
    __tablename__ = "recovery_plans"
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    scenario: Mapped[str] = mapped_column(String(30), nullable=False)
    cost_impact: Mapped[float] = mapped_column(Float, nullable=False)
    delay_impact_hours: Mapped[float] = mapped_column(Float, nullable=False)
    risk_of_plan: Mapped[float] = mapped_column(Float, nullable=False)
    utility: Mapped[float | None] = mapped_column(Float)
    chosen: Mapped[bool] = mapped_column(Boolean, default=False)
    plan_details: Mapped[dict | None] = mapped_column(JsonDict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    shipment: Mapped[Shipment] = relationship(back_populates="recovery_plans")


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    shipment_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(10), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
