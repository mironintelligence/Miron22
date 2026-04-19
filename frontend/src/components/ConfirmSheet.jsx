import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Material benzeri, animasyonlu onay (native alert/confirm yerine).
 */
export default function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger = false,
  onResolve,
}) {
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
            transition={{ duration: 0.2 }}
            onClick={() => onResolve?.(false)}
          />
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] text-left shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-medium text-white tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-4 border-t border-white/5 bg-black/20">
              <button
                type="button"
                className="min-w-[88px] rounded-full px-4 py-2.5 text-sm font-medium text-[#a8c7fa] hover:bg-white/5 transition"
                onClick={() => onResolve?.(false)}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`min-w-[88px] rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  danger
                    ? "bg-[#f2b8b5] text-[#601410] hover:brightness-95"
                    : "bg-[#a8c7fa] text-[#041e49] hover:brightness-95"
                }`}
                onClick={() => onResolve?.(true)}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
