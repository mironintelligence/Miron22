import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

const RECENT_KEY = "miron_recent_yargitay_queries";

const baseTiles = [
  {
    title: "Evrak Analizi",
    desc: "PDF/DOCX/TXT/UDF/RTF/UYAP/ODT yükle, AI analiz etsin.",
    to: "/analyze",
    disabled: false,
  },
  {
    title: "Miron Assistant",
    desc: "Dava özelinde soru-cevap, delil analizi.",
    to: "/assistant",
    disabled: false,
  },
  {
    title: "Dilekçe Oluşturucu",
    desc: "AI destekli otomatik dilekçe oluştur.",
    to: "/pleadings",
    disabled: false,
  },
  {
    title: "Hesaplamalar",
    desc: "Faiz, vekalet, harç, KDV ve icra hesapları.",
    to: "/calculators",
    disabled: false,
  },
  {
    title: "Sözleşme Analizi",
    desc: "Sözleşmeni yapıştır, riskleri ve açıkları gör.",
    to: "/contracts/analysis",
    disabled: false,
  },
  {
    title: "Sözleşme Oluşturucu",
    desc: "Şablon seç, alanları doldur, sözleşmeyi üret.",
    to: "/contracts/builder",
    disabled: false,
  },
  {
    title: "Dava Simülasyonu",
    desc: "Senaryoya göre olası sonuçlar ve strateji önerisi.",
    to: "/case-simulation",
    disabled: false,
  },
  {
    title: "Yargıtay Karar Arama",
    desc: "AI destekli emsal karar ve strateji analizi.",
    to: "/yargitay",
    beta: true,
    disabled: false,
  },
  {
    title: "Mevzuat Analizi",
    desc: "Kanun / madde bazlı AI açıklama ve strateji.",
    to: "/mevzuat",
    beta: true,
    disabled: false,
  },
  {
    title: "Risk & Strateji Analizi",
    desc: "AI tabanlı risk puanı, kazanma olasılığı ve strateji önerileri.",
    to: "/risk",
    disabled: false,
  },
  {
    title: "Dava Hatırlatıcı",
    desc: "Dava tarihlerini kaydet, uygulama içi bildirim al.",
    to: "/reminders",
    disabled: false,
  },
  {
    title: "Geri Bildirim",
    desc: "Öneri, hata bildirimi ve isteklerini bize ilet.",
    to: "/feedback",
    disabled: false,
  },
];

export default function Home() {
  const { user } = useAuth();

  const tiles = useMemo(() => {
    const list = [...baseTiles];
    if (user?.role === "admin") {
      list.unshift({
        title: "Admin Paneli",
        desc: "Kullanıcılar, demo talepleri ve sistem ayarları.",
        to: "/admin",
        disabled: false,
      });
      list.splice(1, 0, {
        title: "Raporlama Paneli",
        desc: "Kullanım istatistikleri ve grafikler (yönetici).",
        to: "/admin/metrics",
        disabled: false,
      });
    }
    return list;
  }, [user?.role]);

  const recentQueries = useMemo(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <div className="pb-28 max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2d6a9f] px-6 sm:px-8 py-7 text-white shadow-lg border border-white/10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Hoş geldiniz</h2>
            <p className="text-sm opacity-85 mt-1">
              Miron Hukuk Asistanı — modüllere buradan hızlıca erişin.
            </p>
            {(user?.firstName || user?.lastName) && (
              <p className="text-xs opacity-75 mt-2">
                {user.firstName} {user.lastName}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Aktif modül", value: "—" },
          { label: "Son oturum", value: "—" },
          { label: "Bildirimler", value: "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="glass rounded-xl px-4 py-4 border border-white/10 flex flex-col gap-1"
          >
            <div className="text-[11px] uppercase tracking-wide text-subtle">{s.label}</div>
            <div className="text-lg font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {recentQueries.length > 0 ? (
        <div className="glass rounded-2xl px-5 py-4 border border-white/10">
          <div className="text-xs font-semibold text-subtle mb-2">Son aramalar</div>
          <ul className="flex flex-wrap gap-2">
            {recentQueries.map((q, i) => (
              <li key={`${q}-${i}`}>
                <Link
                  to={`/yargitay`}
                  state={{ q }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15"
                >
                  {q}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="glass px-5 sm:px-8 py-8 rounded-2xl border border-white/10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">Modüller</h2>
          <p className="text-sm text-subtle mt-1">MIRON AI araçları</p>
        </div>

        <div
          className="grid gap-5 w-full"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {tiles.map((t, i) => {
            const TileTag = t.disabled ? "div" : Link;
            const common =
              "glass p-5 h-full min-h-[140px] flex flex-col justify-between hover:scale-[1.02] transition border border-white/10 rounded-xl";

            return (
              <motion.div
                key={`${t.title}-${t.to}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TileTag
                  to={t.disabled ? undefined : t.to}
                  className={
                    common +
                    (t.disabled ? " opacity-60 cursor-not-allowed" : " hover:shadow-lg hover:bg-white/5")
                  }
                >
                  <div className="flex gap-3 items-start">
                    <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-[var(--miron-gold)] shrink-0">
                      {t.title.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold flex flex-wrap items-center gap-2">
                        <span>{t.title}</span>
                        {t.beta ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-white/80">
                            BETA
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-sm text-subtle mt-1">{t.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-right text-accent text-sm">
                    {t.disabled ? "Yakında" : "Aç"}
                  </div>
                </TileTag>
              </motion.div>
            );
          })}
        </div>
      </div>

      <footer className="mt-10 mb-6 text-center text-xs text-subtle">
        <div>2025 Miron Intelligence — Tüm hakları saklıdır</div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Link to="/user-agreement" className="text-accent underline">
            Kullanıcı Sözleşmesi
          </Link>
          <Link to="/privacy" className="text-accent underline">
            Gizlilik Politikası
          </Link>
          <Link to="/terms" className="text-accent underline">
            Kullanım Şartları
          </Link>
        </div>

        <div className="mt-2">
          <a href="mailto:mironintelligence@gmail.com" className="text-accent underline">
            mironintelligence@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
