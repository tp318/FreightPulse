"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-06-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("origin_port_code", sa.String(10), nullable=False),
        sa.Column("destination_port_code", sa.String(10), nullable=False),
        sa.Column("cargo_value", sa.Numeric(15, 2)),
        sa.Column("etd", sa.DateTime(timezone=True)),
        sa.Column("eta", sa.DateTime(timezone=True)),
        sa.Column("vessel_name", sa.String(100)),
        sa.Column("carrier_name", sa.String(100)),
        sa.Column("current_status", sa.String(20), server_default="active"),
        sa.Column("forwarder_contact", sa.String(20)),
        sa.Column("forwarder_email", sa.String(100)),
        sa.Column("container_ids", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "disruption_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("raw_data", postgresql.JSONB),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("severity", sa.Float, nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True)),
        sa.Column("affected_ports", postgresql.ARRAY(sa.Text)),
        sa.Column("affected_vessels", postgresql.ARRAY(sa.Text)),
        sa.Column("geometry", sa.Text),
        sa.Column("merged_into", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_event_confidence"),
        sa.CheckConstraint("severity >= 0 AND severity <= 1", name="ck_event_severity"),
    )
    op.create_table(
        "risk_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("disruption_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("risk_score", sa.Float, nullable=False),
        sa.Column("delay_probability", sa.Float, nullable=False),
        sa.Column("financial_exposure", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("shipment_id", "event_id", name="uq_risk_shipment_event"),
    )
    op.create_table(
        "recovery_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scenario", sa.String(30), nullable=False),
        sa.Column("cost_impact", sa.Float, nullable=False),
        sa.Column("delay_impact_hours", sa.Float, nullable=False),
        sa.Column("risk_of_plan", sa.Float, nullable=False),
        sa.Column("utility", sa.Float),
        sa.Column("chosen", sa.Boolean, server_default=sa.false()),
        sa.Column("plan_details", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(10), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("recovery_plans")
    op.drop_table("risk_scores")
    op.drop_table("disruption_events")
    op.drop_table("shipments")
