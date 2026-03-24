import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

const baseTiles = [
  {
    title: "Evrak Analizi",
    desc: "PDF/DOCX/TXT/UDF/RTF/UYAP/ODT yükle, AI analiz etsin.",
    to: "/analyze",
    icon: "📂",
    disabled: false,
  },
  {
    title: "Miron Assistant",
    desc: "Dava özelinde soru-cevap, delil analizi.",
    to: "/assistant",
    icon: "💬",
    disabled: false,
  },
  {
    title: "Dilekçe Oluşturucu",
    desc: "AI destekli otomatik dilekçe oluştur.",
    to: "/pleadings",
    icon: "🧾",
    disabled: false,
  },
  {
    title: "Hesaplamalar",
    desc: "Faiz, vekalet, harç, KDV ve icra hesapları.",
    to: "/calculators",
    icon: "🧮",
    disabled: false,
  },

  {
    title: "Sözleşme Analizi",
    desc: "Sözleşmeni yapıştır, riskleri ve açıkları gör.",
    to: "/contracts/analysis",
    icon: "🧾",
    disabled: false,
  },
  {
    title: "Sözleşme Oluşturucu",
    desc: "Şablon seç, alanları doldur, sözleşmeyi üret.",
    to: "/contracts/builder",
    icon: "✍️",
    disabled: false,
  },
 

  // ✅ Yeni: Dava Simülasyonu (yakında)
  {
    title: "Dava Simülasyonu",
    desc: "Senaryoya göre olası sonuçlar ve strateji önerisi.",
    to: "/case-simulation",
    icon: "🎯",
    disabled: false,
  },

  // ✅ Yakında: Yargıtay / Mevzuat (launch’u bozmasın)
  {
    title: "Yargıtay Karar Arama",
    desc: "AI destekli emsal karar ve strateji analizi.",
    to: "/yargitay",
    icon: "⚖️",
    beta: true,
    disabled: false,
  },
  {
    title: "Mevzuat Analizi",
    desc: "Kanun / madde bazlı AI açıklama ve strateji.",
    to: "/mevzuat",
    icon: "📚",
    beta: true,
    disabled: false,
  },

  {
    title: "Risk & Strateji Analizi",
    desc: "AI tabanlı risk puanı, kazanma olasılığı ve strateji önerileri.",
    to: "/risk",
    icon: "🧠",
    disabled: false,
  },

  {
    title: "Dava Hatırlatıcı",
    desc: "Dava tarihlerini kaydet, uygulama içi bildirim al.",
    to: "/reminders",
    icon: "⏰",
    disabled: false,
  },

  {
    title: "Geri Bildirim",
    desc: "Öneri, hata bildirimi ve isteklerini bize ilet.",
    to: "/feedback",
    icon: "📝",
    disabled: false,
  },
];

export default function Home() {
  const { user } = useAuth();
  const isTrial = user?.subscriptionStatus === "trial" || user?.isDemo || user?.role === "demo";
  const tiles = [...baseTiles];
  if (user?.role === "admin") {
    tiles.unshift({
      title: "Admin Paneli",
      desc: "Kullanıcılar, demo talepleri ve sistem ayarları.",
      to: "/admin",
      icon: "🛡️",
      disabled: false,
    });
  }
  return (
    <div className="pb-28">
      <div className="glass px-6 py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">Hoş geldiniz</h2>
          <p className="text-sm text-subtle mt-1">MIRON AI modüllerini keşfedin.</p>
          {isTrial ? (
            <div className="mt-4">
              <Link to="/upgrade" className="inline-flex px-5 py-2 rounded-xl bg-[var(--miron-gold)] text-black font-semibold">
                Hesabı Yükselt
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiles.map((t, i) => {
            const TileTag = t.disabled ? "div" : Link;
            const common =
              "glass p-5 h-full flex flex-col justify-between hover:scale-[1.02] transition";

            return (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <TileTag
                  to={t.disabled ? undefined : t.to}
                  className={
                    common +
                    (t.disabled
                      ? " opacity-60 cursor-not-allowed"
                      : " hover:shadow-lg hover:bg-white/5")
                  }
                >
                  <div>
                    <div className="text-3xl">{t.icon}</div>
                    <h3 className="text-lg font-semibold mt-3 flex items-center gap-2">
                      <span>{t.title}</span>
                      {t.beta ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-white/80">
                          BETA
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-sm text-subtle mt-1">{t.desc}</p>
                  </div>
                  <div className="mt-4 text-right text-accent">
                    {t.disabled ? "Yakında" : "Aç"}
                  </div>
                </TileTag>
              </motion.div>
            );
          })}
        </div>
      </div>

      <footer className="mt-10 mb-6 text-center text-xs text-subtle">
        <div>©️ 2025 Miron Intelligence — Tüm hakları saklıdır</div>

        <div className="mt-2 flex items-center justify-center gap-4">
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
