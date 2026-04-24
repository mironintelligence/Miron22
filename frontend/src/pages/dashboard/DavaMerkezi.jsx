import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, Scale, Calendar } from "lucide-react";

export default function DavaMerkezi() {
  return (
    <div className="min-h-0 w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="font-heading text-2xl text-white sm:text-3xl">Dava Merkezi</h1>
        <p className="text-subtle mt-1 max-w-2xl text-sm" style={{ lineHeight: 1.55 }}>
          Dava, süre ve stratejiye dair hızlı erişim. Miron AI asistanı ile aynı oturumda yanıt alın.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/dashboard/assistant"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <MessageSquare className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Miron AI
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Dava, dilekçe, delil ve süre hakkında soru sorun; net yanıt alın.
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
                <Scale className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Dilekçe Oluşturucu
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Dilekçe taslağı ve şablonlar.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/reminders"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <Calendar className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Dava hatırlatıcı
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Tarih ve etkinlikleri takip edin.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FFD700] transition" />
          </Link>
          <Link
            to="/case-simulation"
            className="card group flex items-start justify-between gap-3 !p-4 no-underline transition hover:border-white/20"
          >
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-medium text-white">
                <Scale className="h-4 w-4 text-[#FFD700]" strokeWidth={1.5} />
                Dava simülasyonu
              </p>
              <p className="text-subtle m-0 mt-1.5 text-xs" style={{ lineHeight: 1.45 }}>
                Senaryolara göre strateji önizlemesi.
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
