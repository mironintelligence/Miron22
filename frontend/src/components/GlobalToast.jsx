import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subscribeToast } from "../utils/toastBus";

export default function GlobalToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    return subscribeToast((t) => {
      setToast(t);
      const ms = t.variant === "error" ? 6000 : 4000;
      window.setTimeout(() => setToast(null), ms);
    });
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium max-w-md text-center ${
            toast.variant === "error"
              ? "bg-red-950/95 border-red-500/50 text-red-100"
              : "bg-zinc-900/95 border-white/10 text-white"
          }`}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
