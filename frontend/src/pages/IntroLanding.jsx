// src/pages/IntroLanding.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function IntroLanding() {
  const navigate = useNavigate();
  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="text-white bg-black min-h-screen">
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-12 lg:px-16 pt-24 pb-20">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <motion.div variants={fadeUp} className="subtitle text-accent text-sm tracking-[0.2em] uppercase">
                Hukuk için yapay zekâ
              </motion.div>
              <motion.h1 variants={fadeUp} className="mt-4 text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
                Premium hız, premium doğruluk.
              </motion.h1>
              <motion.div variants={fadeUp} className="mt-6 h-px w-20 bg-[var(--miron-gold)] opacity-60" />
              <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-muted text-lg leading-relaxed">
                MIRON AI; dilekçe üretimi, evrak analizi, emsal arama ve strateji desteğini tek bir
                akışta birleştirir. Minimal arayüz, güçlü sonuçlar.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="btn-primary">
                  Kaydol
                </Link>
                <button type="button" onClick={() => navigate("/demo-request")} className="btn-secondary">
                  Demo Talebi Oluştur
                </button>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
                <div className="card p-4">
                  <div className="text-accent text-xs tracking-[0.2em] uppercase subtitle">Hız</div>
                  <div className="mt-2 text-sm text-muted">Saniyeler içinde özet, analiz ve taslak.</div>
                </div>
                <div className="card p-4">
                  <div className="text-accent text-xs tracking-[0.2em] uppercase subtitle">Netlik</div>
                  <div className="mt-2 text-sm text-muted">Odaklı çıktılar, gereksiz gürültü yok.</div>
                </div>
                <div className="card p-4">
                  <div className="text-accent text-xs tracking-[0.2em] uppercase subtitle">Güven</div>
                  <div className="mt-2 text-sm text-muted">KVKK uyumlu yaklaşım, güvenli akış.</div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                variants={fadeUp}
                className="card p-8"
              >
                <div className="subtitle text-accent text-xs tracking-[0.2em] uppercase">Öne çıkanlar</div>
                <div className="mt-4 space-y-4">
                  {[
                    { t: "Evrak analizi", d: "PDF/DOCX/TXT yükleyin, özet + bulgular alın." },
                    { t: "Dilekçe üretimi", d: "Yapılandırılmış form ile hızlı taslak." },
                    { t: "Emsal arama", d: "Yargıtay kararları içinde hızlı arama." },
                    { t: "Strateji", d: "Risk ve yönlendirme çıktıları." },
                  ].map((item) => (
                    <div key={item.t} className="flex gap-3">
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--miron-gold)] opacity-80" />
                      <div>
                        <div className="subtitle font-bold">{item.t}</div>
                        <div className="text-sm text-subtle mt-1">{item.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="max-w-7xl mx-auto px-6 sm:px-10 md:px-12 lg:px-16 py-20"
      >
        <motion.div variants={fadeUp} className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4">
            <div className="subtitle text-accent text-sm tracking-[0.2em] uppercase">Nasıl çalışır</div>
            <h2 className="mt-4 text-3xl sm:text-4xl leading-tight">Daha az adım. Daha çok sonuç.</h2>
            <div className="mt-6 h-px w-20 bg-[var(--miron-gold)] opacity-60" />
          </div>
          <div className="lg:col-span-8 grid md:grid-cols-3 gap-6">
            {[
              { k: "1", t: "Belgeyi yükleyin", d: "Evrak analizi veya dilekçe akışını seçin." },
              { k: "2", t: "Hedefi belirleyin", d: "Kısa bilgilerle bağlamı netleştirin." },
              { k: "3", t: "Çıktıyı alın", d: "Özet, öneri ve taslağı düzenleyip kullanın." },
            ].map((s) => (
              <motion.div key={s.k} variants={fadeUp} className="card p-6">
                <div className="text-accent subtitle text-xs tracking-[0.2em] uppercase">{s.k}</div>
                <div className="mt-3 subtitle font-bold text-lg">{s.t}</div>
                <div className="mt-2 text-sm text-muted">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
        className="max-w-7xl mx-auto px-6 sm:px-10 md:px-12 lg:px-16 pb-20"
      >
        <motion.div variants={fadeUp} className="card p-10">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="subtitle text-accent text-sm tracking-[0.2em] uppercase">Güvenlik</div>
              <h2 className="mt-4 text-3xl sm:text-4xl leading-tight">Güvenli, tutarlı, profesyonel.</h2>
              <p className="mt-5 text-muted leading-relaxed">
                Arayüz minimum, yaklaşım maksimum güven odaklı. Hassas veriler için kontrollü akış ve
                okunabilir sonuçlar.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="space-y-3">
                {["KVKK uyumlu yaklaşım", "Okunabilir çıktı formatı", "Net görsel hiyerarşi", "Düşük dikkat dağıtımı"].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="h-px w-8 bg-[var(--miron-gold)] opacity-50" />
                    <div className="text-sm text-muted">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={stagger}
        className="max-w-5xl mx-auto px-6 sm:px-10 md:px-12 lg:px-16 py-20"
      >
        <motion.div variants={fadeUp} className="text-center">
          <div className="subtitle text-accent text-sm tracking-[0.2em] uppercase">SSS</div>
          <h2 className="mt-4 text-3xl sm:text-4xl">Sıkça sorulan sorular</h2>
          <div className="mx-auto mt-6 h-px w-20 bg-[var(--miron-gold)] opacity-60" />
        </motion.div>

        <div className="mt-10 space-y-4">
          {[
            { q: "Demo hesabım ne kadar süreyle geçerli?", a: "Demo hesaplar 15 gün boyunca aktif kalır." },
            { q: "Belgelerim güvenli mi?", a: "Veri güvenliği odaklı bir yaklaşım uygulanır ve arayüz minimum veri ifşası hedefler." },
            { q: "Hangi dosya türleri destekleniyor?", a: "PDF, DOCX ve TXT ile temel analiz akışları kullanılabilir." },
            { q: "Ekip üyelerimle aynı hesabı kullanabilir miyim?", a: "Her hesap tek kullanıcı içindir." },
          ].map((faq) => (
            <motion.details key={faq.q} variants={fadeUp} className="card p-5 cursor-pointer">
              <summary className="subtitle font-bold text-lg text-[var(--miron-gold)]">
                {faq.q}
              </summary>
              <p className="mt-3 text-muted leading-relaxed">{faq.a}</p>
            </motion.details>
          ))}
        </div>
      </motion.section>

      <footer className="py-12 border-t border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-12 lg:px-16 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-subtle">© 2025 Miron Intelligence. Tüm hakları saklıdır.</div>
          <div className="flex gap-6 text-sm text-subtle">
            <Link to="/privacy" className="hover:text-[var(--miron-gold)] transition">
              Gizlilik
            </Link>
            <Link to="/terms" className="hover:text-[var(--miron-gold)] transition">
              Şartlar
            </Link>
            <Link to="/user-agreement" className="hover:text-[var(--miron-gold)] transition">
              Kullanıcı Sözleşmesi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
