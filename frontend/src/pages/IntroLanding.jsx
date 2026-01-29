// src/pages/IntroLanding.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function IntroLanding() {
  const navigate = useNavigate();

  return (
    <div className="text-gray-100 bg-gradient-to-br from-[#0b0b0c] to-[#17181b] min-h-screen">
      {/* 🔹 Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-32 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
        >
          Türkiye’nin İlk Hukuk Odaklı Yapay Zekâ Asistanı
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-gray-400 max-w-2xl mt-6 text-lg"
        >
          MIRON AI, avukatlar için özel olarak geliştirilen, KVKK uyumlu ve
          tamamen güvenli bir yapay zekâ çözümüdür.
        </motion.p>

        <div className="flex gap-4 mt-10">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 transition shadow-lg"
          >
            🚀 Hemen Başla
          </Link>

          {/* ✅ Demo Talebi Butonu */}
          <button
            onClick={() => navigate("/demo-request")}
            className="px-6 py-3 rounded-xl border border-cyan-400/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition shadow-lg font-semibold"
          >
            🧠 Demo Talebi Oluştur
          </button>
        </div>
      </section>

      {/* 🔹 Özellik Kartları */}
      <section
        id="features"
        className="py-24 px-10 bg-white/5 backdrop-blur-sm rounded-t-3xl"
      >
        <h2 className="text-center text-3xl font-bold mb-12 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          MIRON AI’nin Temel Özellikleri
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: "⚖",
              title: "Dilekçe & Evrak Analizi",
              desc: "PDF veya Word belgelerini saniyeler içinde analiz eder, özetler ve hukuki eksiklikleri raporlar.",
            },
            {
              icon: "💬",
              title: "Miron Assistant",
              desc: "Avukatlara özel eğitilmiş yapay zekâ sohbet asistanı: mevzuat soruları, metin düzenleme ve hukuki tavsiye desteği.",
            },

            {
              icon: "📑",
              title: "Otomatik Dilekçe Oluşturma",
              desc: "Davaya uygun şablonlarla hızlı dilekçe taslakları üretir; eksik alanları otomatik işaretler.",
            },
            {
              icon: "📊",
              title: "Risk & Strateji Analizi",
              desc: "Yüklenen dosyaları değerlendirip dava kazanma ihtimali, risk faktörleri ve önerilen stratejiler sunar.",
            },
            {
              icon: "🔐",
              title: "KVKK & Güvenlik",
              desc: "Tüm verileriniz KVKK standartlarına uygun olarak şifrelenir. Üçüncü taraflara paylaşım yok, güvenlik önceliğimiz.",
            },
            {
              icon: "🏛",
              title: "Yargıtay Karar Arama",
              desc: "Anahtar kelimeyle Yargıtay kararlarını hızlıca bulur, ilgili emsal önerilerini ve kısa özetini çıkarır.(Yakında)",
            },
            {
              icon: "🎯",
              title: "Dava Simülasyonu ",
              desc: "Senaryonu gir, Miron AI olası riskleri, güçlü/zayıf yönleri ve önerilen stratejiyi simüle edip özet bir plan çıkarır.(Yakında)",
            },
            {
              icon: "📚",
              title: "Mevzuat Analizi",
              desc: "Kanun maddelerini analiz eder, ilgili hükümleri madde madde açıklar ve dilekçe stratejisine bağlar.(Yakında)",
            },
            {
              icon: "🧮",
              title: "Hesaplama Araçları",
              desc: "Kıdem/ihbar, kira artışı, faiz ve benzeri hukuki hesaplamaları hızlıca yapar ve çıktıyı raporlar.",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🔹 Avantajlar */}
      <section className="py-20 px-10">
        <h2 className="text-center text-3xl font-bold mb-12 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          MIRON AI ile Farkı Hissedin
        </h2>

        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            "📚 Belgeleri %98 doğrulukla özetler.",
            "⚖ Anında Karar Emsali Bulur Ve Yoldaki En Büyük Yardımcınız Olur.",
            "🤖 7/24 hizmet veren yapay zekâ altyapısı.",
            "🏛 Yargıtay emsalini saniyeler içinde tarar.",
            "📚 Mevzuatı maddeler halinde analiz eder.",
            "🧮 Hesaplamaları tek tıkla raporlar.",
          ].map((adv, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-center"
            >
              <p className="text-lg font-medium text-gray-300">{adv}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-10 flex flex-col md:flex-row items-center justify-center gap-16 bg-white/5 backdrop-blur-md">
        <motion.img
          src="/libra-logo.png"
          alt="Libra Logo"
          className="w-40 h-40"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 10px 30px rgba(0,180,200,0.15))" }}
        />

        <div className="max-w-xl">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Neden MIRON AI?
          </h2>
          <p className="text-gray-400 leading-relaxed">
            MIRON AI, Türk hukuk sistemi ve yerel veri setleriyle eğitilmiş özel
            bir yapay zekâ modelidir. Avukatların günlük iş yükünü azaltmak,
            dava süreçlerini hızlandırmak ve belge doğruluğunu artırmak için
            geliştirilmiştir.
          </p>
        </div>
      </section>

      {/* 🔹 SSS */}
      <section className="py-20 px-10 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-10 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Sıkça Sorulan Sorular
        </h2>

        {[
          {
            q: "Demo hesabım ne kadar süreyle geçerli?",
            a: "Demo hesaplar 15 gün boyunca tüm özellikleriyle aktif kalır.",
          },
          {
            q: "Belgelerim güvenli mi?",
            a: "Tüm Belgelerinizi Sadece Siz Ve Yapay Zeka Görebilir Belgeleriniz Kaydedilmez.",
          },
          {
            q: "Miron AI hangi tür evrakları analiz eder?",
            a: "PDF, Word , Udf , Uyap ve TXT formatlarındaki her türlü hukuki belgeyi analiz edebilir.",
          },
          {
            q: "Ekip üyelerimle aynı hesabı kullanabilir miyim?",
            a: "Hayır, Her Hesap Tek Kişiliktir.",
          },
        ].map((faq, i) => (
          <details
            key={i}
            className="mb-4 bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer"
          >
            <summary className="font-semibold text-lg text-cyan-400">
              {faq.q}
            </summary>
            <p className="mt-2 text-gray-300">{faq.a}</p>
          </details>
        ))}
      </section>

      {/* 🔹 Footer */}
      <footer className="py-10 border-t border-white/10 bg-black/30 backdrop-blur-xl text-center text-sm text-gray-400">
        <p className="mb-2">©️ 2025 Miron Intelligence. Tüm hakları saklıdır.</p>
        <div className="flex justify-center gap-6 text-gray-400 text-sm">
          <Link to="/privacy" className="hover:text-cyan-400 transition">
            Gizlilik Politikası
          </Link>
          <Link to="/terms" className="hover:text-cyan-400 transition">
            Kullanım Şartları
          </Link>
          <Link to="/user-agreement" className="hover:text-cyan-400 transition">
            Kullanıcı Sözleşmesi
          </Link>
        </div>
      </footer>
    </div>
  );
}