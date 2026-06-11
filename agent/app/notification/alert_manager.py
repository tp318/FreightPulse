import asyncio
import uuid
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.llm_summarizer.claude_client import create_forwarder_brief
from app.models.relational import Alert, Shipment
from app.notification.email_service import send_email
from app.notification.twilio_service import send_sms


async def send_alerts_async(session, shipment: Shipment, scenario: str, explanation: dict) -> list[Alert]:
    if not get_settings().NOTIFICATIONS_ENABLED:
        return []
    brief = await create_forwarder_brief(shipment, explanation)
    alerts: list[Alert] = []
    if shipment.forwarder_contact:
        body = f"ALERT: Shipment {shipment.id} recommended action: {scenario}. Brief: {brief[:80]}"
        send_sms(shipment.forwarder_contact, body)
        alerts.append(Alert(shipment_id=shipment.id, channel="sms", content=body))
    if shipment.forwarder_email:
        await send_email(shipment.forwarder_email, f"LRIE recovery plan for {shipment.id}", brief)
        alerts.append(Alert(shipment_id=shipment.id, channel="email", content=brief))
    session.add_all(alerts)
    await session.commit()
    return alerts


@celery_app.task(name="app.notification.alert_manager.send_alerts")
def send_alerts(shipment_id: str, scenario: str, explanation: dict) -> int:
    async def _run() -> int:
        async with AsyncSessionLocal() as session:
            shipment = await session.get(Shipment, uuid.UUID(shipment_id))
            if shipment is None:
                return 0
            return len(await send_alerts_async(session, shipment, scenario, explanation))
    return asyncio.run(_run())
