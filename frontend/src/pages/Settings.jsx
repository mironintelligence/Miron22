import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import { emitToast } from "../utils/toastBus";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function formatDateTR(ts) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts * 1000 : ts);
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric", month: "long", day: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleDateString("tr-TR");
  }
}

function formatTRY(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
  } catch {
    return n + " TL";
  }
}

const STATUS_LABELS = {
  active: { label: "Aktif", color: "text-green-400" },
  cancel_requested: { label: "İptal Bekliyor", color: "text-amber-400" },
  cancelled: { label: "İptal Edildi", color: "text-red-400" },
  past_due: { label: "Ödeme Gecikmiş", color: "text-red-400" },
  paused: { label: "Duraklatıldı", color: "text-zinc-400" },
  free: { label: "Ücretsiz", color: "text-zinc-400" },
  unknown: { label: "Abonelik Yok", color: "text-zinc-500" },
};

function SubscriptionTab() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    setLoading(true);
    fetch(`${API_BASE}/api/stripe/subscription`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setSub(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const doCancel = async () => {
    setCancelling(true);
    const token = localStorage.getItem("access_token");
    try {
      const r = await fetch(`${API_BASE}/api/stripe/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "İşlem başarısız.");
      emitToast(data.message || "Abonelik iptal edildi.", "success");
      setSub((prev) => ({ ...prev, status: "cancel_requested" }));
      if (typeof refreshUser === "function") await refreshUser();
    } catch (e) {
      emitToast(e?.message || "İşlem başarısız.", "error");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-white/40 text-sm">Yükleniyor...</div>;
  }

  const statusInfo = STATUS_LABELS[sub?.status] || STATUS_LABELS.unknown;
  const isActive = sub?.status === "active";
  const hasSub = !!sub?.subscription_id;

  return (
    <div className="space-y-4">
      {/* Abonelik Kartı */}
      <div className="glass p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-base">Abonelik Durumu</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-white/40 text-xs mb-1">Plan</div>
            <div className="font-semibold text-white">
              {sub?.plan_name === "monthly" ? "Aylık" : sub?.plan_name === "yearly" ? "Yıllık" : (sub?.plan_name || "—")}
            </div>
          </div>
          <div>
            <div className="text-white/40 text-xs mb-1">Ücret</div>
            <div className="font-semibold text-white">
              {sub?.amount_try ? `${formatTRY(sub.amount_try)} / ${sub?.plan_name === "yearly" ? "yıl" : "ay"}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-white/40 text-xs mb-1">Abone Olma Tarihi</div>
            <div className="font-semibold text-white">{formatDateTR(sub?.started_at)}</div>
          </div>
          <div>
            <div className="text-white/40 text-xs mb-1">Sonraki Ödeme</div>
            <div className={`font-semibold ${sub?.status === "past_due" ? "text-red-400" : "text-white"}`}>
              {sub?.status === "cancel_requested" ? "Ödeme alınmayacak" : formatDateTR(sub?.next_billing_at)}
            </div>
          </div>
        </div>

        {sub?.subscription_id && (
          <div className="mt-4 text-[10px] text-white/20 font-mono break-all">
            {sub.subscription_id}
          </div>
        )}
      </div>

      {/* İptal */}
      {isActive && (
        <div className="glass p-5 rounded-2xl border border-white/10">
          <h3 className="font-semibold text-white text-sm mb-1">Abonelik Yönetimi</h3>
          <p className="text-xs text-white/40 mb-3">
            İptal ettiğinizde mevcut dönem sonuna kadar erişiminiz devam eder. Sonraki ödemede ücret alınmaz.
          </p>
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-full py-3 rounded-xl border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/10 transition"
          >
            Aboneliği İptal Et
          </button>
        </div>
      )}

      {sub?.status === "cancel_requested" && (
        <div className="glass p-5 rounded-2xl border border-amber-500/20">
          <p className="text-amber-300/80 text-sm">
            Aboneliğiniz <span className="font-bold">{formatDateTR(sub?.next_billing_at)}</span> tarihinde sona erecek.
            Bu tarihe kadar tüm özelliklere erişiminiz devam eder, sonraki ödeme alınmaz.
          </p>
        </div>
      )}

      {sub?.status === "cancelled" && (
        <div className="glass p-5 rounded-2xl border border-white/10 text-center">
          <p className="text-white/50 text-sm mb-4">Aboneliğiniz sona erdi.</p>
          <a href="/pricing" className="inline-block px-6 py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold hover:brightness-110 transition text-sm">
            Yeni Plan Satın Al
          </a>
        </div>
      )}

      {!hasSub && sub?.status !== "active" && sub?.status !== "cancel_requested" && sub?.status !== "cancelled" && (
        <div className="glass p-5 rounded-2xl border border-white/10 text-center">
          <p className="text-white/50 text-sm mb-4">Aktif bir aboneliğiniz bulunmuyor.</p>
          <a href="/pricing" className="inline-block px-6 py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold hover:brightness-110 transition text-sm">
            Plan Satın Al
          </a>
        </div>
      )}

      {/* Onay Modalı */}
      <AnimatePresence>
        {confirmCancel && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => !cancelling && setConfirmCancel(false)} />
            <motion.div
              className="relative w-[92vw] max-w-md rounded-2xl bg-[#0f1115] border border-white/10 shadow-2xl p-6"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <div className="text-lg font-bold text-white mb-2">Aboneliği İptal Et</div>
              <p className="text-sm text-white/60 mb-5">
                Mevcut dönem sonuna kadar erişiminiz devam eder. Sonraki ödeme tarihinde ücret alınmaz ve aboneliğiniz sona erer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  disabled={cancelling}
                  onClick={() => setConfirmCancel(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm hover:bg-white/20 disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  disabled={cancelling}
                  onClick={doCancel}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm font-bold hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {cancelling ? "İşleniyor..." : "İptal Et"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [connection, setConnection] = useState("Bilinmiyor");
  const [loggingOut, setLoggingOut] = useState(false);

  const activeTab = searchParams.get("tab") || "genel";
  const setTab = (tab) => setSearchParams(tab === "genel" ? {} : { tab });

  const testConnection = async () => {
    try {
      const r = await fetch(`${API_BASE}/`);
      setConnection(r.ok ? "Bağlantı başarılı" : "Sunucuya erişilemiyor");
    } catch {
      setConnection("Sunucuya erişilemiyor");
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      emitToast("Oturum kapatıldı.", "success");
      navigate("/", { replace: true });
    } catch (e) {
      emitToast(e?.message || "Çıkış yapılamadı", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="premium-scope min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-1 text-accent">Ayarlar</h1>
      <p className="text-sm text-subtle mb-6">
        {user?.email ? `${user.firstName || ""} ${user.lastName || ""} · ${user.email}`.trim().replace(/^·\s*/, "") : ""}
      </p>

      <div className="flex gap-1 mb-6 border-b border-white/10">
        {[{ id: "genel", label: "Genel" }, { id: "abonelik", label: "Abonelik" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-[var(--miron-gold)] text-[var(--miron-gold)]"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "genel" && (
          <motion.div
            key="genel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="glass p-6 rounded-2xl">
              <h3 className="font-semibold mb-3">Bağlantı Testi</h3>
              <button type="button" onClick={testConnection} className="btn-primary text-sm">
                Test Et
              </button>
              <div className="mt-2 text-sm text-muted">{connection}</div>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/10">
              <h3 className="font-semibold mb-2">Oturumu Kapat</h3>
              <p className="text-xs text-subtle mb-4">
                Güvenlik için çıkış yalnızca buradan yapılır.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-100 font-semibold hover:bg-red-900/90 disabled:opacity-50"
              >
                {loggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === "abonelik" && (
          <motion.div
            key="abonelik"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SubscriptionTab />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center text-xs text-subtle mt-20 py-8 glass border-t border-white/10 rounded-t-2xl">
        © 2026 Miron GROUP LLC — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
