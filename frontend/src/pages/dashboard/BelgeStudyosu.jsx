import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, FileSearch, Wand2, ArrowRight } from "lucide-react";

export default function BelgeStudyosu() {
  return (
    <div className="min-h-0 w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="font-heading text-2xl text-white sm:text-3xl">Belge stüdyosu</h1>
        <p className="text-subtle mt-1 max-w-2xl text-sm" style={{ lineHeight: 1.55 }}>
          Belge hazırlama, analiz ve taslak için araçlara hızlı erişim.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/analyze"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <FileSearch className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Evrak analizi
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Yüklenen belgelerde AI ile analiz.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/pleadings"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <Wand2 className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Dilekçe
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Dilekçe oluşturma ve taslaklar.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/contracts/builder"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <FileText className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Sözleşme oluşturucu
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Şablonlardan sözleşme üretimi.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/contracts/analysis"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <FileText className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Sözleşme analizi
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Mevcut metinde risk taraması.
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
