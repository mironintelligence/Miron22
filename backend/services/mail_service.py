"""
Miron GROUP LLC — Auth & Sistem E-postaları
Tüm gönderim notification_delivery.send_email() üzerinden Resend/SMTP fallback.
"""
from __future__ import annotations

import logging
import threading
from typing import Optional

from services.email_template import (
    wrap, gold_button, otp_box, separator, feature_row,
    _BRAND, _TXT_G, _TXT_D, _BASE, _FONT,
)

log = logging.getLogger("miron.mail")


def _send(to: str, subject: str, html: str) -> None:
    def _do():
        try:
            from services.notification_delivery import send_email
            ok = send_email(to, subject, html)
            if not ok:
                log.warning("mail_send_failed to=%s subject=%s", to, subject)
        except Exception as e:
            log.error("mail_error to=%s: %s", to, e)
    threading.Thread(target=_do, daemon=True).start()


# ── Hoşgeldin ────────────────────────────────────────────────────────────────

def send_welcome_email(to_email: str, first_name: Optional[str] = None,
                       last_name: Optional[str] = None) -> None:
    name_parts = " ".join(p for p in [first_name, last_name] if p and p.strip()).strip()
    lawyer     = f"Av. {name_parts}" if name_parts else "Değerli Avukat"

    subject = "Miron'a Hoş Geldiniz"
    body = f"""
<div style="font-size:13px;color:{_TXT_D};margin-bottom:4px;font-family:{_FONT};">Sayın</div>
<div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1.2;
            font-family:{_FONT};">{lawyer}</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;font-family:{_FONT};margin-bottom:20px;">
  Miron AI'ya hoş geldiniz. Hukuki süreçlerinizi hızlandırmak için
  aşağıdaki tüm araçlara erişiminiz hazır.
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
  {feature_row("⚖", "700.000+ Yargıtay ve Danıştay kararı araması")}
  {feature_row("📋", "Mevzuat analizi ve içtihat taraması")}
  {feature_row("🤖", "Yapay zeka hukuk asistanı — Libra")}
  {feature_row("📅", "Dava takvimi ve akıllı hatırlatıcılar")}
  {feature_row("📄", "Sözleşme oluşturma ve analiz araçları")}
</table>

{gold_button("Uygulamayı Aç", _BASE)}
"""
    _send(to_email, subject, wrap(subject, "Yeni Üyelik", body,
                                  footer_href=_BASE, footer_link_text="www.mironintelligence.com"))


# ── Hesap doğrulama ──────────────────────────────────────────────────────────

def send_verification_email(to_email: str, token: str,
                             first_name: Optional[str] = None) -> None:
    link     = f"{_BASE}/verify-email?token={token}"
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject  = "Miron — Hesabınızı Doğrulayın"
    body = f"""
<div style="font-size:14px;color:{_TXT_G};margin-bottom:6px;font-family:{_FONT};">{greeting}</div>
<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;
            font-family:{_FONT};">Hesabınızı Aktif Edin</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;font-family:{_FONT};">
  Hesabınızı aktif etmek için aşağıdaki butona tıklayın.<br>
  Bu bağlantı <strong style="color:#cccccc;">24 saat</strong> geçerlidir.
</div>
{gold_button("Hesabı Doğrula", link)}
<div style="margin-top:16px;font-size:11px;color:{_TXT_D};text-align:center;font-family:{_FONT};">
  Butona tıklanamıyorsa bu adresi tarayıcınıza yapıştırın:<br>
  <a href="{link}" style="color:{_BRAND};word-break:break-all;">{link}</a>
</div>"""
    _send(to_email, subject, wrap(subject, "Hesap Doğrulama", body))


# ── Şifre sıfırlama OTP ──────────────────────────────────────────────────────

def send_password_reset_otp_email(to_email: str, code: str,
                                   first_name: Optional[str] = None) -> None:
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject  = "Miron — Şifre Sıfırlama Kodu"
    body = f"""
<div style="font-size:14px;color:{_TXT_G};margin-bottom:6px;font-family:{_FONT};">{greeting}</div>
<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;
            font-family:{_FONT};">Şifre Sıfırlama İsteği</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;font-family:{_FONT};">
  Şifrenizi sıfırlamak için aşağıdaki 12 haneli kodu uygulamaya girin.
</div>
{otp_box(code)}
<div style="font-size:12px;color:{_TXT_D};line-height:1.8;margin-top:8px;font-family:{_FONT};">
  Bu isteği siz yapmadıysanız bu e-postayı görmezden gelin —
  şifreniz değiştirilmemiş olacaktır.
</div>"""
    _send(to_email, subject, wrap(subject, "Güvenlik", body))


# ── Şifre sıfırlama bağlantısı ───────────────────────────────────────────────

def send_reset_password_email(to_email: str, token: str,
                               first_name: Optional[str] = None) -> None:
    link     = f"{_BASE}/reset-password?token={token}"
    greeting = f"Sayın {first_name}," if first_name else "Merhaba,"
    subject  = "Miron — Şifrenizi Sıfırlayın"
    body = f"""
<div style="font-size:14px;color:{_TXT_G};margin-bottom:6px;font-family:{_FONT};">{greeting}</div>
<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;
            font-family:{_FONT};">Şifre Sıfırlama</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;font-family:{_FONT};">
  Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.<br>
  Bu bağlantı <strong style="color:#cccccc;">1 saat</strong> geçerlidir ve
  yalnızca bir kez kullanılabilir.
</div>
{gold_button("Şifreyi Sıfırla", link)}
<div style="margin-top:16px;font-size:11px;color:{_TXT_D};text-align:center;font-family:{_FONT};">
  <a href="{link}" style="color:{_BRAND};word-break:break-all;">{link}</a>
</div>"""
    _send(to_email, subject, wrap(subject, "Şifre Sıfırlama", body))


# ── Yönetici bildirimi ───────────────────────────────────────────────────────

def send_admin_notification(user_email: str, message: str) -> None:
    subject = "Miron — Yönetici Bildirimi"
    body = f"""
<div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:14px;
            font-family:{_FONT};">Yönetici Mesajı</div>
{separator()}
<div style="font-size:14px;color:{_TXT_G};line-height:1.8;font-family:{_FONT};">{message}</div>"""
    _send(user_email, subject, wrap(subject, "Yönetici", body))
