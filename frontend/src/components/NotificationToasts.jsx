import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";

export default function NotificationToasts() {
  const { status } = useAuth();
  const seenRef = useRef(new Set());
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (status !== "authed") return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await authFetch("/api/notifications");
        if (!res.ok) return;
        const list = await res.json();
        if (cancelled || !Array.isArray(list)) return;

        const now = Date.now();
        const next = [];
        for (const n of list.slice(0, 20)) {
          if (!n?.id) continue;
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
      } catch (e) {
        return;
      }
    };

    tick();
    const iv = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [status]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (status !== "authed" || !toasts.length) return null;

  return (
    <div className="fixed top-24 right-4 z-[60] w-[360px] max-w-[92vw] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="bg-black/80 border border-white/15 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-white/60 mb-1">
                {t.type === "admin" ? "Duyuru" : t.type === "case_reminder" ? "Hatırlatma" : "Sistem"}
              </div>
              <div className="font-semibold text-white truncate">{t.title}</div>
              <div className="text-xs text-white/70 mt-1 break-words">{t.message}</div>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-white/50 hover:text-white text-sm"
              aria-label="Bildirimi kapat"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
