import os
import smtplib
from email.message import EmailMessage


def send_email(to_email: str, subject: str, body: str) -> bool:
    host = (os.getenv("SMTP_HOST") or "").strip()
    port = int(os.getenv("SMTP_PORT", "0") or "0")
    user = (os.getenv("SMTP_USER") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or "").strip()
    from_email = (os.getenv("SMTP_FROM") or user).strip()

    if not host or not port or not from_email:
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(body or "")

    try:
        with smtplib.SMTP(host, port, timeout=10) as s:
            if os.getenv("SMTP_STARTTLS", "true").lower() == "true":
                s.starttls()
            if user and password:
                s.login(user, password)
            s.send_message(msg)
        return True
    except Exception:
        return False


def send_sms(to_phone: str, body: str) -> bool:
    return False


def send_push(user_id: str, title: str, message: str) -> bool:
    return False

