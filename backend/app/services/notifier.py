import asyncio
import logging
import os

from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

logger = logging.getLogger(__name__)


def _twilio_configured() -> bool:
    return all(
        [
            os.getenv("TWILIO_SID"),
            os.getenv("TWILIO_TOKEN"),
            os.getenv("TWILIO_FROM"),
        ]
    )


async def _send_sms(to_phone: str, message: str) -> bool:
    """Send an SMS via Twilio, or print in development if Twilio is not configured."""
    if not _twilio_configured():
        print(f"[SMS-DEV] To: {to_phone} | Message: {message}")
        logger.info("Twilio not configured. Printed SMS to console instead.")
        return True

    sid = os.getenv("TWILIO_SID")
    token = os.getenv("TWILIO_TOKEN")
    from_phone = os.getenv("TWILIO_FROM")

    try:
        client = Client(sid, token)
        await asyncio.to_thread(
            client.messages.create,
            to=to_phone,
            from_=from_phone,
            body=message,
        )
        logger.info("SMS sent successfully to %s", to_phone)
        return True
    except Exception as exc:
        logger.error("Failed to send SMS to %s: %s", to_phone, exc, exc_info=True)
        return False


async def send_assignment_sms(
    volunteer_phone: str,
    volunteer_name: str,
    task_title: str,
    ward: str,
    task_id: str,
) -> bool:
    """Notify a volunteer that a new task has been assigned."""
    message = (
        f"Hello {volunteer_name}! A new task needs your help in {ward}: {task_title}. "
        "Please open your dashboard to accept. - JanaNaadi NGO"
    )

    sent = await _send_sms(volunteer_phone, message)
    if sent:
        logger.info("Assignment notification handled for task_id=%s", task_id)
    return sent


async def send_completion_thanks(
    volunteer_phone: str,
    volunteer_name: str,
    task_title: str,
) -> bool:
    """Send a thank-you SMS after a volunteer's task is marked completed."""
    message = (
        f"Thank you {volunteer_name}! Task '{task_title}' marked complete. "
        "Your performance score has been updated. - JanaNaadi"
    )

    return await _send_sms(volunteer_phone, message)
