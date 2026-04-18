import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "../auth/api";
import { useVisiblePolling } from "../hooks/useVisiblePolling";
import { useAuth } from "../auth/AuthProvider";
import { AnimatePresence, motion } from "framer-motion";

async function markNotificationRead(id) {
  try {
    await authFetch(`/api/notifications/${encodeURIComponent(String(id))}/read`, { method: "POST" });
    window.dispatchEvent(new Event("notifications:changed"));
  } catch {
    /* ignore */
  }
}

export default function NotificationToasts() {
  const { status } = useAuth();
  const seenRef = useRef(new Set());
  const [toasts, setToasts] = useState([]);

  // Was 8s (7.5 req/min/user). 60s is fine for a "new notification" toast;
  // the navbar badge handles the faster pulse.
  useVisiblePolling(
    async (signal) => {
      const res = await authFetch("/api/notifications");
      if (!res.ok) return;
      const list = await res.json();
      if (signal.cancelled || !Array.isArray(list)) return;

      const now = Date.now();
      const next = [];
      for (const n of list.slice(0, 20)) {
        if (!n?.id) continue;
        if (n.is_read) continue;
        if (seenRef.current.has(n.id)) continue;
        seenRef.current.add(n.id);
        const createdAt = n.created_at ? Date.parse(n.created_at) : now;
        const recent = now - createdAt < 24 * 60 * 60 * 1000;
        if (!recent) continue;
        next.push({
          id: n.id,
          title: n.title || "Bildirim",
          message: n.message || "",
          type: n.type || "system",
        });
      }
      if (next.length) {
        setToasts((prev) => [...next.slice(0, 3), ...prev].slice(0, 3));
      }
    },
    { enabled: status === "authed", intervalMs: 60000 },
    [status]
  );

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        markNotificationRead(t.id);
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 10000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const dismiss = (t) => {
    markNotificationRead(t.id);
    setToasts((prev) => prev.filter((x) => x.id !== t.id));
  };

  if (status !== "authed" || !toasts.length) return null;

  return (
    <div className="fixed top-5 right-4 z-[80] w-[380px] max-w-[92vw] space-y-3 pointer-events-auto">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -28, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, x: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="rounded-[1.15rem] border border-white/12 bg-zinc-900/85 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-4 ring-1 ring-white/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-white/50 mb-1 tracking-wide">
                  {t.type === "admin" ? "Duyuru" : t.type === "case_reminder" ? "Hatırlatma" : "Bildirim"}
                </div>
                <div className="font-semibold text-white text-[15px] leading-snug">{t.title}</div>
                <div className="text-[13px] text-white/75 mt-1.5 leading-relaxed break-words">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t)}
                className="shrink-0 text-white/40 hover:text-white text-lg leading-none px-1"
                aria-label="Bildirimi kapat"
              >
                
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
