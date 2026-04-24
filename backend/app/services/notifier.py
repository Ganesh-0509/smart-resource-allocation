import asyncio
import logging
import os
from typing import List, Dict

from dotenv import load_dotenv

try:
    from twilio.rest import Client
    HAS_TWILIO = True
except ImportError:
    HAS_TWILIO = False

load_dotenv()

logger = logging.getLogger(__name__)


def _twilio_configured() -> bool:
    if not HAS_TWILIO:
        return False
    return all(
        [
            os.getenv("TWILIO_SID"),
            os.getenv("TWILIO_TOKEN"),
            os.getenv("TWILIO_FROM"),
        ]
    )


async def _send_sms(to_phone: str, message: str) -> bool:
    """Send an SMS via Twilio and report delivery attempt status."""
    if not _twilio_configured():
        logger.warning("Twilio not configured. SMS skipped for %s.", to_phone)
        logger.debug("Skipped SMS content: %s", message)
        return False

    sid = os.getenv("TWILIO_SID")
    token = os.getenv("TWILIO_TOKEN")
    from_phone = os.getenv("TWILIO_FROM")

    try:
        client = Client(sid, token)
        # Using asyncio.to_thread to avoid blocking the event loop with the Twilio SDK's sync call
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
        "Please open your dashboard to accept. - Namma Connect NGO"
    )
    return await _send_sms(volunteer_phone, message)


async def send_batch_sms(volunteers: List[Dict], task: Dict) -> Dict:
    """
    Notify multiple volunteers about an urgent task in parallel.
    """
    ward = task.get("ward") or "your area"
    title = task.get("title") or "Urgent Task"
    task_id = str(task.get("id"))
    
    message = f"Namma Connect: Urgent task in {ward} — {title}. Reply ACCEPT to take this task. Task ID: {task_id}"
    
    phones = [v.get("phone") for v in volunteers if v.get("phone")]
    if not phones:
        return {"sent": 0, "failed": 0}
        
    tasks = [_send_sms(phone, message) for phone in phones]
    results = await asyncio.gather(*tasks)
    
    sent_count = sum(1 for r in results if r)
    failed_count = len(results) - sent_count
    
    logger.info("Batch SMS sent for task %s: %d sent, %d failed", task_id, sent_count, failed_count)
    return {"sent": sent_count, "failed": failed_count}


async def send_acceptance_confirmation(volunteer_phone: str, task_title: str, ward: str) -> bool:
    """Notify the winner of an urgent task."""
    message = f"Namma Connect: You have been assigned to {task_title}. Please head to {ward} immediately."
    return await _send_sms(volunteer_phone, message)


async def send_acceptance_cancellation(phones: List[str], task_title: str) -> None:
    """Notify other volunteers that an urgent task has been taken."""
    message = f"Namma Connect: The urgent task '{task_title}' has already been assigned to another volunteer. Thank you for your readiness!"
    tasks = [_send_sms(phone, message) for phone in phones]
    await asyncio.gather(*tasks)


async def send_completion_thanks(
    volunteer_phone: str,
    volunteer_name: str,
    task_title: str,
) -> bool:
    """Send a thank-you SMS after a volunteer's task is marked completed."""
    message = (
        f"Thank you {volunteer_name}! Task '{task_title}' marked complete. "
        "Your performance score has been updated. - Namma Connect"
    )
    return await _send_sms(volunteer_phone, message)
