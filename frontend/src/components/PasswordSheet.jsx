import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Şifre belirleme — prompt yerine sheet. */
export default function PasswordSheet({ open, title, email, onResolve }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open, email]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onResolve?.(null)}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-medium text-white">{title}</h2>
              <p className="mt-1 text-xs text-zinc-500 break-all">{email}</p>
              <label className="mt-4 block text-xs text-zinc-500 uppercase tracking-wide">Yeni şifre</label>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#a8c7fa]/50"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="En az 8 karakter, büyük/küçük/rakam/özel"
              />
            </div>
            <div className="flex justify-end gap-2 px-4 py-4 border-t border-white/5 bg-black/20">
              <button
                type="button"
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[#a8c7fa] hover:bg-white/5"
                onClick={() => onResolve?.(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="rounded-full bg-[#a8c7fa] px-4 py-2.5 text-sm font-semibold text-[#041e49] hover:brightness-95"
                onClick={() => onResolve?.(value.trim() || null)}
              >
                Kaydet
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
