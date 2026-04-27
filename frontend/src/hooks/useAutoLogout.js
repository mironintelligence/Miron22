import { useCallback, useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 dakika
const ACTIVITY_EVENTS = ["mousemove", "keydown", "pointerdown", "touchstart", "scroll", "click"];

/**
 * 30 dakika hareketsizlik sonrası oturumu kapatır.
 * localStorage, sessionStorage ve IndexedDB temizlenir.
 *
 * @param {object} opts
 * @param {() => Promise<void>} opts.onLogout  - logout API çağrısı (auth context'ten gelir)
 * @param {boolean}             opts.enabled   - false ise hook pasif kalır (giriş yapılmamışsa)
 * @param {number}              [opts.timeoutMs] - override için; varsayılan 30 dk
 */
export function useAutoLogout({ onLogout, enabled, timeoutMs = IDLE_TIMEOUT_MS }) {
  const timerRef = useRef(null);
  const logoutRef = useRef(onLogout);

  // onLogout referansını güncel tut (closure stale olmasın)
  useEffect(() => {
    logoutRef.current = onLogout;
  }, [onLogout]);

  const clearClientStorage = useCallback(async () => {
    localStorage.clear();
    sessionStorage.clear();

    // IndexedDB temizle (varsa)
    try {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((db) => {
        return new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = resolve;
          req.onerror = resolve; // hata olsa da devam
        });
      }));
    } catch {
      // IndexedDB.databases() bazı eski tarayıcılarda yoktur — sessizce geç
    }
  }, []);

  const triggerLogout = useCallback(async () => {
    await clearClientStorage();
    try {
      await logoutRef.current?.();
    } catch {
      // Network hatası olsa bile local temizlik tamamdır
    }
  }, [clearClientStorage]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(triggerLogout, timeoutMs);
  }, [triggerLogout, timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [enabled, resetTimer]);
}
