import asyncio
from datetime import timedelta
from sqlalchemy import select
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.relational import DisruptionEvent


def overlaps(a: DisruptionEvent, b: DisruptionEvent) -> bool:
    a_end = a.end_time or a.start_time + timedelta(days=3)
    b_end = b.end_time or b.start_time + timedelta(days=3)
    return a.start_time <= b_end and b.start_time <= a_end


def same_entities(a: DisruptionEvent, b: DisruptionEvent) -> bool:
    return bool(set(a.affected_ports or []) & set(b.affected_ports or []) or set(a.affected_vessels or []) & set(b.affected_vessels or []))


async def fuse_events_once(session) -> int:
    events = (await session.execute(select(DisruptionEvent).where(DisruptionEvent.merged_into.is_(None)).order_by(DisruptionEvent.created_at.desc()).limit(200))).scalars().all()
    merged = 0
    used: set = set()
    for event in events:
        if event.id in used:
            continue
        duplicates = [x for x in events if x.id != event.id and x.id not in used and x.event_type == event.event_type and same_entities(event, x) and overlaps(event, x)]
        if not duplicates:
            continue
        group = [event] + duplicates
        fused = DisruptionEvent(
            event_type=event.event_type,
            source="fusion",
            raw_data={"sources": [g.source for g in group], "event_ids": [str(g.id) for g in group]},
            confidence=sum(g.confidence for g in group) / len(group),
            severity=max(g.severity for g in group),
            start_time=min(g.start_time for g in group),
            end_time=max([g.end_time or g.start_time for g in group]),
            affected_ports=sorted(set().union(*[set(g.affected_ports or []) for g in group])),
            affected_vessels=sorted(set().union(*[set(g.affected_vessels or []) for g in group])),
        )
        session.add(fused)
        await session.flush()
        for g in group:
            g.merged_into = fused.id
            used.add(g.id)
        merged += 1
    await session.commit()
    return merged


@celery_app.task(name="app.ingestion.event_fusion.fuse_recent_events")
def fuse_recent_events() -> int:
    async def _run() -> int:
        async with AsyncSessionLocal() as session:
            return await fuse_events_once(session)
    return asyncio.run(_run())
