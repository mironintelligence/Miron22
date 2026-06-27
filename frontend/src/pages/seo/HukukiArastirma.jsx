import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../../components/SEOHead.jsx";
import { SeoRelated } from "../../components/SeoRelated.jsx";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Hukuki araştırma ne kadar sürer?",
      "acceptedAnswer": { "@type": "Answer", "text": "Geleneksel yöntemle orta düzey bir dava araştırması 3-6 saat sürebilir. Yapay zeka destekli platformlar bu süreyi 20-45 dakikaya indirebilir. Tasarruf, haftalık 10-15 saate kadar çıkabilir." }
    },
    {
      "@type": "Question",
      "name": "Hukuki araştırmada yapay zeka nasıl kullanılır?",
      "acceptedAnswer": { "@type": "Answer", "text": "Dava gerçeklerini doğal dille platforma anlatın. Platform gerçek veritabanından ilgili kararları ve mevzuatı bulur, özetler ve kaynak gösterir. Siz ise bulunanları değerlendirerek stratejinizi oluşturursunuz." }
    },
    {
      "@type": "Question",
      "name": "Hukuki araştırmada hangi kaynaklar güvenilirdir?",
      "acceptedAnswer": { "@type": "Answer", "text": "Birincil kaynaklar: resmi mevzuat (mevzuat.gov.tr), Yargıtay kararları (yargitay.gov.tr), Danıştay kararları. İkincil kaynaklar: akademik makaleler, hukuk dergileri, doktrin. Yapay zeka platformları bu kaynaklara dayalı çalıştığında güvenilirdir." }
    },
    {
      "@type": "Question",
      "name": "Hukuki araştırma ve hukuki tavsiye arasındaki fark nedir?",
      "acceptedAnswer": { "@type": "Answer", "text": "Hukuki araştırma, mevcut hukuku bulmak ve anlamaktır (nesnel). Hukuki tavsiye ise araştırmayı spesifik bir duruma uygulamaktır (subjektif, deneyim gerektirir). Yapay zeka araştırma sürecini destekler; tavsiye verme yetkisi avukattadır." }
    }
  ]
};

export default function HukukiArastirma() {
  return (
    <>
      <SEOHead
        title="Hukuki Araştırma — Yapay Zeka ile Mevzuat ve İçtihat Taraması"
        description="Avukatlar için yapay zeka destekli hukuki araştırma platformu. Mevzuat, içtihat ve doktrin tek ekranda. Türk hukukuna özel, kaynaklı, doğrulanabilir."
        canonical="/hukuki-arastirma"
        schema={faqSchema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Hukuki Araştırma</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Hukuki Araştırma<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              mevzuat, içtihat, analiz — tek platformda
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            Türk hukukunda araştırma sürecinizi yapay zeka ile hızlandırın. Mevzuat, Yargıtay kararları ve doktrin; kaynaklı ve doğrulanabilir.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Hukuki araştırmanın üç katmanı</h2>
            <div className="flex flex-col gap-6">
              {[
                { n: "1", title: "Mevzuat araştırması", desc: "Kanunlar, yönetmelikler ve tebliğler. Güncel metne ve değişiklik geçmişine ulaşın. Bir maddenin ne zaman değiştiğini, önceki halini ve değişiklik gerekçesini öğrenin.", tag: "Kanun / YK / Yönetmelik" },
                { n: "2", title: "İçtihat araştırması", desc: "Yargıtay, Danıştay, AYM ve BAM kararları. Doğal dille sorgulayın, semantik arama ile ilgili tüm kararları bulun. Her kararda esas no, tarih ve kaynak linki.", tag: "700.000+ karar" },
                { n: "3", title: "Doktrin ve analiz", desc: "Akademik görüşler ve hukuki yorumlar araştırmayı zenginleştirir. Tartışmalı konularda farklı görüşleri görmek dava stratejisini güçlendirir.", tag: "Akademik kaynak" },
              ].map((k) => (
                <div key={k.n} className="border border-white/10 p-7">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[var(--miron-gold)] font-bold text-lg">{k.n}</span>
                    <h3 className="font-bold text-white text-lg">{k.title}</h3>
                    <span className="ml-auto text-[10px] font-bold tracking-wider uppercase text-white/30 border border-white/15 px-2 py-0.5">{k.tag}</span>
                  </div>
                  <p className="text-white/55 text-sm leading-relaxed">{k.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Araştırma protokolü</h2>
            <p className="text-white/60 mb-6 text-sm">Sistematik araştırma hem hız hem güvenilirlik sağlar:</p>
            <ol className="flex flex-col gap-3">
              {[
                "Hukuki soruyu netleştir — ne arıyorum?",
                "İlgili Yargıtay dairesi veya Danıştay dairesini belirle",
                "Semantik arama ile geniş tarama yap",
                "Son 5 yıl filtresi uygula",
                "Onama/bozma ayrımıyla sonuçları değerlendir",
                "En az 3 tutarlı karar bul",
                "İçtihadı birleştirme kararı kontrol et",
                "Mevzuat değişim tarihiyle karar tarihini karşılaştır",
                "Dava stratejisiyle ilişkilendir",
              ].map((adim, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-[var(--miron-gold)] font-mono font-bold min-w-[1.5rem]">{i + 1}.</span>
                  <span className="text-white/65">{adim}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Sık sorulan sorular</h2>
            <div className="flex flex-col gap-6">
              {faqSchema.mainEntity.map((faq) => (
                <div key={faq.name} className="border-t border-white/10 pt-6">
                  <h3 className="font-bold text-white mb-2">{faq.name}</h3>
                  <p className="text-white/55 leading-relaxed text-sm">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="border border-[var(--miron-gold)]/20 p-8 text-center">
            <h2 className="text-xl font-bold mb-3">Araştırma sürenizi kısaltın</h2>
            <p className="text-white/50 mb-7 text-sm">14 gün ücretsiz. Türk hukuku için özelleştirilmiş.</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link to="/deneme-baslat" className="inline-block px-10 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors">
                Ücretsiz başla
              </Link>
              <Link to="/pricing" className="inline-block px-8 py-3 text-sm text-white/40 border border-white/15 hover:border-white/30 transition-colors">
                Fiyatlar
              </Link>
            </div>
          </div>
          <SeoRelated current="/hukuki-arastirma" />
        </div>
      </div>
    </>
  );
}
