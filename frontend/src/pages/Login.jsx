import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { purgeLegacyTokenStorage } from "../utils/auth";
import { emitToast } from "../utils/toastBus";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  React.useEffect(() => {
    purgeLegacyTokenStorage();
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setSuccess("E-posta başarıyla doğrulandı. Giriş yapabilirsiniz.");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);

    try {
      purgeLegacyTokenStorage();
      await login(email.trim(), password);
      navigate("/welcome", { replace: true });
    } catch (err) {
      if (err?.code === "DEMO_EXPIRED") {
        emitToast("Aboneliğinizin süresi doldu. Paketler için yönlendiriliyorsunuz.", "error");
        navigate("/pricing", { replace: true });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 glass">
        <h2 className="text-3xl font-bold text-center mb-8 text-accent">Giriş</h2>

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded text-green-200 text-sm">{success}</div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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
              className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
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
              className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
          <div className="flex items-center justify-between text-xs text-white/60 pt-1">
            <a href="/forgot-password" className="hover:text-white underline-offset-2 hover:underline">
              Şifremi unuttum
            </a>
            <a href="/kaydol" className="hover:text-white underline-offset-2 hover:underline">
              Hesap oluştur
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
