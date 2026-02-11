import React, { useState } from "react";
import Modal from "./Modal.jsx";
import { useAuth } from "../auth/AuthProvider";

export default function LoginModal({ open, onClose, onSuccess }) {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("Tüm alanlar zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email, password);
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
      <h2 className="text-2xl font-bold text-center mb-6 text-accent">
        Giriş
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-subtle mb-1">Ad</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
              className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="Ad"
            />
          </div>
          <div>
            <label className="block text-sm text-subtle mb-1">Soyad</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="Soyad"
            />
          </div>
        </div>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </Modal>
  );
}
