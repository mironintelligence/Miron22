"""
Miron GROUP LLC — Auth & Sistem E-postaları
Tüm gönderim notification_delivery.send_email() üzerinden Resend/SMTP fallback.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

log = logging.getLogger("miron.mail")

_BASE_URL = "https://www.mironintelligence.com"


# ---------------------------------------------------------------------------
# Temel HTML iskelet (auth mailleri için)
# ---------------------------------------------------------------------------

def _wrap(subject: str, body_html: str) -> str:
    return f"""\
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
    <table width="560" cellpadding="0" cellspacing="0"
           style="max-width:560px;width:100%;background:#111111;border-radius:16px;
                  overflow:hidden;border:1px solid #1e1e1e;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1400 0%,#0a0a00 100%);
                   padding:28px 32px 20px;border-bottom:2px solid #ebac00;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ebac00;border-radius:10px;width:38px;height:38px;
                               text-align:center;vertical-align:middle;">
                      <span style="font-size:20px;font-weight:900;color:#000;
                                   line-height:38px;display:block;letter-spacing:-1px;">M</span>
                    </td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <div style="font-size:18px;font-weight:800;color:#ffffff;
                                  letter-spacing:-0.5px;line-height:1.1;">Miron</div>
                      <div style="font-size:10px;font-weight:500;color:#ebac00;
                                  letter-spacing:2px;text-transform:uppercase;">GROUP LLC</div>
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

      <!-- BODY -->
      <tr><td style="padding:32px 32px 24px;">{body_html}</td></tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 32px 28px;border-top:1px solid #1a1a1a;">
          <div style="font-size:11px;color:#333;line-height:1.8;">
            Bu e-posta <strong style="color:#555;">Miron AI</strong> tarafından otomatik olarak
            oluşturulmuştur. Eğer bu işlemi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.<br>
            <a href="{_BASE_URL}" style="color:#ebac00;text-decoration:none;">www.mironintelligence.com</a>
          </div>
          <div style="margin-top:8px;font-size:10px;color:#2a2a2a;letter-spacing:0.5px;">
            © 2026 Miron GROUP LLC
          </div>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>"""


def _gold_button(label: str, href: str) -> str:
    return f"""\
<div style="margin-top:24px;text-align:center;">
  <a href="{href}"
     style="display:inline-block;background:#ebac00;color:#000;font-weight:700;
            font-size:13px;text-decoration:none;border-radius:8px;
            padding:12px 32px;letter-spacing:0.3px;">{label}</a>
</div>"""


def _otp_box(code: str) -> str:
    return f"""\
<div style="background:#0d0d0d;border:1px solid #2a2a2a;border-left:3px solid #ebac00;
            border-radius:12px;padding:20px 24px;margin:20px 0;text-align:center;">
  <div style="font-size:11px;color:#555;letter-spacing:1px;text-transform:uppercase;
              margin-bottom:10px;">Doğrulama Kodu</div>
  <div style="font-size:32px;font-weight:900;color:#ebac00;letter-spacing:8px;
              font-variant-numeric:tabular-nums;">{code}</div>
  <div style="font-size:11px;color:#555;margin-top:10px;">15 dakika geçerlidir</div>
</div>"""


# ---------------------------------------------------------------------------
# E-posta türleri
# ---------------------------------------------------------------------------

def _send(to: str, subject: str, html: str) -> None:
    """Arka planda gönder — API yanıtını bloklamaz."""
    def _do():
        try:
            from services.notification_delivery import send_email
            ok = send_email(to, subject, html)
            if not ok:
                log.warning("mail_send_failed to=%s subject=%s", to, subject)
        except Exception as e:
            log.error("mail_error to=%s: %s", to, e)
    threading.Thread(target=_do, daemon=True).start()


def send_verification_email(to_email: str, token: str, first_name: Optional[str] = None) -> None:
    link = f"{_BASE_URL}/verify-email?token={token}"
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject = "Miron — Hesabınızı Doğrulayın"
    body = f"""\
<div style="font-size:14px;color:#888;margin-bottom:6px;">{greeting}</div>
<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
  Miron'a Hoş Geldiniz
</div>
<div style="height:1px;background:linear-gradient(90deg,#ebac00 0%,transparent 80%);margin:16px 0;"></div>
<div style="font-size:14px;color:#888;line-height:1.7;">
  Hesabınızı aktif etmek için aşağıdaki butona tıklayın.<br>
  Bu link <strong style="color:#cccccc;">24 saat</strong> geçerlidir.
