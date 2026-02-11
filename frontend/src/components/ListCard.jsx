import React from "react";
import { motion } from "framer-motion";

export default function ListCard({ title, subtitle, right, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{
        scale: 1.015,
        boxShadow: "0 0 0 1px rgba(255,215,0,0.35), 0 18px 45px rgba(0,0,0,0.55)",
      }}
      className="glass p-4"
    >
      <div className="flex justify-between gap-3 items-start">
        <div>
          <div className="font-extrabold text-sm">{title}</div>
          {subtitle ? <div className="text-xs text-subtle mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </motion.div>
  );
}
