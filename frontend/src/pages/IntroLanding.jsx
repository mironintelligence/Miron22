import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function IntroLanding() {
  const navigate = useNavigate();
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const sections = [
    { id: "problem", title: "Problem", content: "Hukuk dünyası; evrak yığınları, manuel analiz süreçleri ve tekrarlayan görevlerle boğuluyor. Geleneksel yöntemler yavaş, hataya açık ve pahalı." },
    { id: "ai", title: "Yapay Zeka Mimarisi", content: "Miron AI, GPT-4o ve özelleştirilmiş hukuki veri setlerini birleştirir. Retrieval-Augmented Generation (RAG) mimarisi ile mevzuat ve içtihatları anlık olarak tarar, halüsinasyon riskini minimize eder." },
    { id: "yargitay", title: "Yargıtay & Danıştay Veritabanı", content: "Milyonlarca emsal karar içinde anlamsal arama yapın. Sadece kelime eşleşmesi değil, hukuki kavram ve olay örgüsü üzerinden en alakalı kararları bulun." },
    { id: "simulation", title: "Dava Simülasyonu", content: "Gelişmiş risk analizi motoru. Davanızın kazanma ihtimalini, tahmini süresini ve maliyetini simüle edin. Karşı tarafın olası hamlelerini önceden görün." },
    { id: "doc", title: "Evrak Analizi", content: "Dilekçe, karar veya bilirkişi raporu yükleyin. Saniyeler içinde yapılandırılmış özet, eksiklik analizi ve stratejik öneriler alın." },
    { id: "security", title: "Güvenlik & Uyum", content: "Verileriniz uçtan uca şifrelenir. KVKK uyumlu altyapı ve sıfır-bilgi prensibi ile müvekkil gizliliği en üst düzeyde korunur." },
    { id: "benchmark", title: "Performans", content: "Manuel araştırmaya göre %95 zaman tasarrufu. Ortalama bir dilekçe hazırlama süresini 4 saatten 15 dakikaya indirin." },
    { id: "usecases", title: "Kullanım Alanları", content: "Hukuk büroları için verimlilik, şirket hukuk departmanları için risk yönetimi, uyum ekipleri için mevzuat takibi." },
    { id: "comparative", title: "Farkımız", content: "Sadece metin üreten bir chatbot değiliz. Hukuki süreçleri yöneten, strateji geliştiren ve karar destek sistemi sunan entegre bir platformuz." },
    { id: "infra", title: "Teknolojik Altyapı", content: "Supabase, Python FastAPI, React ve Vector DB üzerinde kurulu ölçeklenebilir, modern ve hızlı mimari." },
    { id: "roadmap", title: "Gelecek Vizyonu", content: "Otomatik duruşma tutanağı analizi, e-imza entegrasyonu ve blockchain tabanlı delil yönetimi çok yakında." },
  ];

  return (
    <div className="bg-black text-white font-sans overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <motion.section 
        variants={stagger} initial="hidden" animate="visible"
        className="min-h-screen flex flex-col justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.08),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-6 z-10 w-full pt-20">
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-[var(--miron-gold)] uppercase">
              Hukuk Teknolojilerinin Geleceği
            </span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter text-center leading-[0.9] mb-8 bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent">
            Miron AI
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-xl md:text-2xl text-white/60 text-center max-w-3xl mx-auto leading-relaxed font-light">
            Premium hız, premium doğruluk. Dilekçe üretimi, evrak analizi ve strateji desteğini tek bir akışta birleştirin.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105">
              Hemen Başlayın
            </Link>
            <button onClick={() => navigate("/demo-request")} className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-full hover:bg-white/5 transition-all">
              Demo Talep Edin
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest text-white/40">Keşfedin</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </motion.div>
      </motion.section>

      {/* SECTIONS LOOP */}
      {sections.map((section, index) => (
        <motion.section
          key={section.id}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          variants={stagger}
          className={`py-32 px-6 border-t border-white/5 relative ${index % 2 === 0 ? 'bg-black' : 'bg-[#050505]'}`}
        >
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
              <motion.div variants={fadeUp} className="text-[var(--miron-gold)] text-sm font-bold tracking-[0.2em] uppercase mb-4">
                0{index + 1} — {section.title}
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {section.title}
              </motion.h2>
              <motion.p variants={fadeUp} className="text-lg text-white/60 leading-relaxed">
                {section.content}
              </motion.p>
              
              {/* Feature specific visual/list placeholder */}
              <motion.div variants={fadeUp} className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 bg-[var(--miron-gold)] rounded-full" />
                  <span className="text-sm text-white/80 font-medium">Enterprise-Grade Legal Tech</span>
                </div>
              </motion.div>
            </div>
            
            <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
              <motion.div 
                variants={fadeUp}
                className="aspect-square md:aspect-video rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden relative group"
              >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors duration-500">
                    MIRON
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      ))}

      {/* 13. CTA SECTION */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="py-40 px-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--miron-gold)]/10 to-transparent opacity-50" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-bold mb-8">
            Hukukun Geleceğine<br/>Bugün Katılın.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Binlerce saatlik manuel iş yükünden kurtulun. Stratejik düşünmeye odaklanın.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/register" className="inline-block px-12 py-5 bg-[var(--miron-gold)] text-black font-bold text-lg rounded-full hover:bg-yellow-400 transition-all shadow-[0_0_40px_rgba(255,215,0,0.3)]">
              Ücretsiz Başlayın
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* 14. FOOTER */}
      <footer className="py-20 px-6 border-t border-white/10 bg-[#020202]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <div>
            <div className="font-bold text-white mb-6">Platform</div>
            <ul className="space-y-4 text-sm text-white/50">
              <li><Link to="/" className="hover:text-white transition">Ana Sayfa</Link></li>
              <li><Link to="/features" className="hover:text-white transition">Özellikler</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition">Fiyatlandırma</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-6">Şirket</div>
            <ul className="space-y-4 text-sm text-white/50">
              <li><Link to="/about" className="hover:text-white transition">Hakkımızda</Link></li>
              <li><Link to="/careers" className="hover:text-white transition">Kariyer</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">İletişim</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-6">Yasal</div>
            <ul className="space-y-4 text-sm text-white/50">
              <li><Link to="/privacy" className="hover:text-white transition">Gizlilik Politikası</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Kullanım Şartları</Link></li>
              <li><Link to="/kvkk" className="hover:text-white transition">KVKK</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-6">Miron AI</div>
            <p className="text-sm text-white/50 leading-relaxed">
              İstanbul merkezli, yapay zeka tabanlı hukuk teknolojileri girişimi.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
          <div>&copy; 2026 Miron Intelligence. Tüm hakları saklıdır.</div>
          <div className="flex gap-6">
            <span>Twitter</span>
            <span>LinkedIn</span>
            <span>Instagram</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
