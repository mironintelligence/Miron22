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


# ---------------------------------------------------------------------------
# HTML E-Posta Şablonu — Miron marka kimliği
# ---------------------------------------------------------------------------

_TEMPLATE = """\
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111111;border-radius:16px;overflow:hidden;border:1px solid #1e1e1e;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1400 0%,#0a0a00 100%);padding:28px 32px 20px;border-bottom:2px solid #ebac00;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <!-- Logo mark -->
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ebac00;border-radius:10px;width:38px;height:38px;text-align:center;vertical-align:middle;">
                      <span style="font-size:20px;font-weight:900;color:#000;line-height:38px;display:block;letter-spacing:-1px;">M</span>
                    </td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <div style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;">Miron</div>
                      <div style="font-size:10px;font-weight:500;color:#ebac00;letter-spacing:2px;text-transform:uppercase;">GROUP LLC</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" style="vertical-align:middle;">
                <div style="font-size:11px;color:#555;letter-spacing:0.5px;">Hukuk AI Asistanı</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- GREETING -->
      <tr>
        <td style="padding:28px 32px 0;">
          <div style="font-size:14px;color:#888;line-height:1.6;">Sayın</div>
          <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:2px;line-height:1.2;">{lawyer_name}</div>
          <div style="height:1px;background:linear-gradient(90deg,#ebac00 0%,transparent 80%);margin-top:16px;"></div>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:24px 32px;">
          <div style="font-size:14px;color:#888;margin-bottom:20px;line-height:1.7;">{intro_text}</div>

          <!-- Reminder card -->
          <div style="background:#0d0d0d;border:1px solid #2a2a2a;border-left:3px solid #ebac00;border-radius:12px;padding:20px 22px;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;margin-bottom:14px;line-height:1.3;">{title}</div>

            {detail_rows}

            {details_block}
          </div>

          {action_note}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 32px 28px;border-top:1px solid #1a1a1a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:11px;color:#333;line-height:1.8;">
                  Bu e-posta <strong style="color:#555;">Miron AI</strong> tarafından otomatik olarak oluşturulmuştur.<br>
                  Hatırlatıcınızı yönetmek için <a href="https://www.mironintelligence.com/reminders" style="color:#ebac00;text-decoration:none;">uygulamayı açın</a>.
                </div>
              </td>
              <td align="right" style="vertical-align:bottom;">
                <div style="font-size:10px;color:#2a2a2a;letter-spacing:0.5px;">© 2026 Miron GROUP LLC</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>
"""


def _detail_row(label: str, value: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="110" style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.8px;vertical-align:top;padding-top:2px;">{label}</td>
        <td style="font-size:13px;color:#cccccc;font-weight:500;">{value}</td>
      </tr>
    </table>"""


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

    rows = _detail_row("Tarih / Saat", due_at_fmt)
    if court:
        rows += _detail_row("Mahkeme", court)
    if case_number:
        rows += _detail_row("Dosya No", case_number)

    details_block = ""
    if details:
        details_block = f"""
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #1e1e1e;font-size:12px;color:#666;line-height:1.8;white-space:pre-wrap;">{details}</div>"""

    intro_text = f"Aşağıdaki hatırlatıcınız <strong style='color:#ebac00;'>{offset_label}</strong> kaldı."

    action_note = """
    <div style="margin-top:20px;text-align:center;">
      <a href="https://www.mironintelligence.com/reminders"
         style="display:inline-block;background:#ebac00;color:#000;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px;padding:11px 28px;letter-spacing:0.3px;">
        Takvimi Aç
      </a>
    </div>"""

    html = _TEMPLATE.format(
        subject=subject,
        lawyer_name=lawyer_name,
        intro_text=intro_text,
        title=title,
        detail_rows=rows,
        details_block=details_block,
        action_note=action_note,
    )
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
