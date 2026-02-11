// src/pages/IntroLanding.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function IntroLanding() {
  const navigate = useNavigate();

  return (
    <div className="text-white bg-black min-h-screen">
      {/* 🔹 Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-32 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-6xl font-extrabold text-yellow-400"
        >
          Türkiye’nin İlk Hukuk Odaklı Yapay Zekâ Asistanı
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-white/80 max-w-2xl mt-6 text-lg"
        >
          MIRON AI, avukatlar için özel olarak geliştirilen, KVKK uyumlu ve
          tamamen güvenli bir yapay zekâ çözümüdür.
        </motion.p>

        <div className="flex gap-4 mt-10">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl font-semibold bg-yellow-400 text-black hover:bg-yellow-500 transition shadow-lg"
          >
            🚀 Hemen Başla
          </Link>

          {/* ✅ Demo Talebi Butonu */}
          <button
            onClick={() => navigate("/demo-request")}
            className="px-6 py-3 rounded-xl border border-yellow-500/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 transition shadow-lg font-semibold"
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
        <h2 className="text-center text-3xl font-bold mb-12 text-yellow-400">
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
              <p className="text-white/70 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🔹 Avantajlar */}
      <section className="py-20 px-10">
        <h2 className="text-center text-3xl font-bold mb-12 text-yellow-400">
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
              <p className="text-lg font-medium text-white/80">{adv}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 px-10 flex flex-col items-center justify-center gap-8 bg-white/5 backdrop-blur-md text-center">
        <h2 className="text-3xl font-bold text-yellow-400">Neden MIRON AI?</h2>
        <p className="text-white/80 leading-relaxed max-w-2xl">
          MIRON AI, Türk hukuk sistemi ve yerel veri setleriyle eğitilmiş özel bir yapay zekâ
          modelidir. Avukatların günlük iş yükünü azaltmak, dava süreçlerini hızlandırmak ve
          belge doğruluğunu artırmak için geliştirilmiştir.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-5 py-3 rounded-full border border-yellow-500/40 text-yellow-200 bg-yellow-500/10">
            Kurumsal güvenlik
          </div>
          <div className="px-5 py-3 rounded-full border border-white/20 text-white/80 bg-white/5">
            Hızlı analiz
          </div>
          <div className="px-5 py-3 rounded-full border border-white/20 text-white/80 bg-white/5">
            Stratejik içgörü
          </div>
        </div>
      </section>

      {/* 🔹 SSS */}
      <section className="py-20 px-10 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-10 text-yellow-400">
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
            <summary className="font-semibold text-lg text-yellow-300">
              {faq.q}
            </summary>
            <p className="mt-2 text-white/80">{faq.a}</p>
          </details>
        ))}
      </section>

      {/* 🔹 Footer */}
      <footer className="py-10 border-t border-white/10 bg-black/40 backdrop-blur-xl text-center text-sm text-white/70">
        <p className="mb-2">©️ 2025 Miron Intelligence. Tüm hakları saklıdır.</p>
        <div className="flex justify-center gap-6 text-white/70 text-sm">
          <Link to="/privacy" className="hover:text-yellow-300 transition">
            Gizlilik Politikası
          </Link>
          <Link to="/terms" className="hover:text-yellow-300 transition">
            Kullanım Şartları
          </Link>
          <Link to="/user-agreement" className="hover:text-yellow-300 transition">
            Kullanıcı Sözleşmesi
          </Link>
        </div>
      </footer>
    </div>
  );
}
