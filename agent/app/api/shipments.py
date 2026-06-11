import csv
import io
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.auth import require_api_key
from app.core.database import get_session
from app.models.pydantic_schemas import RecoveryResponse, RiskScoreOut, ShipmentCreate, UploadResponse
from app.models.relational import DisruptionEvent, RecoveryPlan, RiskScore, Shipment
from app.recovery.recovery_planner import ensure_recovery_for_shipment
from app.risk.risk_scorer import calculate_risk_for_event

router = APIRouter(prefix="/shipments", tags=["shipments"], dependencies=[Depends(require_api_key)])


@router.post("/upload", response_model=UploadResponse)
async def upload_shipments(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    content = (await file.read()).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(content)))
    required = {"origin_port_code", "destination_port_code", "cargo_value", "etd", "eta", "vessel_name", "carrier_name", "forwarder_phone", "forwarder_email"}
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV contains no shipment rows")
    if not set(rows[0].keys() or set()).issuperset(required):
        missing = sorted(required - set(rows[0].keys() or []))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"CSV missing required columns: {', '.join(missing)}")
    shipments: list[Shipment] = []
    for row in rows:
        try:
            parsed = ShipmentCreate(
                origin_port_code=row["origin_port_code"].strip().upper(),
                destination_port_code=row["destination_port_code"].strip().upper(),
                cargo_value=float(row.get("cargo_value") or 0),
                etd=row.get("etd") or None,
                eta=row.get("eta") or None,
                vessel_name=row.get("vessel_name") or None,
                carrier_name=row.get("carrier_name") or None,
                forwarder_phone=row.get("forwarder_phone") or None,
                forwarder_email=row.get("forwarder_email") or None,
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid shipment row: {exc}") from exc
        shipments.append(Shipment(
            origin_port_code=parsed.origin_port_code,
            destination_port_code=parsed.destination_port_code,
            cargo_value=parsed.cargo_value,
            etd=parsed.etd,
            eta=parsed.eta,
            vessel_name=parsed.vessel_name,
            carrier_name=parsed.carrier_name,
            forwarder_contact=parsed.forwarder_phone,
            forwarder_email=str(parsed.forwarder_email) if parsed.forwarder_email else None,
            container_ids=parsed.container_ids,
        ))
    session.add_all(shipments)
    await session.commit()
    active_events = (await session.execute(select(DisruptionEvent).where(DisruptionEvent.merged_into.is_(None)))).scalars().all()
    for event in active_events:
        await calculate_risk_for_event(session, event.id)
    return UploadResponse(shipment_ids=[s.id for s in shipments])


@router.get("", response_model=list[dict])
async def list_shipments(limit: int = 20, session: AsyncSession = Depends(get_session)):
    stmt = select(Shipment).order_by(Shipment.created_at.desc()).limit(limit)
    res = await session.execute(stmt)
    shipments = res.scalars().all()
    return [
        {
            "id": str(s.id),
            "origin_port_code": s.origin_port_code,
            "destination_port_code": s.destination_port_code,
            "cargo_value": float(s.cargo_value) if s.cargo_value else 0.0,
            "etd": s.etd.isoformat() if s.etd else None,
            "eta": s.eta.isoformat() if s.eta else None,
            "vessel_name": s.vessel_name,
            "carrier_name": s.carrier_name,
            "current_status": s.current_status,
            "created_at": s.created_at.isoformat(),
        }
        for s in shipments
    ]


@router.get("/{shipment_id}/risk", response_model=list[RiskScoreOut])
async def shipment_risk(shipment_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(RiskScore)
        .where(RiskScore.shipment_id == shipment_id)
        .options(selectinload(RiskScore.event))
        .order_by(RiskScore.created_at.desc())
    )
    return (await session.execute(stmt)).scalars().all()


@router.get("/{shipment_id}/recovery", response_model=RecoveryResponse)
async def shipment_recovery(shipment_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    if await session.get(Shipment, shipment_id) is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    plans, chosen, explanation = await ensure_recovery_for_shipment(session, shipment_id)
    fresh = (await session.execute(select(RecoveryPlan).where(RecoveryPlan.shipment_id == shipment_id).order_by(RecoveryPlan.created_at.desc()))).scalars().all()
    chosen = next((p for p in fresh if p.chosen), chosen)
    return RecoveryResponse(plans=fresh, chosen_plan=chosen, explanation=explanation)
