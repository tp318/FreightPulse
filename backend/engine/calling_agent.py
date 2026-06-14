"""
Calling Agent — places an outbound phone call via Twilio.
Uses the LLM-generated call_script from the decision engine.

TwiML is served by /twiml/brief/{disruption_id} (see api/twiml_routes.py).
"""
import logging

logger = logging.getLogger(__name__)


def place_call(disruption_id: str, call_script: str):
    """
    Initiate an outbound Twilio call to USER_PHONE_NUMBER.
    Stores call_script in Redis so the TwiML endpoint can serve it.
    """
    from core.config import settings
    from kafka.producer import publish

    publish("engine.stage-updates", {
        "stage": "calling-agent",
        "status": "active",
        "data": {"disruption_id": disruption_id},
    }, source="calling-agent")

    # Store call script in Redis (in-memory fallback if Redis is unavailable)
    _store_call_script(disruption_id, call_script)

    if not all([
        settings.twilio_account_sid,
        settings.twilio_auth_token,
        settings.twilio_phone_number,
        settings.user_phone_number,
    ]):
        logger.warning(
            "Twilio credentials not configured — skipping phone call. "
            "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, "
            "USER_PHONE_NUMBER in .env to enable."
        )
        publish("engine.stage-updates", {
            "stage": "calling-agent",
            "status": "complete",
            "data": {
                "call_sid": "DEMO-NO-CREDENTIALS",
                "status": "skipped",
                "reason": "Twilio credentials not configured",
                "call_script": call_script,
            },
        }, source="calling-agent")
        return

    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

        twiml_url = f"{settings.twiml_base_url}/twiml/brief/{disruption_id}"
        call = client.calls.create(
            to=settings.user_phone_number,
            from_=settings.twilio_phone_number,
            url=twiml_url,
            method="GET",
        )

        logger.info(
            f"📞 Twilio call initiated: SID={call.sid} "
            f"to={settings.user_phone_number} status={call.status}"
        )

        publish("engine.stage-updates", {
            "stage": "calling-agent",
            "status": "complete",
            "data": {
                "call_sid": call.sid,
                "status": call.status,
                "to": settings.user_phone_number,
                "call_script": call_script,
            },
        }, source="calling-agent")

    except ImportError:
        logger.error("twilio package not installed. Run: pip install twilio")
        publish("engine.stage-updates", {
            "stage": "calling-agent",
            "status": "error",
            "data": {"error": "twilio package not installed"},
        }, source="calling-agent")
    except Exception as e:
        logger.error(f"Twilio call failed: {e}")
        publish("engine.stage-updates", {
            "stage": "calling-agent",
            "status": "error",
            "data": {"error": str(e), "call_script": call_script},
        }, source="calling-agent")


# ─── Call script storage (Redis with in-memory fallback) ─────────────────────

_in_memory_store: dict = {}


def _store_call_script(disruption_id: str, call_script: str):
    """Store call script keyed by disruption_id for TwiML serving."""
    _in_memory_store[disruption_id] = call_script
    try:
        import redis
        from core.config import settings
        r = redis.from_url(settings.redis_url)
        r.setex(f"call_script:{disruption_id}", 3600, call_script)
    except Exception as e:
        logger.debug(f"Redis store failed (using in-memory): {e}")


def get_call_script(disruption_id: str) -> str:
    """Retrieve call script for a given disruption ID."""
    # Try Redis first
    try:
        import redis
        from core.config import settings
        r = redis.from_url(settings.redis_url)
        val = r.get(f"call_script:{disruption_id}")
        if val:
            return val.decode("utf-8")
    except Exception:
        pass
    # Fall back to in-memory
    return _in_memory_store.get(disruption_id, "FreightPulse disruption alert. Please check the dashboard.")
