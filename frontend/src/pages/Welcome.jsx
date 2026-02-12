import React, { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function GavelMark() {
  return (
    <svg viewBox="0 0 240 240" className="w-[220px] h-[220px]">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,215,0,0.85)" />
          <stop offset="1" stopColor="rgba(255,215,0,0.25)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#g)" strokeWidth="2">
        <path d="M78 84l22-22 38 38-22 22z" />
        <path d="M104 58l10-10 38 38-10 10z" />
        <path d="M124 98l46 46" />
        <path d="M156 156l28 28" />
        <path d="M62 182c36-10 78-10 116 0" opacity="0.7" />
      </g>
    </svg>
  );
}

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
    return full || user?.email || "Welcome";
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 1000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-16">
      <div className="relative w-full max-w-3xl mx-auto px-6">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-black" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[rgba(255,215,0,0.08)] blur-3xl" />
          <div className="absolute inset-x-0 top-10 h-px bg-[rgba(255,215,0,0.35)]" />
          <div className="absolute inset-x-0 bottom-10 h-px bg-[rgba(255,215,0,0.18)]" />
        </div>

        <div className="glass px-8 py-10 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="subtitle text-sm text-subtle mb-2">
                  Miron Intelligence
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold">
                  <span className="text-white">Welcome, </span>
                  <span className="text-accent">{name}</span>
                </h1>
                <div className="mt-3 text-sm text-subtle">
                  Dashboard hazırlanıyor…
                </div>
              </motion.div>

              <motion.div
                className="mt-8 h-[2px] w-full bg-[rgba(255,215,0,0.18)] overflow-hidden rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <motion.div
                  className="h-full w-1/2 bg-[rgba(255,215,0,0.9)]"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />
              </motion.div>
            </div>

            <motion.div
              aria-hidden="true"
              className="relative justify-self-center"
              initial={{ opacity: 0, rotate: -6, scale: 0.96 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.div
                animate={{ rotate: [0, -1.5, 0], y: [0, 2, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="drop-shadow-[0_0_18px_rgba(255,215,0,0.12)]"
              >
                <GavelMark />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
