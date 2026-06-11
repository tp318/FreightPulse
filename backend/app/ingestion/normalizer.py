from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pydantic_schemas import DisruptionEventCreate
from app.models.relational import DisruptionEvent


async def normalize_and_store(session: AsyncSession, event_in: DisruptionEventCreate) -> DisruptionEvent:
    event = DisruptionEvent(
        event_type=event_in.event_type,
        source=event_in.source,
        raw_data=event_in.raw_data,
        confidence=event_in.confidence,
        severity=event_in.severity,
        start_time=event_in.start_time,
        end_time=event_in.end_time,
        affected_ports=event_in.affected_ports,
        affected_vessels=event_in.affected_vessels,
        geometry=event_in.geometry,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event
