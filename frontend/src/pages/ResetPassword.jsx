import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage("Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.detail || "Geçersiz veya süresi dolmuş token.");
      }
    } catch (e) {
      setError("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="premium-scope min-h-screen flex items-center justify-center bg-black text-white">
        <p>Geçersiz istek. Token bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Yeni Şifre Belirle</h1>
          <p className="text-white/50 text-sm">Hesabınız için güçlü bir şifre seçin.</p>
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
            <label className="block text-xs font-medium text-white/70 mb-2">Yeni Şifre</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--miron-gold)] outline-none transition"
              placeholder="En az 8 karakter"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">Şifre Tekrar</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[var(--miron-gold)] outline-none transition"
              placeholder="Şifreyi tekrar girin"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}
