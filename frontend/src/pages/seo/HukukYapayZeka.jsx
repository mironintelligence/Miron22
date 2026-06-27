import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../../components/SEOHead.jsx";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Hukuk yapay zekası ne işe yarar?",
      "acceptedAnswer": { "@type": "Answer", "text": "Hukuk yapay zekası; içtihat araştırması, sözleşme analizi, dilekçe hazırlama ve risk değerlendirmesi gibi avukatlık faaliyetlerini hızlandırır. Geleneksel yöntemlere kıyasla araştırma süresini %70-80 oranında azaltabilir." }
    },
    {
      "@type": "Question",
      "name": "ChatGPT hukuki araştırmada kullanılabilir mi?",
      "acceptedAnswer": { "@type": "Answer", "text": "ChatGPT genel amaçlı bir yapay zekadır ve hukuki araştırmada hallüsinasyon riski taşır: var olmayan Yargıtay kararları üretebilir. Hukuki araştırma için RAG tabanlı, gerçek veritabanına dayalı platformlar kullanılmalıdır." }
    },
    {
      "@type": "Question",
      "name": "Hukuki yapay zeka avukatın yerini alır mı?",
      "acceptedAnswer": { "@type": "Answer", "text": "Hayır. Yapay zeka rutin araştırma ve hazırlık görevlerini üstlenir; hukuki karar verme, müvekkil ilişkisi ve strateji geliştirme insan avukata kalır. Yapay zeka avukatı değiştirmez, daha verimli kılar." }
    },
    {
      "@type": "Question",
      "name": "Miron AI hangi hukuk alanlarını kapsıyor?",
      "acceptedAnswer": { "@type": "Answer", "text": "Miron AI iş hukuku, ticaret hukuku, borçlar hukuku, aile hukuku ve ceza hukuku başta olmak üzere Türk hukukunun tüm temel alanlarını kapsar. 700.000'den fazla Yargıtay ve Danıştay kararı ile desteklenir." }
    }
  ]
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Miron AI — Hukuk Yapay Zeka Platformu",
  "applicationCategory": "LegalTechnology",
  "operatingSystem": "Web",
  "url": "https://www.mironintelligence.com/hukuk-yapay-zeka",
  "description": "Avukatlar için içtihat araştırması, sözleşme analizi ve hukuki asistan özellikleri sunan yapay zeka platformu.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TRY", "description": "Ücretsiz deneme mevcut" },
  "publisher": { "@id": "https://www.mironintelligence.com/#organization" },
};

const combinedSchema = { "@context": "https://schema.org", "@graph": [faqSchema, softwareSchema] };

export default function HukukYapayZeka() {
  return (
    <>
      <SEOHead
        title="Hukuk Yapay Zeka — Avukatlar İçin AI Destekli Hukuki Araştırma"
        description="Türk hukuku için yapay zeka: içtihat araştırması, sözleşme analizi, risk değerlendirmesi. Her yanıt Yargıtay kaynaklı, doğrulanabilir. Ücretsiz dene."
        canonical="/hukuk-yapay-zeka"
        schema={combinedSchema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Hukuk Teknolojisi</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Hukuk Yapay Zekası<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Türk avukatları için tasarlandı
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            İçtihat araştırması, sözleşme analizi ve dava risk değerlendirmesi — tüm yanıtlar gerçek Yargıtay ve Danıştay kararlarıyla kaynaklı.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Hukuk yapay zekası neden farklıdır?</h2>
            <p className="text-white/60 leading-relaxed mb-5">
              Genel yapay zeka modelleri (ChatGPT, Gemini) hukuki araştırmada ciddi riskler taşır. Bu modeller gerçek Yargıtay kararlarına erişemez; bunun yerine eğitim verilerinden "böyle bir karar nasıl görünürdü" tahminini üretir. Araştırmalar bu hallüsinasyon oranının %58-88 arasında olduğunu gösteriyor.
            </p>
            <p className="text-white/60 leading-relaxed mb-5">
              Hukuka özel yapay zeka platformları RAG (Retrieval-Augmented Generation) mimarisini kullanır: önce gerçek veritabanından belge bulur, ardından bu gerçek belgeler üzerinden yanıt üretir. Her yanıtta kaynak linki gösterilir ve doğrulanabilir.
            </p>
            <p className="text-white/60 leading-relaxed">
              Miron AI bu mimarinin Türk hukuku için özelleştirilmiş versiyonunu kullanır. 700.000'den fazla Yargıtay ve Danıştay kararından oluşan veritabanı, semantik arama ile taranır.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Ne yapabilirsiniz?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "İçtihat Araştırması", desc: "Doğal dille yazın, Yargıtay ve Danıştay kararlarını saniyeler içinde bulun. Her sonuçta kaynak linki." },
                { title: "Sözleşme Analizi", desc: "Sözleşmenizi yükleyin. Risk maddeleri, eksik hükümler ve olağandışı koşullar otomatik işaretlenir." },
                { title: "Dava Risk Analizi", desc: "Dava gerçeklerini girin, benzer kararların sonuçlarına göre kazanma ihtimali ve strateji önerisi alın." },
                { title: "Hukuki Asistan", desc: "Türk hukukuna özel asistan. Mevzuat, kararlar ve hukuki kavramlar hakkında kaynaklı yanıtlar." },
                { title: "İşçilik Hesaplamaları", desc: "Kıdem, ihbar, fazla mesai ve diğer tazminatları güncel tavan rakamlarıyla anında hesaplayın." },
                { title: "Dilekçe Oluşturma", desc: "Standart hukuki dilekçe şablonlarından hareketle taslak oluşturun, düzenleyin, kaydedin." },
              ].map((f) => (
                <div key={f.title} className="border border-white/10 p-6">
                  <h3 className="font-bold mb-2 text-white">{f.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Somut zaman tasarrufu</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/15">
                    <th className="text-left py-3 pr-6 text-white/50 font-medium">Görev</th>
                    <th className="text-right py-3 pr-6 text-white/50 font-medium">Geleneksel</th>
                    <th className="text-right py-3 text-[var(--miron-gold)] font-medium">Miron AI ile</th>
                  </tr>
                </thead>
                <tbody className="text-white/65">
                  {[
                    ["İçtihat araştırması", "3-4 saat", "15-20 dk"],
                    ["Dilekçe taslağı", "2-3 saat", "45 dk"],
                    ["Sözleşme analizi (50 sayfa)", "3-4 saat", "45-60 dk"],
                    ["Risk değerlendirmesi", "1-2 saat", "15 dk"],
                  ].map(([g, e, m]) => (
                    <tr key={g} className="border-b border-white/8">
                      <td className="py-3 pr-6 text-white">{g}</td>
                      <td className="py-3 pr-6 text-right text-white/40">{e}</td>
                      <td className="py-3 text-right text-[var(--miron-gold)]">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <h2 className="text-2xl font-bold mb-3">14 gün ücretsiz deneyin</h2>
            <p className="text-white/50 mb-7 text-sm">Kredi kartı gerekmez. Kurulum yoktur. Tarayıcınızda çalışır.</p>
            <Link
              to="/deneme-baslat"
              className="inline-block px-10 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors mr-4"
            >
              Ücretsiz başla
            </Link>
            <Link
              to="/pricing"
              className="inline-block px-8 py-3 text-sm text-white/40 border border-white/15 hover:border-white/30 transition-colors"
            >
              Fiyatlar
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
