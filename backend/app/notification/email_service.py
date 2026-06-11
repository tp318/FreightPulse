from email.message import EmailMessage
import aiosmtplib
from app.core.config import get_settings


async def send_email(to_email: str, subject: str, body: str) -> str:
    settings = get_settings()
    if not (settings.SMTP_HOST and to_email):
        return "skipped"
    msg = EmailMessage()
    msg["From"] = settings.SMTP_USER or "lrie@example.local"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    await aiosmtplib.send(msg, hostname=settings.SMTP_HOST, port=settings.SMTP_PORT, username=settings.SMTP_USER or None, password=settings.SMTP_PASSWORD or None, start_tls=True)
    return "sent"
