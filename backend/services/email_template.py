"""
Miron GROUP LLC — Unified Email Design System
Tek kaynak: tüm HTML mailler buradan üretilir.
"""
from __future__ import annotations

_BRAND   = "#ebac00"
_BG_OUT  = "#0a0a0a"
_BG_CARD = "#111111"
_BG_DEEP = "#0d0d0d"
_BD_SOFT = "#1e1e1e"
_BD_MID  = "#2a2a2a"
_TXT_W   = "#ffffff"
_TXT_G   = "#888888"
_TXT_D   = "#555555"
_TXT_M   = "#333333"
_BASE    = "https://www.mironintelligence.com"
_FONT    = "'Helvetica Neue',Helvetica,Arial,sans-serif"


# ── Shared blocks ────────────────────────────────────────────────────────────

def _logo_block() -> str:
    return f"""
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background:{_BRAND};border-radius:10px;width:40px;height:40px;
               text-align:center;vertical-align:middle;">
      <span style="font-size:22px;font-weight:900;color:#000000;
                   line-height:40px;display:block;letter-spacing:-1.5px;
                   font-family:{_FONT};">M</span>
    </td>
    <td style="padding-left:12px;vertical-align:middle;">
      <div style="font-size:19px;font-weight:800;color:{_TXT_W};
                  letter-spacing:-0.5px;line-height:1.1;font-family:{_FONT};">
        Miron <span style="color:{_BRAND};">AI</span>
      </div>
      <div style="font-size:9px;font-weight:600;color:{_BRAND};
                  letter-spacing:2.5px;text-transform:uppercase;
                  font-family:{_FONT};margin-top:1px;">GROUP LLC</div>
    </td>
  </tr>
</table>"""


def _badge(label: str) -> str:
    return f"""
<div style="display:inline-block;padding:4px 11px;border-radius:20px;
            border:1px solid {_BD_MID};background:rgba(235,172,0,0.06);
            font-size:10px;font-weight:600;color:{_TXT_D};
            letter-spacing:1px;text-transform:uppercase;
            font-family:{_FONT};">{label}</div>"""


def _separator() -> str:
    return f"""
<div style="height:1px;background:linear-gradient(90deg,{_BRAND} 0%,
            rgba(235,172,0,0.15) 55%,transparent 100%);margin:16px 0;"></div>"""


def _gold_button(label: str, href: str) -> str:
    return f"""
<div style="margin-top:24px;text-align:center;">
  <a href="{href}"
     style="display:inline-block;background:{_BRAND};color:#000000;
            font-weight:700;font-size:13px;text-decoration:none;
            border-radius:9px;padding:13px 34px;letter-spacing:0.4px;
            font-family:{_FONT};">{label}</a>
</div>"""


def _otp_box(code: str) -> str:
    return f"""
<div style="background:{_BG_DEEP};border:1px solid {_BD_MID};
            border-left:3px solid {_BRAND};border-radius:12px;
            padding:22px 24px;margin:22px 0;text-align:center;">
  <div style="font-size:10px;color:{_TXT_D};letter-spacing:1.5px;
              text-transform:uppercase;margin-bottom:12px;
              font-family:{_FONT};">Doğrulama Kodu</div>
  <div style="font-size:34px;font-weight:900;color:{_BRAND};
              letter-spacing:10px;font-variant-numeric:tabular-nums;
              font-family:{_FONT};">{code}</div>
  <div style="font-size:11px;color:{_TXT_D};margin-top:12px;
              font-family:{_FONT};">15 dakika geçerlidir</div>
</div>"""


def _detail_row(label: str, value: str) -> str:
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:9px;">
  <tr>
    <td width="115" style="font-size:10px;color:{_TXT_D};text-transform:uppercase;
                           letter-spacing:1px;vertical-align:top;padding-top:2px;
                           font-family:{_FONT};font-weight:600;">{label}</td>
    <td style="font-size:13px;color:#cccccc;font-weight:500;
               font-family:{_FONT};">{value}</td>
  </tr>
</table>"""


def _info_card(title: str, rows_html: str, details: str = "") -> str:
    details_block = ""
    if details:
        details_block = f"""
<div style="margin-top:14px;padding-top:14px;border-top:1px solid {_BD_SOFT};
            font-size:12px;color:#666;line-height:1.8;white-space:pre-wrap;
            font-family:{_FONT};">{details}</div>"""
    return f"""
<div style="background:{_BG_DEEP};border:1px solid {_BD_MID};
            border-left:3px solid {_BRAND};border-radius:12px;
            padding:20px 22px;">
  <div style="font-size:17px;font-weight:700;color:{_TXT_W};
              margin-bottom:14px;line-height:1.3;font-family:{_FONT};">{title}</div>
  {rows_html}
  {details_block}
</div>"""


def _feature_row(icon: str, text: str) -> str:
    return f"""
<tr>
  <td style="padding:10px 0;border-bottom:1px solid {_BD_SOFT};">
    <span style="color:{_BRAND};font-size:14px;font-weight:600;">{icon}</span>
    <span style="color:#cccccc;font-size:13px;margin-left:11px;
                 font-family:{_FONT};">{text}</span>
  </td>
</tr>"""


# ── Base wrapper ─────────────────────────────────────────────────────────────

def wrap(subject: str, badge_label: str, body_html: str,
         footer_href: str = _BASE, footer_link_text: str = "uygulamayı açın") -> str:
    return f"""\
<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:{_BG_OUT};
             font-family:{_FONT};-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:{_BG_OUT};padding:36px 16px;">
  <tr><td align="center">

    <!-- Outer card -->
    <table width="560" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;width:100%;background:{_BG_CARD};
                  border-radius:18px;overflow:hidden;border:1px solid {_BD_SOFT};">

      <!-- ── HEADER ── -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a1400 0%,#0a0a00 100%);
                   padding:26px 32px 22px;border-bottom:2px solid {_BRAND};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">{_logo_block()}</td>
              <td align="right" style="vertical-align:middle;">{_badge(badge_label)}</td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── BODY ── -->
      <tr>
        <td style="padding:30px 32px 26px;">
          {body_html}
        </td>
      </tr>

      <!-- ── FOOTER ── -->
      <tr>
        <td style="padding:18px 32px 26px;border-top:1px solid {_BD_SOFT};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="font-size:11px;color:{_TXT_M};line-height:1.9;">
                  Bu e-posta <strong style="color:{_TXT_D};">Miron AI</strong>
                  tarafından otomatik oluşturulmuştur.<br>
                  Eğer bu işlemi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.<br>
                  <a href="{footer_href}" style="color:{_BRAND};text-decoration:none;">
                    {footer_link_text}
                  </a>
                </div>
              </td>
              <td align="right" style="vertical-align:bottom;padding-left:16px;
                                       white-space:nowrap;">
                <div style="font-size:10px;color:#232323;letter-spacing:0.5px;
                            font-family:{_FONT};">© 2026 Miron GROUP LLC</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>"""


# ── Convenience re-exports ────────────────────────────────────────────────────
gold_button  = _gold_button
otp_box      = _otp_box
detail_row   = _detail_row
info_card    = _info_card
separator    = _separator
feature_row  = _feature_row
