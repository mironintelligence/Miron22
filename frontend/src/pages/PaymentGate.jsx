import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

export default function PaymentGate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, refreshUser } = useAuth();
  const [message, setMessage] = useState("Ödeme doğrulanıyor...");

  const sessionId = params.get("session_id");
  const plan = params.get("plan");

  useEffect(() => {
    if (!sessionId) {
      // Normal yönlendirme (Stripe yok)
      if (status === "authed") {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    // Stripe'dan döndü — token yenile ve 2 saniye bekle
    setMessage("Ödeme başarılı! Hesabınız güncelleniyor...");

    let timer;
    (async () => {
      try {
        if (typeof refreshUser === "function") await refreshUser();
      } catch {
        // ignore
      }
      timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    })();

    return () => clearTimeout(timer);
  }, [sessionId, status, navigate, refreshUser]);

  const planLabel = plan === "yearly" ? "Yıllık Plan" : plan === "monthly" ? "Aylık Plan" : "";

  return (
    <div className="premium-scope min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black p-8 shadow-xl text-center"
      >
        {sessionId ? (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              Ödeme Başarılı
            </h1>
            {planLabel && (
              <p className="text-sm text-amber-400/80 mb-2">{planLabel} aktifleştirildi</p>
            )}
            <p className="text-sm text-white/60 mb-6">{message}</p>
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              Panele devam
            </h1>
            <p className="text-sm text-white/60 mb-6">
              Hesabınız hazırsa ana menüye geçebilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold hover:brightness-110 transition"
            >
              Panele git
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