</div>
{_gold_button("Hesabı Doğrula", link)}
<div style="margin-top:16px;font-size:11px;color:#444;text-align:center;">
  Butona tıklanamıyorsa:<br>
  <a href="{link}" style="color:#ebac00;word-break:break-all;">{link}</a>
</div>"""
    _send(to_email, subject, _wrap(subject, body))


def send_password_reset_otp_email(to_email: str, code: str,
                                  first_name: Optional[str] = None) -> None:
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject = "Miron — Şifre Sıfırlama Kodu"
    body = f"""\
<div style="font-size:14px;color:#888;margin-bottom:6px;">{greeting}</div>
<div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
  Şifre Sıfırlama İsteği
</div>
<div style="height:1px;background:linear-gradient(90deg,#ebac00 0%,transparent 80%);margin:16px 0;"></div>
<div style="font-size:14px;color:#888;line-height:1.7;">
  Şifrenizi sıfırlamak için aşağıdaki 12 haneli kodu uygulamaya girin.
</div>
{_otp_box(code)}
<div style="font-size:12px;color:#444;line-height:1.7;margin-top:8px;">
  Bu isteği siz yapmadıysanız bu e-postayı görmezden gelin.
  Şifreniz değiştirilmemiş olacaktır.
</div>"""
    _send(to_email, subject, _wrap(subject, body))


def send_reset_password_email(to_email: str, token: str,
                               first_name: Optional[str] = None) -> None:
    link = f"{_BASE_URL}/reset-password?token={token}"
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject = "Miron — Şifrenizi Sıfırlayın"
    body = f"""\
<div style="font-size:14px;color:#888;margin-bottom:6px;">{greeting}</div>
<div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
  Şifre Sıfırlama
</div>
<div style="height:1px;background:linear-gradient(90deg,#ebac00 0%,transparent 80%);margin:16px 0;"></div>
<div style="font-size:14px;color:#888;line-height:1.7;">
  Şifrenizi sıfırlamak için butona tıklayın.
  Bu link <strong style="color:#cccccc;">1 saat</strong> geçerlidir.
</div>
{_gold_button("Şifreyi Sıfırla", link)}
<div style="margin-top:16px;font-size:11px;color:#444;text-align:center;">
  <a href="{link}" style="color:#ebac00;word-break:break-all;">{link}</a>
</div>"""
    _send(to_email, subject, _wrap(subject, body))


def send_welcome_email(to_email: str, first_name: Optional[str] = None,
                       last_name: Optional[str] = None) -> None:
    """Kayıt sonrası hoşgeldin maili."""
    name_parts = " ".join(p for p in [first_name, last_name] if p and p.strip()).strip()
    lawyer = f"Av. {name_parts}" if name_parts else "Değerli Avukat"
    subject = "Miron'a Hoş Geldiniz"
    body = f"""\
<div style="font-size:14px;color:#888;margin-bottom:6px;">Sayın</div>
<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">{lawyer}</div>
<div style="height:1px;background:linear-gradient(90deg,#ebac00 0%,transparent 80%);margin:16px 0;"></div>
<div style="font-size:14px;color:#888;line-height:1.8;">
  Miron AI'ya hoş geldiniz. Artık aşağıdaki özelliklere erişebilirsiniz:
</div>
<div style="margin:20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <span style="color:#ebac00;font-size:13px;font-weight:600;">⚖</span>
        <span style="color:#cccccc;font-size:13px;margin-left:10px;">700K+ Yargıtay kararı araması</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <span style="color:#ebac00;font-size:13px;font-weight:600;">📋</span>
        <span style="color:#cccccc;font-size:13px;margin-left:10px;">Mevzuat analizi ve içtihat taraması</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <span style="color:#ebac00;font-size:13px;font-weight:600;">🤖</span>
        <span style="color:#cccccc;font-size:13px;margin-left:10px;">AI hukuk asistanı (Libra)</span>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 0;">
        <span style="color:#ebac00;font-size:13px;font-weight:600;">📅</span>
        <span style="color:#cccccc;font-size:13px;margin-left:10px;">Dava takvimi ve hatırlatıcılar</span>
      </td>
    </tr>
  </table>
</div>
{_gold_button("Uygulamayı Aç", _BASE_URL)}"""
    _send(to_email, subject, _wrap(subject, body))


def send_admin_notification(user_email: str, message: str) -> None:
    subject = "Miron — Yönetici Bildirimi"
    body = f"""\
<div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:16px;">Yönetici Mesajı</div>
<div style="font-size:14px;color:#888;line-height:1.7;">{message}</div>"""
    _send(user_email, subject, _wrap(subject, body))
