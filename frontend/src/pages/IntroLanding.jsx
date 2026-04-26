import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Gavel,
  Layers,
  Lock,
  Scale,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";

const GOLD = "#FFD700";
const BG = "#030303";
const SURFACE = "#0c0c0c";

const fade = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
};

function Section({ children, className = "" }) {
  return (
    <section
      className={`mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-28 ${className}`}
      style={{ color: "#e4e4e7" }}
    >
      {children}
    </section>
  );
}

export default function IntroLanding() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setN((v) => (v >= 94 ? 94 : v + 3));
    }, 40);
    const stop = setTimeout(() => clearInterval(t), 1200);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, []);

  return (
    <div
      className="intro-landing-page min-h-screen w-full overflow-x-hidden font-sans antialiased"
      style={{ backgroundColor: BG, color: "#fafafa" }}
    >
      {/* ——— Hero ——— */}
      <header className="relative min-h-[calc(100vh-4.25rem)] flex flex-col justify-center pt-8 pb-16 sm:pb-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `
              radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,215,0,0.14), transparent 55%),
              radial-gradient(ellipse 60% 40% at 100% 50%, rgba(255,215,0,0.06), transparent 50%),
              radial-gradient(ellipse 50% 40% at 0% 80%, rgba(255,215,0,0.05), transparent 45%),
              linear-gradient(180deg, #050505 0%, ${BG} 45%, #000 100%)
            `,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,215,0,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,215,0,0.04) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black 20%, transparent 75%)",
          }}
        />

        <motion.div
          className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-5 text-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fade} className="mb-8">
            <img
              src="/miron-logo.png"
              alt="Miron AI"
              width={88}
              height={88}
              className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24"
              style={{ filter: `drop-shadow(0 0 20px rgba(255,215,0,0.25))` }}
            />
          </motion.div>

          <motion.p
            variants={fade}
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ borderColor: "rgba(255,215,0,0.35)", color: GOLD, backgroundColor: "rgba(255,215,0,0.06)" }}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Kişisel avukatlar için netlik ve dengeli tempo
          </motion.p>

          <motion.h1
            variants={fade}
            className="mb-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl"
            style={{
              color: "#ffffff",
              fontFamily: '"Abril Fatface", "Libre Baskerville", Georgia, serif',
              fontWeight: 400,
            }}
          >
            Dosyada netlik,
            <br />
            <span style={{ color: GOLD }}>kararda güç.</span>
          </motion.h1>

          <motion.p variants={fade} className="mb-10 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "rgba(255,255,255,0.72)" }}>
            Öncelikle kişisel ve bağımsız avukatlar için: evrak özeti, içtihat yönü, risk çerçevesi ve tekrarlayan işleri
            hızlandıran tek panel. Agresif rekabet söylemi değil; disiplinli çalışma ve sürdürülebilir tempo. Müvekkiline
            süre kazandırın, karar kalitesine odaklanın.
          </motion.p>

          <motion.div variants={fade} className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/kaydol"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-black transition hover:opacity-90"
              style={{ backgroundColor: GOLD }}
            >
              Hesap oluştur
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              Giriş yap
            </Link>
          </motion.div>

          <motion.p variants={fade} className="mt-8 text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
            Kayıt öncesi kısa uygunluk soruları · Verileriniz model eğitimi için kullanılmaz
          </motion.p>
        </motion.div>
      </header>

      {/* ——— Üç vaat ——— */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: SURFACE }}>
        <Section>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Timer,
                title: "Zaman",
                text: "Özet ve yön tarama ile dosyaya ilk bakış dakikalara iner.",
              },
              {
                icon: Scale,
                title: "Netlik",
                text: "Usul, ispat ve içtihat bağlamında yapılacaklar sırası belirginleşir.",
              },
              {
                icon: Lock,
                title: "Güven",
                text: "KVKK odaklı süreç; şifreli iletişim ve rol bazlı erişim.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border p-6 sm:p-7"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  background: "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(0,0,0,0.2))",
                }}
              >
                <item.icon className="mb-4 h-8 w-8" style={{ color: GOLD }} strokeWidth={1.5} aria-hidden />
                <h2 className="mb-2 text-lg font-semibold text-white">{item.title}</h2>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.62)" }}>
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ——— Özellikler ——— */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: BG }}>
        <Section>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 max-w-2xl"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Yetenekler
            </p>
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: '"Abril Fatface", Georgia, serif', color: "#fff", fontWeight: 400 }}
            >
              Bir panelde ne var?
            </h2>
            <p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
              Tek başınıza veya küçük ekiple: dava merkezi, araştırma, belge stüdyosu ve hesaplamalar aynı panelde.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { Icon: FileSearch, t: "Evrak ve özet", d: "PDF ve metin üzerinde hızlı özet, eksik ve tarih çıkarımı." },
              { Icon: Gavel, t: "İçtihat yönü", d: "Yargıtay / Danıştay hattında dosyanıza yakın kararları bulup çerçeveleyin." },
              { Icon: Zap, t: "Risk ve strateji", d: "Dava simülasyonu ve risk skoru ile müvekkil beklentisini yönetin." },
              { Icon: Layers, t: "Operasyon", d: "Dilekçe ve sözleşme üretiminde taslak; tekrarlayan işleri azaltın." },
            ].map((row, i) => (
              <motion.div
                key={row.t}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 rounded-2xl border p-5 sm:p-6"
                style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)" }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(255,215,0,0.1)", color: GOLD }}
                >
                  <row.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-white">{row.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {row.d}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      {/* ——— Sayı bandı ——— */}
      <div
        className="border-y py-16 sm:py-20"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: `linear-gradient(90deg, transparent, rgba(255,215,0,0.06), transparent)` }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-5 text-center">
          <span className="text-5xl font-bold tabular-nums sm:text-6xl" style={{ color: GOLD }}>
            {n}%
          </span>
          <p className="text-sm font-medium uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Örnek geri bildirim — ilk haftalarda bildirilen zaman kazanımı (yüzde göstergesi örnektir)
          </p>
        </div>
      </div>

      {/* ——— Güven maddeleri ——— */}
      <div style={{ backgroundColor: SURFACE, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Section>
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className="mb-10 text-2xl font-bold sm:text-3xl"
              style={{ fontFamily: '"Abril Fatface", Georgia, serif', fontWeight: 400, color: "#fff" }}
            >
              Güven ve uyum
            </h2>
            <ul className="flex flex-col gap-4 text-left sm:mx-auto sm:max-w-xl">
              {[
                "Şifreli bağlantı ve rol bazlı erişim",
                "Verileriniz üçüncü tarafla paylaşılmaz; model eğitiminde kullanılmaz",
                "KVKK ve sözleşme metinleri hesap oluşturma öncesinde okunabilir",
              ].map((line) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.25)" }}
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} aria-hidden />
                  <span style={{ color: "rgba(255,255,255,0.78)" }}>{line}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </Section>
      </div>

      {/* ——— Kapanış CTA ——— */}
      <footer
        className="px-5 pb-24 pt-20 sm:px-8"
        style={{
          background: `radial-gradient(ellipse 80% 80% at 50% 100%, rgba(255,215,0,0.12), transparent 55%), ${BG}`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl rounded-2xl border p-8 text-center sm:p-10"
          style={{
            borderColor: "rgba(255,215,0,0.35)",
            backgroundColor: "rgba(0,0,0,0.55)",
            boxShadow: "0 0 0 1px rgba(255,215,0,0.08), 0 24px 80px rgba(0,0,0,0.5)",
          }}
        >
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: '"Abril Fatface", Georgia, serif', fontWeight: 400 }}>
            Hazırsanız başlayın
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Birkaç soruyla uygunluk kontrolü; ardından hesabınızı oluşturup panele geçin.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/kaydol"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-black"
              style={{ backgroundColor: GOLD }}
            >
              Kayıt ol
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center rounded-xl border px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              Biz kimiz?
            </Link>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
