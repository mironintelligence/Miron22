import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "./Modal.jsx";
import { emitToast } from "../utils/toastBus";
import { useAuth } from "../auth/AuthProvider";

export default function LoginModal({ open, onClose, onSuccess }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      setEmail("");
      setPassword("");
      onSuccess?.();
    } catch (err) {
      if (err?.code === "DEMO_EXPIRED") {
        emitToast("Aboneliğinizin süresi doldu. Paketler için yönlendiriliyorsunuz.", "error");
        navigate("/pricing", { replace: true });
        onClose?.();
        return;
      }
      setError(err?.message || "Giriş başarısız oldu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold text-center mb-6 text-accent">Giriş</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-subtle mb-1">E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="email"
            inputMode="email"
            className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
            placeholder="ornek@firma.com"
          />
        </div>
        <div>
          <label className="block text-sm text-subtle mb-1">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-60">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <div className="flex items-center justify-between text-xs text-white/60 pt-1">
          <Link to="/forgot-password" onClick={onClose} className="hover:text-white underline-offset-2 hover:underline">
            Şifremi unuttum
          </Link>
          <Link to="/kaydol" onClick={onClose} className="hover:text-white underline-offset-2 hover:underline">
            Hesap oluştur
          </Link>
        </div>
      </form>
    </Modal>
  );
}
