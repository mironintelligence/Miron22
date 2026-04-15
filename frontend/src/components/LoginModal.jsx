import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { useAuth } from "../auth/AuthProvider";

export default function LoginModal({ open, onClose, onSuccess }) {
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
      await login(email.trim(), password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      onSuccess?.();
    } catch (err) {
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
            className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-60">
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </Modal>
  );
}
