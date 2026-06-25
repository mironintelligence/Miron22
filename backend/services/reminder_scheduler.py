"""
Hatırlatıcı zamanlayıcı — her 2 dakikada case_reminder_triggers kontrol eder,
zamanı gelen kayıtlar için mail + in_app bildirimi gönderir.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

log = logging.getLogger("miron.scheduler")


def _fmt_due(dt: datetime) -> str:
    try:
        local = dt.astimezone()
        return local.strftime("%d %B %Y, %H:%M")
    except Exception:
        return str(dt)


def _offset_label(minutes: int) -> str:
    if minutes >= 7 * 24 * 60:
        return "7 gün"
    if minutes >= 24 * 60:
        d = minutes // (24 * 60)
        return f"{d} gün"
    if minutes >= 60:
        h = minutes // 60
        return f"{h} saat"
    return f"{minutes} dakika"


def _lawyer_display(first: Optional[str], last: Optional[str]) -> str:
    name = " ".join(p for p in [first, last] if p and p.strip()).strip()
    if not name:
        return "Değerli Avukat"
    return f"Av. {name}"


def process_due_triggers() -> None:
    """Zamanı gelen tetikleyicileri işle. Her 2 dakikada çağrılır."""
    try:
        from db import get_db_cursor
        from services.notification_delivery import build_reminder_email, send_email

        now = datetime.now(timezone.utc)
        # 5 dakika öne alarak kontrol et — scheduler gecikmelerine karşı tolerans
        window = now + timedelta(minutes=5)

        with get_db_cursor(write=True) as cur:
            cur.execute("""
                SELECT
                    t.id         AS trigger_id,
                    t.channel,
                    t.trigger_at,
                    r.id         AS reminder_id,
                    r.title,
                    r.details,
                    r.due_at,
                    r.court,
                    r.case_number,
                    r.archived_at,
                    u.email      AS user_email,
                    u.first_name,
                    u.last_name
                FROM case_reminder_triggers t
                JOIN case_reminders r ON r.id = t.reminder_id
                JOIN users u ON u.id = t.user_id
                WHERE t.sent_at IS NULL
                  AND t.trigger_at <= %s
                  AND r.archived_at IS NULL
                LIMIT 50
            """, (window,))
            rows = cur.fetchall() or []

            for row in rows:
                tid = row["trigger_id"]
                channel = row["channel"]
                try:
                    if channel == "email":
                        _send_email_notification(row, build_reminder_email, send_email)
                    elif channel == "in_app":
                        _create_in_app_notification(cur, row)

                    cur.execute(
                        "UPDATE case_reminder_triggers SET sent_at = NOW() WHERE id = %s",
                        (tid,)
                    )
                    log.info("trigger_sent channel=%s reminder=%s", channel, row["reminder_id"])
                except Exception as e:
                    log.warning("trigger_failed id=%s error=%s", tid, e)

    except Exception as e:
        log.error("scheduler_error: %s", e)


def _send_email_notification(row, build_fn, send_fn) -> None:
    to_email = row.get("user_email") or ""
    if not to_email:
        return

    due_at = row.get("due_at")
    due_fmt = _fmt_due(due_at) if due_at else "—"

    # Tetikleyici zamanlamasından offset hesapla
    trigger_at = row.get("trigger_at")
    if trigger_at and due_at:
        diff_min = int((due_at - trigger_at).total_seconds() / 60)
        offset_lbl = _offset_label(diff_min)
    else:
        offset_lbl = "yakında"

    lawyer = _lawyer_display(row.get("first_name"), row.get("last_name"))
    subject, html = build_fn(
        lawyer_name   = lawyer,
        title         = row.get("title") or "Hatırlatıcı",
        due_at_fmt    = due_fmt,
        court         = row.get("court"),
        case_number   = row.get("case_number"),
        details       = row.get("details"),
        offset_label  = offset_lbl,
    )
    ok = send_fn(to_email, subject, html)
    if not ok:
        log.warning("email_send_failed to=%s", to_email)


def _create_in_app_notification(cur, row) -> None:
    import uuid as _uuid
    nid = str(_uuid.uuid4())
    due_at = row.get("due_at")
    due_fmt = _fmt_due(due_at) if due_at else ""
    message = f"{row.get('title','Hatırlatıcı')} — {due_fmt}"
    cur.execute("""
        INSERT INTO notifications (id, user_id, type, title, message, created_at, read_at)
        VALUES (%s, (SELECT user_id FROM case_reminder_triggers WHERE id = %s), 'reminder', %s, %s, NOW(), NULL)
        ON CONFLICT DO NOTHING
    """, (nid, row["trigger_id"], "Hatırlatıcı", message))


def start_scheduler() -> None:
    """FastAPI startup'ta çağrılır."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore
        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            process_due_triggers,
            trigger="interval",
            minutes=2,
            id="reminder_processor",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()
        log.info("reminder_scheduler başlatıldı — her 2 dakika")
    except Exception as e:
        log.error("scheduler_start_failed: %s", e)
