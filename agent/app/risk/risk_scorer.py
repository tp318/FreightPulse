import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.relational import DisruptionEvent, RiskScore, Shipment
from app.risk.bayesian_network import LogisticsBayesianNetwork, event_state

PORT_IMPORTANCE = {"SGSIN": "hub", "NLRTM": "hub", "DEHAM": "hub", "BEANR": "hub", "USLAX": "hub", "INNSA": "regional", "INMAA": "regional", "INMUN": "regional"}


def urgency(cargo_value: float | None) -> str:
    value = float(cargo_value or 0)
    if value > 5_000_000:
        return "high"
    if value > 1_000_000:
        return "medium"
    return "low"


def matched_port(shipment: Shipment, event: DisruptionEvent) -> str | None:
    ports = set(event.affected_ports or [])
    if shipment.origin_port_code in ports:
        return shipment.origin_port_code
    if shipment.destination_port_code in ports:
        return shipment.destination_port_code
    return None


async def calculate_risk_for_event(session: AsyncSession, event_id: uuid.UUID) -> list[RiskScore]:
    event = await session.get(DisruptionEvent, event_id)
    if event is None:
        return []
    stmt = select(Shipment).where(Shipment.current_status == "active")
    shipments = (await session.execute(stmt)).scalars().all()
    bn = LogisticsBayesianNetwork()
    scores: list[RiskScore] = []
    for shipment in shipments:
        by_port = matched_port(shipment, event)
        by_vessel = shipment.vessel_name and shipment.vessel_name in (event.affected_vessels or [])
        if not by_port and not by_vessel:
            continue
        distance = "near" if by_vessel or by_port == shipment.origin_port_code else "medium"
        evidence = {
            "Event_Type": event_state(event.event_type),
            "Distance_to_Port": distance,
            "Shipment_Urgency": urgency(float(shipment.cargo_value or 0)),
            "Port_Importance": PORT_IMPORTANCE.get(by_port or shipment.destination_port_code, "minor"),
        }
        posterior = bn.infer(evidence, float(shipment.cargo_value or 0))
        prior_delay = 0.38
        inconsistency = abs(posterior["delay_probability"] - prior_delay)
        confidence = max(0.0, event.confidence * (1 - max(0, inconsistency - 0.25)))
        values = {
            "shipment_id": shipment.id,
            "event_id": event.id,
            "risk_score": posterior["delay_probability"] * posterior["financial_exposure"],
            "delay_probability": posterior["delay_probability"],
            "financial_exposure": posterior["financial_exposure"],
            "confidence": confidence,
        }
        if session.bind and session.bind.dialect.name == "postgresql":
            upsert = insert(RiskScore).values(**values).on_conflict_do_update(
                constraint="uq_risk_shipment_event",
                set_={k: values[k] for k in ["risk_score", "delay_probability", "financial_exposure", "confidence"]},
            ).returning(RiskScore)
            scores.append((await session.execute(upsert)).scalar_one())
            continue
        existing = (
            await session.execute(
                select(RiskScore).where(
                    RiskScore.shipment_id == shipment.id,
                    RiskScore.event_id == event.id,
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            existing = RiskScore(**values)
            session.add(existing)
        else:
            for key, value in values.items():
                setattr(existing, key, value)
        scores.append(existing)
    await session.commit()
    return scores


@celery_app.task(name="app.risk.risk_scorer.calculate_risk")
def calculate_risk(event_id: str) -> int:
    async def _run() -> int:
        async with AsyncSessionLocal() as session:
            return len(await calculate_risk_for_event(session, uuid.UUID(event_id)))
    return asyncio.run(_run())
