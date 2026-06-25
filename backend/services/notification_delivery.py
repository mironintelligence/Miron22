"""
Miron GROUP LLC — Bildirim Gönderimi
Öncelik sırası: Resend API → SMTP fallback
"""
from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from services.email_template import (
    wrap, gold_button, detail_row, info_card, separator,
    _BRAND, _TXT_G, _TXT_D, _FONT,
)

_REMINDERS_URL = "https://www.mironintelligence.com/reminders"


def build_reminder_email(
    lawyer_name: str,
    title: str,
    due_at_fmt: str,
    court: Optional[str],
    case_number: Optional[str],
    details: Optional[str],
    offset_label: str,
) -> tuple[str, str]:
    """Returns (subject, html_body)."""

    subject = f"⚖ Hatırlatıcı: {title}"

    rows_html = detail_row("Tarih / Saat", due_at_fmt)
    if court:
        rows_html += detail_row("Mahkeme", court)
    if case_number:
        rows_html += detail_row("Dosya No", case_number)

    body = f"""
<div style="font-size:13px;color:{_TXT_D};margin-bottom:4px;font-family:{_FONT};">Sayın</div>
<div style="font-size:23px;font-weight:800;color:#ffffff;line-height:1.2;
            font-family:{_FONT};">{lawyer_name}</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;margin-bottom:20px;font-family:{_FONT};">
  Aşağıdaki hatırlatıcınız
  <strong style="color:{_BRAND};">{offset_label}</strong> kaldı.
</div>

{info_card(title, rows_html, details or "")}

{gold_button("Takvimi Aç", _REMINDERS_URL)}
"""
    html = wrap(subject, "Hatırlatıcı", body,
                footer_href=_REMINDERS_URL, footer_link_text="hatırlatıcıları yönet")
    return subject, html


# ---------------------------------------------------------------------------
# Gönderim — Resend API önce, SMTP fallback
# ---------------------------------------------------------------------------

def send_email(to_email: str, subject: str, html: str, plain: str = "") -> bool:
    """Resend varsa Resend, yoksa SMTP ile gönderir."""
    resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if resend_key:
        return _send_via_resend(resend_key, to_email, subject, html, plain)
    return _send_via_smtp(to_email, subject, html, plain)


def _from_address() -> str:
    explicit = (os.getenv("SMTP_FROM") or "").strip()
    if explicit:
        return explicit
    return "Miron AI <bildirim@mironintelligence.com>"


def _send_via_resend(key: str, to: str, subject: str, html: str, plain: str) -> bool:
    try:
        import resend  # type: ignore
        resend.api_key = key
        resend.Emails.send({
            "from": _from_address(),
            "to": [to],
            "subject": subject,
            "html": html,
            "text": plain or subject,
        })
        return True
    except Exception as e:
        print(f"[mail] Resend hatası: {e}")
        return _send_via_smtp(to, subject, html, plain)


def _send_via_smtp(to: str, subject: str, html: str, plain: str) -> bool:
    host     = (os.getenv("SMTP_HOST") or "").strip()
    port     = int(os.getenv("SMTP_PORT", "587") or "587")
    user     = (os.getenv("SMTP_USER") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or "").strip()
    from_    = _from_address()

    if not host:
        print("[mail] SMTP yapılandırılmamış, mail atlanadı.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_
    msg["To"]      = to
    msg.attach(MIMEText(plain or subject, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.ehlo()
            if os.getenv("SMTP_STARTTLS", "true").lower() != "false":
                s.starttls()
                s.ehlo()
            if user and password:
                s.login(user, password)
            s.sendmail(from_, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"[mail] SMTP hatası: {e}")
        return False


# Legacy stub — artık gerekmiyor ama import kırmamak için bırakıldı
def send_sms(*_a, **_kw) -> bool:  return False
def send_push(*_a, **_kw) -> bool: return False
