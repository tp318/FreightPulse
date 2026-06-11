from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import require_api_key
from app.core.database import get_session
from app.ingestion.normalizer import normalize_and_store
from app.models.pydantic_schemas import DisruptionEventCreate, DisruptionEventOut
from app.models.relational import DisruptionEvent
from app.risk.risk_scorer import calculate_risk_for_event

router = APIRouter(prefix="/webhooks", tags=["disruptions"], dependencies=[Depends(require_api_key)])


@router.post("/disruption", response_model=DisruptionEventOut)
async def inject_disruption(payload: DisruptionEventCreate, session: AsyncSession = Depends(get_session)):
    event = await normalize_and_store(session, payload)
    await calculate_risk_for_event(session, event.id)
    return event


@router.get("/disruptions", response_model=list[DisruptionEventOut])
async def list_disruptions(limit: int = 20, session: AsyncSession = Depends(get_session)):
    stmt = select(DisruptionEvent).order_by(DisruptionEvent.created_at.desc()).limit(limit)
    res = await session.execute(stmt)
    return res.scalars().all()
