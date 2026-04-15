import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

/** Ödeme / yönlendirme sonrası ana menüye geçiş için basit kapı. */
export default function PaymentGate() {
  const navigate = useNavigate();
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === "authed") {
      navigate("/dashboard", { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black p-8 shadow-xl text-center"
      >
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
      </motion.div>
    </div>
  );
}
