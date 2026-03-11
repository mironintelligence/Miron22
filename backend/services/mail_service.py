import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
import threading

# --- KONFIGURASYON ---
# Render Environment Variables üzerinden okunacak
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "info@mironintelligence.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "miron_app_password") 
FROM_EMAIL = os.getenv("FROM_EMAIL", "Miron Legal Assistant <no-reply@miron.ai>")

logger = logging.getLogger("miron_mail")

def _send_async(to_email: str, subject: str, html_content: str):
    """
    Arka planda mail gönderen asıl fonksiyon.
    SMTP bağlantı hatası olursa loglar, programı çökertmez.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        # SMTP Bağlantısı
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls() # Güvenli bağlantı
            # Eğer şifre varsa login ol (Gerçek ortamda şifre olmalı)
            if SMTP_PASSWORD and SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
            logger.info(f"Email sent successfully to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        # Hata durumunda kullanıcıyı engellememek için sessizce geçiyoruz
        # Production'da burası bir kuyruğa (Celery/Redis) atılmalı.

def send_verification_email(to_email: str, token: str):
    link = f"https://miron22.onrender.com/verify-email?token={token}"
    subject = "Miron Hesabınızı Doğrulayın"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hoş Geldiniz!</h2>
        <p>Miron Legal Assistant hesabınızı oluşturduğunuz için teşekkürler.</p>
        <p>Hesabınızı aktif etmek için lütfen aşağıdaki butona tıklayın:</p>
        <a href="{link}" style="background-color: #d4af37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Hesabı Doğrula</a>
        <p>veya şu linke tıklayın: {link}</p>
        <br>
        <p>Saygılarımızla,<br>Miron Ekibi</p>
    </div>
    """
    # Thread içinde gönder (API cevabını geciktirmemek için)
    threading.Thread(target=_send_async, args=(to_email, subject, html)).start()

def send_reset_password_email(to_email: str, token: str):
    link = f"https://miron22.onrender.com/reset-password?token={token}"
    subject = "Şifre Sıfırlama İsteği"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Şifrenizi mi Unuttunuz?</h2>
        <p>Hesabınız için bir şifre sıfırlama isteği aldık.</p>
        <p>Şifrenizi yenilemek için tıklayın:</p>
        <a href="{link}" style="background-color: #d4af37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Şifreyi Sıfırla</a>
        <p>Eğer bu isteği siz yapmadıysanız, bu maili görmezden gelebilirsiniz.</p>
    </div>
    """
    threading.Thread(target=_send_async, args=(to_email, subject, html)).start()

def send_admin_notification(user_email: str, message: str):
    subject = "Miron Admin Bildirimi"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h3>Yönetici Mesajı</h3>
        <p>{message}</p>
        <br>
        <p>Bu mesaj sistem yöneticisi tarafından gönderilmiştir.</p>
    </div>
    """
    threading.Thread(target=_send_async, args=(user_email, subject, html)).start()
