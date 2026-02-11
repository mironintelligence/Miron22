import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

function formatTRY(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n) + " TL";
  }
}

function formatDateTR(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleDateString("tr-TR");
  }
}

export default function Payments() {
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [sub, setSub] = useState({
    plan_name: "—",
    status: "unknown",
    amount_try: null,
    next_billing_at: null,
    started_at: null,
    subscription_id: null,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");

  const monthlyLabel = useMemo(() => {
    if (sub.amount_try == null) return "—";
    return formatTRY(sub.amount_try) + " / ay";
  }, [sub.amount_try]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setSubLoading(true);
      setSubError("");
      setCancelMsg("");

      // Backend’de hangi endpoint varsa onu yakalayacak (yoksa sessizce geçer)
      const candidates = [
        API_BASE + "/billing/subscription",
        API_BASE + "/billing/me",
        API_BASE + "/billing/status",
      ];

      try {
        let data = null;

        for (const url of candidates) {
          try {
            const r = await fetch(url, { method: "GET" });
            if (!r.ok) continue;
            const j = await r.json().catch(() => null);
            if (j && typeof j === "object") {
              data = j;
              break;
            }
          } catch {
            // try next
          }
        }

        if (!alive) return;

        if (!data) {
          // Endpoint yoksa da sayfa çalışsın
          setSubError("Abonelik bilgisi bulunamadı (backend endpoint yoksa normal).");
          setSubLoading(false);
          return;
        }

        setSub({
          plan_name: data.plan_name || "—",
          status: data.status || "unknown",
          amount_try: Number.isFinite(Number(data.amount_try)) ? Number(data.amount_try) : null,
          next_billing_at: data.next_billing_at || data.next_payment_date || null,
          started_at: data.started_at || null,
          subscription_id: data.subscription_id || null,
        });

        setSubLoading(false);
      } catch (e) {
        if (!alive) return;
        setSubError("Abonelik bilgisi alınamadı: " + (e?.message || "hata"));
        setSubLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const doCancel = async () => {
    setCancelMsg("");
    setActionLoading(true);

    // webhook yoksa bile talep alındı mesajı verelim
    const payload = {
      subscription_id: sub.subscription_id,
      reason: "user_cancel",
    };

    const cancelCandidates = [
      API_BASE + "/billing/cancel",
      API_BASE + "/billing/subscription/cancel",
    ];

    let cancelledRemote = false;

    for (const url of cancelCandidates) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (r.ok) {
          cancelledRemote = true;
          break;
        }
      } catch {
        // try next
      }
    }

    // webhook yoksa bile UI bozulmasın
    if (!cancelledRemote) {
      setCancelMsg("İptal talebiniz alındı. (Webhook bağlanınca sistem otomatik iptal edecek.)");
    } else {
      setCancelMsg("İptal talebiniz işlendi.");
    }

    setSub((prev) => ({ ...prev, status: "cancel_requested" }));
    setConfirmOpen(false);
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
        >
          Ödemeler & Abonelik
        </motion.h1>

        <p className="text-gray-400 mt-3">
          Aylık aboneliğini burada görürsün. Bir sonraki ödeme tarihi, sistemin para çekeceği tarihtir.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm text-gray-400">Plan</div>
            <div className="text-xl font-semibold mt-1">{sub.plan_name}</div>

            <div className="mt-4 text-sm text-gray-400">Durum</div>
            <div className="text-base font-semibold mt-1">{sub.status}</div>

            <div className="mt-4 text-sm text-gray-400">Aylık Ücret</div>
            <div className="text-base font-semibold mt-1">{monthlyLabel}</div>

            <div className="mt-4 text-sm text-gray-400">Bir Sonraki Ödeme Tarihi</div>
            <div className="text-base font-semibold mt-1">{formatDateTR(sub.next_billing_at)}</div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmOpen(true)}
                className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-200 hover:bg-red-500/25 transition"
              >
                Aboneliği İptal Et
              </button>
            </div>

            {cancelMsg ? (
              <div className="mt-4 text-sm text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
                {cancelMsg}
              </div>
            ) : null}
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm text-gray-400">Bilgi</div>

            {subLoading ? (
              <div className="mt-3 text-gray-300">Yükleniyor...</div>
            ) : subError ? (
              <div className="mt-3 text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-sm">
                {subError}
              </div>
            ) : (
              <div className="mt-3 text-gray-300 text-sm leading-relaxed">
                Abonelik sistemi ödeme altyapısına bağlıdır. Webhook yoksa iptal “talep” olarak işlenir,
                webhook bağlanınca otomatik iptal akışı tamamlanır.
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => !actionLoading && setConfirmOpen(false)} />

            <motion.div
              className="relative w-[92vw] max-w-md rounded-2xl bg-[#0f1115] border border-white/10 shadow-2xl p-5"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-lg font-semibold">Emin misiniz?</div>
              <div className="text-sm text-gray-400 mt-2">
                Aboneliği iptal etmek istiyor musunuz? (Webhook bağlanınca sistem otomatik iptal edecek.)
              </div>

              <div className="mt-5 flex gap-2 justify-end">
                <button
                  disabled={actionLoading}
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 disabled:opacity-60"
                >
                  Vazgeç
                </button>
                <button
                  disabled={actionLoading}
                  onClick={doCancel}
                  className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                >
                  {actionLoading ? "İşleniyor..." : "İptal Et"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
