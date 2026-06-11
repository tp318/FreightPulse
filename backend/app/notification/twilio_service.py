from twilio.rest import Client
from app.core.config import get_settings


def send_sms(to_number: str, body: str) -> str:
    settings = get_settings()
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER and to_number):
        return "skipped"
    msg = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).messages.create(from_=settings.TWILIO_FROM_NUMBER, to=to_number, body=body)
    return msg.sid
