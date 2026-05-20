import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { passwordMeetsPolicy } from "../utils/passwordPolicy";
import { getApiBase } from "../lib/apiBase.js";

const base = () => getApiBase();

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="premium-scope min-h-screen flex items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Şifremi unuttum</h1>
          <p className="text-white/50 text-xs">
            {step === 1 && "Ad, soyad ve e-posta"}
            {step === 2 && "E-postanıza gelen 12 haneli kod"}
            {step === 3 && "Yeni şifre oluştur ve onayla"}
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 text-green-400 text-sm rounded-xl">{message}</div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Ad</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Soyad</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">E-posta</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? "Gönderiliyor…" : "Doğrulama kodu iste"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">12 haneli kod</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest font-mono outline-none"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--miron-gold)] text-black font-bold rounded-xl disabled:opacity-50"
            >
              {loading ? "Kontrol ediliyor…" : "Kodu doğrula"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-white/50 hover:text-white">
              ← Geri
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submitNewPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Yeni şifre</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Yeni şifre (tekrar)</label>
              <input
                type="password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--miron-gold)] text-black font-bold rounded-xl disabled:opacity-50"
            >
              {loading ? "Kaydediliyor…" : "Oluştur ve onayla"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-white/50 hover:text-white transition">
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
