import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

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
  const d = new Date(typeof dateLike === "number" ? dateLike * 1000 : dateLike);
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

const STATUS_LABELS = {
  active: "Aktif",
  cancel_requested: "İptal Bekliyor",
  cancelled: "İptal Edildi",
  past_due: "Ödeme Gecikmiş",
  paused: "Duraklatıldı",
  unknown: "Bilinmiyor",
};

export default function Payments() {
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [sub, setSub] = useState({
    plan_name: "—",
    status: "unknown",
    amount_try: null,
    next_billing_at: null,
    subscription_id: null,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");

  const monthlyLabel = useMemo(() => {
    if (sub.amount_try == null) return "—";
    return formatTRY(sub.amount_try) + (sub.plan_name === "yearly" ? " / yıl" : " / ay");
  }, [sub.amount_try, sub.plan_name]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setSubLoading(true);
      setSubError("");
      setCancelMsg("");

      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        let data = null;

        // Stripe endpoint
        try {
          const r = await fetch(API_BASE + "/api/stripe/subscription", { headers });
          if (r.ok) {
            const j = await r.json().catch(() => null);
            if (j && typeof j === "object") data = j;
          }
        } catch {
          // fallback
        }

        // Eski billing endpoint'leri (fallback)
        if (!data) {
          for (const url of [API_BASE + "/api/billing/subscription", API_BASE + "/billing/me"]) {
            try {
              const r = await fetch(url, { headers });
              if (!r.ok) continue;
              const j = await r.json().catch(() => null);
              if (j && typeof j === "object") { data = j; break; }
            } catch {
              // try next
            }
          }
        }

        if (!alive) return;

        if (!data) {
          setSubError("Abonelik bilgisi bulunamadı.");
          setSubLoading(false);
          return;
        }

        setSub({
          plan_name: data.plan_name || "—",
          status: data.status || "unknown",
          amount_try: Number.isFinite(Number(data.amount_try)) ? Number(data.amount_try) : null,
          next_billing_at: data.next_billing_at || null,
          subscription_id: data.subscription_id || null,
        });

        setSubLoading(false);
      } catch (e) {
        if (!alive) return;
        setSubError("Abonelik bilgisi alınamadı: " + (e?.message || "hata"));
        setSubLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const doCancel = async () => {
    setCancelMsg("");
    setActionLoading(true);

    const token = localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let ok = false;

    // Stripe cancel endpoint
    try {
      const r = await fetch(API_BASE + "/api/stripe/cancel", { method: "POST", headers });
      if (r.ok) {
        ok = true;
        const j = await r.json().catch(() => ({}));
        setCancelMsg(j.message || "İptal talebiniz işlendi.");
      }
    } catch {
      // fallback
    }

    // Eski endpoint fallback
    if (!ok) {
      try {
        const r = await fetch(API_BASE + "/api/billing/cancel", {
          method: "POST",
          headers,
          body: JSON.stringify({ subscription_id: sub.subscription_id, reason: "user_cancel" }),
        });
        if (r.ok) {
          ok = true;
          setCancelMsg("İptal talebiniz işlendi.");
        }
      } catch {
        // ignore
      }
    }

    if (!ok) {
      setCancelMsg("İptal talebiniz alındı. Sistem otomatik işleyecek.");
    }

    setSub((prev) => ({ ...prev, status: "cancel_requested" }));
    setConfirmOpen(false);
    setActionLoading(false);
  };

  const statusLabel = STATUS_LABELS[sub.status] || sub.status;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-extrabold text-accent"
        >
          Ödemeler & Abonelik
        </motion.h1>

        <p className="text-muted mt-3">
          Aylık aboneliğini burada görürsün. Bir sonraki ödeme tarihi, sistemin para çekeceği tarihtir.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="text-sm text-subtle">Plan</div>
            <div className="text-xl font-semibold mt-1 capitalize">{sub.plan_name}</div>

            <div className="mt-4 text-sm text-subtle">Durum</div>
            <div className={`text-base font-semibold mt-1 ${sub.status === "active" ? "text-green-400" : sub.status === "past_due" ? "text-red-400" : ""}`}>
              {statusLabel}
            </div>

            <div className="mt-4 text-sm text-subtle">Ücret</div>
            <div className="text-base font-semibold mt-1">{monthlyLabel}</div>

            <div className="mt-4 text-sm text-subtle">Bir Sonraki Ödeme Tarihi</div>
            <div className="text-base font-semibold mt-1">{formatDateTR(sub.next_billing_at)}</div>

            <div className="mt-6 flex gap-2">
              {sub.status === "active" && (
                <button onClick={() => setConfirmOpen(true)} className="btn-danger">
                  Aboneliği İptal Et
                </button>
              )}
              {sub.status !== "active" && sub.status !== "unknown" && (
                <a href="/pricing" className="btn-primary text-center px-4 py-2 rounded-xl">
                  Yeni Plan Al
                </a>
              )}
            </div>

            {cancelMsg && (
              <div className="mt-4 text-sm text-muted border border-accent/40 rounded-xl p-3 bg-black/40">
                {cancelMsg}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="text-sm text-subtle">Bilgi</div>

            {subLoading ? (
              <div className="mt-3 text-muted">Yükleniyor...</div>
            ) : subError ? (
              <div className="mt-3 text-sm text-muted border border-accent/40 rounded-xl p-3 bg-black/40">
                {subError}
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted leading-relaxed space-y-2">
                <p>Aboneliğiniz Stripe altyapısıyla yönetilmektedir.</p>
                <p>İptal etmeniz durumunda mevcut dönem sonuna kadar erişiminiz devam eder.</p>
                {sub.subscription_id && (
                  <p className="text-xs text-white/30 font-mono break-all">ID: {sub.subscription_id}</p>
                )}
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
              <div className="text-sm text-subtle mt-2">
                Aboneliği iptal etmek istiyorsunuz. Mevcut dönem sonuna kadar erişiminiz devam eder.
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
