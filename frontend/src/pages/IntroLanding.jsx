import React, { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";

export default function IntroLanding() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [counters, setCounters] = useState({ timeSaved: 0, accuracy: 0, decisions: 0 });
  
  // Scroll Animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  useEffect(() => {
    const start = Date.now();
    const duration = 1400;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setCounters({
        timeSaved: Math.floor(72 * p),
        accuracy: Math.floor(98 * p),
        decisions: Math.floor(1200 * p),
      });
      if (p >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div ref={containerRef} className="bg-[#020202] text-white font-sans overflow-hidden selection:bg-[var(--miron-gold)] selection:text-black">
      
      {/* -------------------- HERO SECTION -------------------- */}
      <motion.section 
        variants={stagger} initial="hidden" animate="visible"
        className="min-h-screen flex flex-col justify-center relative overflow-hidden"
      >
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.03),transparent_60%)] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 z-10 w-full pt-20">
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="inline-block py-1 px-4 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-[0.2em] text-[var(--miron-gold)] uppercase backdrop-blur-md">
              Miron AI — Avukatlara Stratejik Güç
            </span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter text-center leading-[0.9] mb-10 bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-transparent">
            Hukukun<br />Geleceği.
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-xl md:text-2xl text-white/50 text-center max-w-4xl mx-auto leading-relaxed font-light mb-12">
            Davayı okumak, anlamlandırmak ve stratejiye çevirmek artık saatler değil dakikalar alır.
            <span className="text-white/80"> Daha az risk, daha güçlü savunma, daha ikna edici dosya.</span>
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="group relative px-10 py-5 bg-white text-black font-bold rounded-full overflow-hidden hover:scale-105 transition-transform duration-300">
              <span className="relative z-10">Ücretsiz Başlayın</span>
              <div className="absolute inset-0 bg-[var(--miron-gold)] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
            </Link>
            <button onClick={() => navigate("/demo-request")} className="px-10 py-5 bg-transparent border border-white/10 text-white font-bold rounded-full hover:bg-white/5 transition-all hover:border-white/30">
              Demo Talep Edin
            </button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <span className="text-[10px] uppercase tracking-widest text-white/30">Keşfedin</span>
          <div className="w-px h-16 bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </motion.section>


      {/* -------------------- 2. THE STRUCTURAL PROBLEM -------------------- */}
      <section className="py-40 px-6 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid lg:grid-cols-2 gap-20 items-start"
          >
            <div>
              <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-bold mb-10 leading-tight">
                Hukuk Sistemi<br /><span className="text-white/30">Sürdürülemez.</span>
              </motion.h2>
            </div>
            <div className="space-y-12">
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-white mb-4">Veri Yığını ve Manuel Yük</h3>
                <p className="text-lg text-white/50 leading-relaxed">
                  Her yıl milyonlarca yeni dava dosyası açılıyor. Avukatlar zamanlarının %60'ını strateji geliştirmek yerine evrak taramak, içtihat aramak ve prosedürel metinler yazmakla harcıyor. Bu manuel süreçler hem maliyetli hem de hata riski taşıyor.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-white mb-4">İçtihat Belirsizliği</h3>
                <p className="text-lg text-white/50 leading-relaxed">
                  Yargıtay ve Danıştay kararları arasındaki nüansları yakalamak insan kapasitesini aşıyor. Geleneksel arama motorları sadece kelime eşleşmesi yapıyor, bağlamsal analizi kaçırıyor.
                </p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <h3 className="text-2xl font-bold text-white mb-4">Risk Yönetimi Eksikliği</h3>
                <p className="text-lg text-white/50 leading-relaxed">
                  Dava sonucunu öngörmek genellikle "hissiyat" ile yapılıyor. Oysa veri odaklı risk analizi, müvekkil beklentilerini yönetmek ve doğru stratejiyi kurmak için kritik öneme sahip.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* -------------------- 3. AI ARCHITECTURE (TECHNICAL) -------------------- */}
      <section className="py-40 px-6 bg-[#050505] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[var(--miron-gold)]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-20">
            <motion.div variants={fadeUp} className="text-[var(--miron-gold)] text-sm font-bold tracking-[0.2em] uppercase mb-4">
              Stratejik Avantaj
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-bold max-w-3xl">
              Daha Hızlı, Daha Net,<br />Daha Güçlü Savunma.
            </motion.h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                title: "Hızlı İçtihat Erişimi",
                desc: "Dosyanızla benzer kararları saniyeler içinde yakalayın, güçlü dayanaklarla ilerleyin.",
                icon: "🏛️"
              },
              {
                title: "Net Strateji Çerçevesi",
                desc: "Usul, ispat, karşı argüman ve riskleri tek bir bakışta görün ve karar verin.",
                icon: "⚖️"
              },
              {
                title: "Müvekkil İletişimi",
                desc: "Risk ve olasılıkları anlaşılır şekilde sunun, güveni somut veriye dayandırın.",
                icon: "📜"
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-white/5 border border-white/10 p-10 rounded-3xl hover:bg-white/10 transition-colors duration-500 group"
              >
                <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* -------------------- 4. SUPREME COURT INTELLIGENCE -------------------- */}
      <section className="py-40 px-6 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-[var(--miron-gold)] text-sm font-bold tracking-[0.2em] uppercase mb-4">
              İçtihat Gücü
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-bold mb-8">
              Yargıtay & Danıştay<br />İçtihat Analizi.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/50 mb-10 leading-relaxed">
              Davanızla benzer kararları hızlıca yakalayın, gerekçeyi netleştirin ve dosyanızı güçlendirin.
              <br /><br />
              Daire, yıl ve sonuç odaklı filtrelerle doğru içtihada hızlı erişin.
            </motion.p>
            
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
              <div>
                <div className="text-4xl font-bold text-white mb-2">{counters.decisions}+</div>
                <div className="text-sm text-white/40 uppercase tracking-widest">Karar Kümeleri</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">%{counters.accuracy}</div>
                <div className="text-sm text-white/40 uppercase tracking-widest">Eşleşme Tutarlılığı</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            {/* Abstract UI representation */}
            <div className="aspect-[4/5] bg-gradient-to-br from-white/10 to-transparent rounded-3xl border border-white/10 p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="bg-black/50 border border-white/10 p-6 rounded-xl backdrop-blur-md">
                    <div className="h-2 w-1/3 bg-white/20 rounded mb-4" />
                    <div className="h-2 w-full bg-white/10 rounded mb-2" />
                    <div className="h-2 w-5/6 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>


      {/* -------------------- 5. DEEP CASE SIMULATION -------------------- */}
      <section className="py-40 px-6 bg-[#080808] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-24">
            <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-bold mb-6">
              Dava Simülasyon Motoru
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-white/50 max-w-3xl mx-auto">
              Sadece "tahmin" değil, matematiksel risk modellemesi.
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            {[
              { t: "Usul Analizi", d: "Görevli mahkeme, zamanaşımı ve hak düşürücü süre kontrolü." },
              { t: "İspat Yükü", d: "TMK m.6 ve HMK uyarınca ispat yükünün hangi tarafta olduğunun tespiti." },
              { t: "Karşı Strateji", d: "Rakibin olası savunmalarını ve en güçlü argümanlarını önceden simüle etme." },
              { t: "Risk Skoru", d: "Davanın kazanılma ihtimalini 0-100 arasında puanlayan olasılık motoru." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white/5 border border-white/10 p-8 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--miron-gold)]/10 flex items-center justify-center text-[var(--miron-gold)] mb-6 font-bold text-xl">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.t}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* -------------------- 6. DOCUMENT INTELLIGENCE -------------------- */}
      <section className="py-40 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="sticky top-32">
              <motion.div variants={fadeUp} className="text-[var(--miron-gold)] text-sm font-bold tracking-[0.2em] uppercase mb-4">
                Derin Analiz
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-5xl font-bold mb-8">
                Evraklarınızla<br />Konuşun.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-lg text-white/50 mb-8 leading-relaxed">
                Yüzlerce sayfalık dava dosyalarını, bilirkişi raporlarını ve sözleşmeleri saniyeler içinde analiz edin. 
                <br/><br/>
                Miron AI, belgedeki tarihleri, para birimlerini, tarafları ve hukuki iddiaları "entity extraction" yöntemiyle ayrıştırır. Size sadece yapılandırılmış özeti okumak kalır.
              </motion.p>
              <ul className="space-y-4 text-white/70">
                {["Kronolojik Olay Örgüsü", "Delil Listesi Çıkarımı", "Çelişki Tespiti", "Eksik Evrak Uyarısı"].map((li, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-[var(--miron-gold)]">✓</span> {li}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
          <div className="lg:col-span-7">
            {/* Document Visual */}
            <div className="bg-[#111] rounded-2xl border border-white/10 p-8 md:p-12 relative">
              <div className="font-mono text-xs text-white/30 mb-4">ANALYSIS_LOG_2026.txt</div>
              <div className="space-y-3 font-mono text-sm text-green-400/80">
                <p>{`> Belge yükleniyor... [OK]`}</p>
                <p>{`> OCR taraması başlatıldı... [OK]`}</p>
                <p>{`> Varlık tanıma (NER) aktif...`}</p>
                <p className="text-white/50">{`  - Davacı: Ahmet Yılmaz`}</p>
                <p className="text-white/50">{`  - Davalı: XYZ İnşaat A.Ş.`}</p>
                <p className="text-white/50">{`  - Dava Değeri: 2.500.000 TL`}</p>
                <p>{`> Hukuki atıflar çıkarılıyor...`}</p>
                <p className="text-white/50">{`  - TBK m. 112 (Sözleşmeye Aykırılık)`}</p>
                <p className="text-white/50">{`  - HMK m. 200 (Senetle İspat)`}</p>
                <p>{`> Risk analizi tamamlandı.`}</p>
                <p className="animate-pulse">{`> Rapor oluşturuluyor...`}</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* -------------------- 7. SECURITY & COMPLIANCE -------------------- */}
      <section className="py-32 px-6 border-t border-white/5 bg-[#050505]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-12">Kurumsal Güvenlik Standartları</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { t: "Uçtan Uca Şifreleme", d: "Tüm veriler AES-256 ile şifrelenir. Veritabanı ve iletişim kanalları SSL/TLS korumalıdır." },
              { t: "Veri İzolasyonu", d: "Her müşterinin verisi mantıksal olarak izole edilir. Yapay zeka modelleri verilerinizle eğitilmez." },
              { t: "KVKK Uyumluluğu", d: "Kişisel verilerin korunması kanununa tam uyumlu altyapı ve veri işleme politikaları." }
            ].map((item, i) => (
              <div key={i} className="p-6">
                <div className="w-16 h-1 bg-white/10 mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-3">{item.t}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* -------------------- 8. USE CASES -------------------- */}
      <section className="py-40 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-5xl font-bold mb-6">Sektörel Çözümler</h2>
            <p className="text-xl text-white/50">Miron AI, farklı hukuk pratiklerine özel modüller sunar.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative h-[400px] rounded-3xl overflow-hidden border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-10 z-20">
                <h3 className="text-3xl font-bold mb-2">Hukuk Büroları</h3>
                <p className="text-white/70">Dilekçe yazım süresini %80 azaltın. Genç avukatların eğitim sürecini hızlandırın ve hata payını düşürün.</p>
              </div>
              {/* Abstract BG */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] group-hover:scale-105 transition-transform duration-700" />
            </div>

            <div className="group relative h-[400px] rounded-3xl overflow-hidden border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-10 z-20">
                <h3 className="text-3xl font-bold mb-2">Kurumsal Departmanlar</h3>
                <p className="text-white/70">Gelen sözleşmeleri otomatik tarayın. Riskli maddeleri tespit edin ve uyum süreçlerini otomatize edin.</p>
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.1),transparent)] group-hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>


      {/* -------------------- 9. CLOSING VISION -------------------- */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--miron-gold)]/5" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-6xl md:text-8xl font-black mb-12 tracking-tight"
          >
            Hukukun Yeni Çağı.
          </motion.h2>
          <p className="text-2xl text-white/60 mb-16 leading-relaxed font-light">
            Gelecek, veriyi en iyi işleyenlerin olacak.<br/>
            Miron AI ile rekabette bir adım öne geçin.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/register" className="px-12 py-6 bg-white text-black font-bold text-xl rounded-full hover:bg-gray-200 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]">
              Ücretsiz Deneyin
            </Link>
            <Link to="/contact" className="px-12 py-6 border border-white/20 text-white font-bold text-xl rounded-full hover:bg-white/5 transition-all">
              Bize Ulaşın
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="py-20 px-6 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div>
            <div className="text-2xl font-bold mb-2">Miron AI</div>
            <p className="text-white/40 text-sm">Advanced Legal Intelligence Infrastructure</p>
          </div>
          <div className="flex gap-8 text-sm text-white/60">
            <Link to="/privacy" className="hover:text-white">Gizlilik</Link>
            <Link to="/terms" className="hover:text-white">Kullanım Şartları</Link>
            <Link to="/security" className="hover:text-white">Güvenlik</Link>
            <a href="mailto:contact@miron.ai" className="hover:text-white">İletişim</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-xs text-white/20">
          &copy; 2026 Miron Intelligence Inc. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
