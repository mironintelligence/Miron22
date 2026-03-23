import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { attachPayment } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { luhnCheck } from "../utils/luhn";
import { emitToast } from "../utils/toastBus";

export default function PaymentGate() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);

  const valid =
    luhnCheck(number) &&
    /^\d{2}$/.test(expMonth) &&
    /^\d{4}$/.test(expYear) &&
    /^\d{3,4}$/.test(cvc);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await attachPayment({
        number: number.replace(/\s/g, ""),
        exp_month: expMonth,
        exp_year: expYear,
        cvc,
      });
      await refreshUser();
      emitToast("Kart kaydedildi. 15 gün ücret alınmaz.", "success");
      navigate("/home", { replace: true });
    } catch (err) {
      emitToast(err?.message || "İşlem başarısız", "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (user?.paymentCardOnFile) {
      navigate("/home", { replace: true });
    }
  }, [user?.paymentCardOnFile, navigate]);

  if (user?.paymentCardOnFile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black p-8 shadow-xl"
      >
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
          15 Günlük Ücretsiz Deneme
        </h1>
        <p className="text-sm text-white/60 mb-6">
          Panele erişmek için kart bilgilerinizi girin. <strong>15 gün boyunca çekim yapılmayacaktır.</strong> Deneme
          sonunda iptal edebilirsiniz.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Kart numarası</label>
            <input
              className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 font-mono tracking-wider"
              placeholder="4242 4242 4242 4242"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoComplete="cc-number"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Ay</label>
              <input
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2"
                placeholder="MM"
                value={expMonth}
                maxLength={2}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Yıl</label>
              <input
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2"
                placeholder="YYYY"
                value={expYear}
                maxLength={4}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">CVC</label>
              <input
                className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2"
                placeholder="123"
                value={cvc}
                maxLength={4}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
                autoComplete="cc-csc"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!valid || busy}
            className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-700 text-black disabled:opacity-40"
          >
            {busy ? "Kaydediliyor…" : "Devam Et"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
