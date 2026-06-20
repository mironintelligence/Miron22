import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { purgeLegacyTokenStorage } from "../utils/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, status } = useAuth();

  useEffect(() => {
    purgeLegacyTokenStorage();
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setSuccess("E-posta başarıyla doğrulandı. Giriş yapabilirsiniz.");
    }
  }, []);

  useEffect(() => {
    if (status === "authed") {
      navigate("/dashboard", { replace: true });
    }
  }, [status, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("E-posta adresi zorunludur.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (!password) {
      setError("Şifre zorunludur.");
      return;
    }

    setLoading(true);
    try {
      purgeLegacyTokenStorage();
      await login(email.trim(), password, { rememberMe });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err?.code === "DEMO_EXPIRED" || err?.code === "SUBSCRIPTION_EXPIRED") {
        navigate("/pricing", { replace: true });
        return;
      }
      setError(err?.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 py-16">
      <style>{`
        @keyframes vault-open {
          0% { opacity: 0; transform: scale(0.97) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .vault-card {
          animation: vault-open 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="w-full max-w-sm vault-card">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-[#F5C518] to-amber-400 bg-clip-text text-transparent">
              Miron AI
            </span>
          </Link>
          <p className="text-[11px] text-white/30 tracking-[0.2em] uppercase mt-1">Miron GROUP LLC</p>
        </div>

        {/* Vault Card */}
        <div
          className="relative border border-white/12 bg-[#0d0d0d] p-8"
          style={{
            boxShadow: '0 0 0 1px rgba(245,197,24,0.06), 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Gold top line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, #F5C518, transparent)' }}
          />

          <h1 className="text-xl font-bold text-white mb-1">Güvenli Giriş</h1>
          <p className="text-[12px] text-white/35 mb-7">Hesabınıza erişmek için kimliğinizi doğrulayın.</p>

          {success && (
            <div className="mb-5 px-4 py-3 border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-[12px] leading-relaxed">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-5 px-4 py-3 border border-red-500/30 bg-red-950/30 text-red-300 text-[12px] leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-[0.15em] mb-2">
                E-posta
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="ornek@mail.com"
                className="w-full bg-black/60 border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/20 transition-all placeholder:text-white/20 disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.15em]">
                  Şifre
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#F5C518]/60 hover:text-[#F5C518] transition-colors"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full bg-black/60 border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#F5C518]/50 focus:ring-1 focus:ring-[#F5C518]/20 transition-all placeholder:text-white/20 disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                onClick={() => setRememberMe((v) => !v)}
                className={`w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ${
                  rememberMe ? 'border-[#F5C518] bg-[#F5C518]/15' : 'border-white/20 group-hover:border-white/35'
                }`}
              >
                {rememberMe && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="#F5C518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-white/45 group-hover:text-white/60 transition-colors">Beni hatırla</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F5C518] text-black font-bold text-[13px] tracking-[0.1em] uppercase py-3.5 mt-2 hover:opacity-85 transition-opacity disabled:opacity-50"
            >
              {loading ? "Doğrulanıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="text-center text-[12px] text-white/30 mt-6">
            Hesabınız yok mu?{" "}
            <Link to="/kaydol" className="text-[#F5C518]/70 hover:text-[#F5C518] transition-colors">
              Kayıt olun
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-white/15 mt-6">
          © {new Date().getFullYear()} Miron GROUP LLC
        </p>
      </div>
    </div>
  );
};

export default Login;
