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
      <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
        Miron AI Giriş
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="ornek@firma.com"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-95 transition disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </Modal>
  );
}
