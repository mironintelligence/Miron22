import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miron_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (value) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez izni"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0a0a0a] border-t border-white/10 px-5 py-4 md:px-8 md:py-5"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="text-[12px] text-white/60 leading-relaxed flex-1">
          Bu site işlevsel zorunlu çerezler kullanmaktadır. Analitik ve pazarlama çerezleri için onayınız gereklidir.
          Ayrıntılar için{" "}
          <Link
            to="/legal/cookie"
            className="text-[var(--miron-gold)] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Çerez Politikası
          </Link>
          'nı inceleyebilirsiniz.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => save("necessary")}
            className="px-4 py-2 text-[11px] font-ui tracking-[0.12em] uppercase border border-white/20 text-white/60 hover:border-white/40 hover:text-white/80 transition-colors"
          >
            Yalnızca Zorunlu
          </button>
          <button
            onClick={() => save("all")}
            className="px-4 py-2 text-[11px] font-ui tracking-[0.12em] uppercase bg-[var(--miron-gold)] text-black font-semibold hover:opacity-85 transition-opacity"
          >
            Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
