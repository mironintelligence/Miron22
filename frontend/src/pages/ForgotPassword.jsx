import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { passwordMeetsPolicy } from "../utils/passwordPolicy";
import { getApiBase } from "../lib/apiBase.js";
import { readCsrfToken } from "../auth/api.js";

const base = () => getApiBase();

function csrfHeaders() {
  const csrf = readCsrfToken();
  const h = { "Content-Type": "application/json" };
  if (csrf) h["X-CSRF-Token"] = csrf;
  return h;
}

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${base()}/api/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders(),
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      if (res.status === 429) {
        setError("Çok fazla deneme. Lütfen 1 saat sonra tekrar deneyin.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "İstek başarısız.");
        return;
      }
      setMessage(data.message || "İşlem alındı.");
      setStep(2);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    const digits = otp.replace(/\D/g, "");
    if (digits.length !== 12) {
      setError("12 haneli kodu girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${base()}/api/auth/verify-forgot-otp`, {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders(),
        body: JSON.stringify({ email: email.trim(), code: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reset_token) {
        setError(data.detail || "Kod geçersiz veya süresi dolmuş.");
        return;
      }
      setResetToken(data.reset_token);
      setMessage("Kod doğrulandı. Yeni şifrenizi belirleyin.");
      setStep(3);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (!passwordMeetsPolicy(password)) {
      setError("Şifre güçlü şifre kurallarını karşılamıyor.");
      return;
    }
    if (password !== password2) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${base()}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders(),
        body: JSON.stringify({ token: resetToken, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Şifre güncellenemedi.");
        return;
      }
      setMessage("Yeni şifreniz onaylandı. Giriş sayfasına yönlendiriliyorsunuz…");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page:   { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
    card:   { width: "100%", maxWidth: 440, background: "#111111", border: "1px solid #1e1e1e", borderRadius: 20, overflow: "hidden" },
    header: { background: "linear-gradient(135deg,#1a1400 0%,#0a0a00 100%)", borderBottom: "2px solid #ebac00", padding: "28px 32px" },
    body:   { padding: "32px 32px 28px" },
    label:  { display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 },
    input:  { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" },
    btn:    { width: "100%", padding: 13, background: "#ebac00", color: "#000", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 12, cursor: "pointer", letterSpacing: "0.3px" },
    err:    { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 13, marginBottom: 20 },
    ok:     { background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 13, marginBottom: 20 },
  };

  const inputWithEye = (value, setter, show, setShow, extra = {}) => (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        required
        autoComplete="new-password"
        value={value}
        onChange={(e) => setter(e.target.value)}
        style={{ ...S.input, paddingRight: 44, ...extra }}
      />
      <button type="button" onClick={() => setShow(v => !v)} tabIndex={-1}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0, display: "flex" }}>
        <EyeIcon visible={show} />
      </button>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Logo */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/miron-logo.png" alt="Miron" width={34} height={34} style={{ objectFit: "contain", borderRadius: 8 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                Miron <span style={{ color: "#ebac00" }}>AI</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#ebac00", letterSpacing: "2px", textTransform: "uppercase" }}>GROUP LLC</div>
            </div>
          </div>
        </div>

        <div style={S.body}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Şifremi Unuttum</div>
            <div style={{ fontSize: 13, color: "#555" }}>
              {step === 1 && "Ad, soyad ve e-posta adresinizi girin"}
              {step === 2 && "E-postanıza gönderilen 12 haneli kodu girin"}
              {step === 3 && "Yeni şifrenizi belirleyin ve onaylayın"}
            </div>
          </div>

          {message && <div style={S.ok}>{message}</div>}
          {error   && <div style={S.err}>{error}</div>}

          {step === 1 && (
            <form onSubmit={requestOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[["Ad", firstName, setFirstName, "text"], ["Soyad", lastName, setLastName, "text"], ["E-posta", email, setEmail, "email"]].map(([lbl, val, setter, type]) => (
                <div key={lbl}>
                  <label style={S.label}>{lbl}</label>
                  <input required type={type} value={val} onChange={(e) => setter(e.target.value)} style={S.input} autoComplete={type === "email" ? "email" : "off"} />
                </div>
              ))}
              <button type="submit" disabled={loading} style={{ ...S.btn, marginTop: 8, opacity: loading ? 0.5 : 1 }}>
                {loading ? "Gönderiliyor…" : "Doğrulama kodu iste"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={S.label}>12 Haneli Kod</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ ...S.input, textAlign: "center", fontSize: 22, letterSpacing: 8, fontVariantNumeric: "tabular-nums" }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.5 : 1 }}>
                {loading ? "Kontrol ediliyor…" : "Kodu doğrula"}
              </button>
              <button type="button" onClick={() => setStep(1)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 13, padding: "8px 0" }}>
                ← Geri
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={submitNewPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={S.label}>Yeni Şifre</label>
                {inputWithEye(password, setPassword, showPw, setShowPw)}
              </div>
              <div>
                <label style={S.label}>Yeni Şifre (Tekrar)</label>
                {inputWithEye(password2, setPassword2, showPw2, setShowPw2,
                  password2 && password !== password2 ? { borderColor: "rgba(239,68,68,0.4)" } : {}
                )}
                {password2 && password !== password2 && (
                  <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>Şifreler eşleşmiyor</div>
                )}
                {password2 && password === password2 && passwordMeetsPolicy(password) && (
                  <div style={{ fontSize: 12, color: "#22c55e", marginTop: 6 }}>✓ Şifreler eşleşiyor</div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !passwordMeetsPolicy(password) || password !== password2}
                style={{ ...S.btn, opacity: (loading || !passwordMeetsPolicy(password) || password !== password2) ? 0.4 : 1, cursor: (loading || !passwordMeetsPolicy(password) || password !== password2) ? "not-allowed" : "pointer" }}
              >
                {loading ? "Kaydediliyor…" : "Oluştur ve Onayla"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Link to="/login" style={{ fontSize: 12, color: "#444", textDecoration: "none" }}>
              ← Giriş ekranına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
