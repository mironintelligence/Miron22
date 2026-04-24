import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Gavel, Search } from "lucide-react";

export default function Arastirma() {
  return (
    <div className="min-h-0 w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="font-heading text-2xl text-white sm:text-3xl">Araştırma</h1>
        <p className="text-subtle mt-1 max-w-2xl text-sm" style={{ lineHeight: 1.55 }}>
          Mevzuat, emsal ve karar taraması için hızlı giriş noktaları.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/yargitay"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <Gavel className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Yargıtay arama
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Emsal karar ve gerekçe taraması.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/mevzuat"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <BookOpen className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Mevzuat analizi
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Kanun ve maddelere dair açıklama.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/dashboard/assistant"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline sm:col-span-2 transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <Search className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Araştırma sorusu (Miron AI)
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Araştırma stratejisi, anahtar kelimeler ve özet için sohbet açın.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
        </div>
        <p className="text-subtle mt-8 text-xs">Ana menüye dön: <Link to="/dashboard" className="text-[#FFD700] hover:underline">Gösterge</Link></p>
      </motion.div>
    </div>
  );
}
