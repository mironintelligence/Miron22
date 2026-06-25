import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getApiBase } from "../lib/apiBase.js";
import { passwordMeetsPolicy } from "../utils/passwordPolicy.js";
import { readCsrfToken } from "../auth/api.js";

// ── Kural göstergesi ────────────────────────────────────────────────────────
const RULES = [
  { id: "len",   label: "En az 12 karakter",         test: (p) => p.length >= 12 },
  { id: "upper", label: "Büyük harf (A–Z)",           test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Küçük harf (a–z)",           test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "Rakam (0–9)",                test: (p) => /\d/.test(p) },
  { id: "spec",  label: 'Özel karakter (!@#$%^&*…)',  test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordRules({ pw }) {
  if (!pw) return null;
  return (
    <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
      {RULES.map((r) => {
        const ok = r.test(pw);
        return (
          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: ok ? "#22c55e" : "#555" }}>
              {ok ? "✓" : "○"}
            </span>
            <span style={{ fontSize: 12, color: ok ? "#aaa" : "#555" }}>{r.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Göster/gizle butonu ─────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [pw,  setPw]  = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState("");

  // Token yoksa anında engelle
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const canSubmit = passwordMeetsPolicy(pw) && pw === pw2 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!passwordMeetsPolicy(pw)) {
      setError("Şifre güçlü şifre kurallarını karşılamıyor.");
      return;
    }
    if (pw !== pw2) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const csrf = readCsrfToken();
      const res = await fetch(`${getApiBase()}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({ token, new_password: pw }),
      });

      if (res.status === 429) {
        setError("Çok fazla deneme. Lütfen biraz bekleyin.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail || "Geçersiz veya süresi dolmuş bağlantı.");
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {/* ── Başlık ── */}
        <div
          style={{
            background: "linear-gradient(135deg,#1a1400 0%,#0a0a00 100%)",
            borderBottom: "2px solid #ebac00",
            padding: "28px 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/miron-logo.png"
              alt="Miron"
              width={34}
              height={34}
              style={{ objectFit: "contain", borderRadius: 8 }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                Miron <span style={{ color: "#ebac00" }}>AI</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#ebac00", letterSpacing: "2px", textTransform: "uppercase" }}>
                GROUP LLC
              </div>
            </div>
          </div>
        </div>

        {/* ── İçerik ── */}
        <div style={{ padding: "32px 32px 28px" }}>
          {success ? (
            /* Başarı mesajı */
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                Şifreniz Güncellendi
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Giriş sayfasına yönlendiriliyorsunuz…
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                  Yeni Şifre Belirle
                </div>
                <div style={{ fontSize: 13, color: "#555" }}>
                  Güçlü, daha önce kullanmadığınız bir şifre seçin.
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    color: "#f87171",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Yeni Şifre */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                    Yeni Şifre
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#0a0a0a",
                        border: `1px solid ${pw && !passwordMeetsPolicy(pw) ? "rgba(239,68,68,0.4)" : "#2a2a2a"}`,
                        borderRadius: 12,
                        padding: "12px 44px 12px 14px",
                        color: "#fff",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#555",
                        padding: 0,
                        display: "flex",
                      }}
                      tabIndex={-1}
                    >
                      <EyeIcon visible={showPw} />
                    </button>
                  </div>
                  <PasswordRules pw={pw} />
                </div>

                {/* Şifre Onayla */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                    Şifre Onayla
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw2 ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#0a0a0a",
                        border: `1px solid ${pw2 && pw !== pw2 ? "rgba(239,68,68,0.4)" : "#2a2a2a"}`,
                        borderRadius: 12,
                        padding: "12px 44px 12px 14px",
                        color: "#fff",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#555",
                        padding: 0,
                        display: "flex",
                      }}
                      tabIndex={-1}
                    >
                      <EyeIcon visible={showPw2} />
                    </button>
                  </div>
                  {pw2 && pw !== pw2 && (
                    <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>
                      Şifreler eşleşmiyor
                    </div>
                  )}
                  {pw2 && pw === pw2 && passwordMeetsPolicy(pw) && (
                    <div style={{ fontSize: 12, color: "#22c55e", marginTop: 6 }}>
                      ✓ Şifreler eşleşiyor
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: canSubmit ? "#ebac00" : "#2a2000",
                    color: canSubmit ? "#000" : "#555",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "none",
                    borderRadius: 12,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    transition: "background 0.2s, color 0.2s",
                    letterSpacing: "0.3px",
                  }}
                >
                  {loading ? "Kaydediliyor…" : "Şifreyi Güncelle"}
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <a href="/login" style={{ fontSize: 12, color: "#444", textDecoration: "none" }}
               onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
               onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              ← Giriş ekranına dön
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
