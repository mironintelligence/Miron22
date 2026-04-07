import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Welcome() {
  const { user, consumeLastLoginMeta } = useAuth();
  const navigate = useNavigate();
  const metaRef = useRef(null);

  if (!metaRef.current) {
    metaRef.current = consumeLastLoginMeta?.() || { at: Date.now(), name: "" };
  }

  const name = useMemo(() => {
    const fromMeta = metaRef.current?.name || "";
    if (fromMeta) return fromMeta;
    const full = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return full || user?.email || "Merhaba";
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      navigate("/contracts/analysis", { replace: true });
    }, 1600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="fixed inset-0 top-20 bottom-20 flex items-center justify-center px-6 z-0">
      <div className="relative w-full max-w-xl mx-auto">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-[rgba(255,215,0,0.08)] blur-3xl" />
        </div>

        <motion.div
          className="glass px-10 py-12 rounded-2xl text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-subtle mb-3">Miron Intelligence</div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">
            Hoş geldiniz, <span className="text-accent">{name}</span>
          </h1>
          <p className="mt-4 text-sm text-subtle">Sözleşme analizine yönlendiriliyorsunuz…</p>
          <motion.div
            className="mt-8 h-[2px] w-full bg-[rgba(255,215,0,0.18)] overflow-hidden rounded-full mx-auto max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full w-1/2 bg-[rgba(255,215,0,0.9)]"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
