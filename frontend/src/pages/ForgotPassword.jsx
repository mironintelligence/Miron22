import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Sıfırlama bağlantısı gönderildi.");
      } else {
        setError(data.detail || "Bir hata oluştu.");
      }
    } catch (e) {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-scope min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Şifre Sıfırlama</h1>
          <p className="text-white/50 text-sm">Hesabınıza ait e-posta adresini girin.</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 text-green-400 text-sm rounded-xl">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">E-posta Adresi</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--miron-gold)] outline-none transition"
              placeholder="ornek@domain.com"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-white/50 hover:text-white transition">
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
