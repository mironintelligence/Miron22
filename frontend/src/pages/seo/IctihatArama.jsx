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
      "name": "İçtihat araması için en iyi platform hangisi?",
      "acceptedAnswer": { "@type": "Answer", "text": "Türkiye'de içtihat araması için resmi kaynak yargitay.gov.tr'dir. Yapay zeka destekli platformlar ise semantik arama ile çok daha hızlı ve kapsamlı sonuç verir. Miron AI 700.000'den fazla kararı semantik arama ile tarar." }
    },
    {
      "@type": "Question",
      "name": "İçtihat aramasında anahtar kelime mi, semantik arama mı?",
      "acceptedAnswer": { "@type": "Answer", "text": "Semantik arama çok daha etkilidir. Anahtar kelime araması tam eşleşme arar; semantik arama ise hukuki anlamı kavrayarak ilgili tüm kararları getirir. 'Fazla mesai tazminatı' aramasında semantik sistem 'asgari geçim indirimi etkisi' gibi ilgili kavramları da bulur." }
    },
    {
      "@type": "Question",
      "name": "Yargıtay kararı sayısı ne kadar?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yargıtay yılda yaklaşık 1 milyon karar vermektedir (tüm türler dahil). Toplam arşiv on milyonlarca karardan oluşmaktadır. Bu nedenle doğru filtreleme ve semantik arama kritik önem taşır." }
    },
    {
      "@type": "Question",
      "name": "İçtihat değişikliklerini nasıl takip ederim?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yargıtay içtihadı zaman içinde değişebilir. Tarih filtresi kullanarak son 3-5 yıl kararlarını önceliklendirin. İçtihadı Birleştirme Kararları ayrıca takip edilmelidir — bunlar en bağlayıcı içtihat kaynağıdır." }
    }
  ]
};

export default function IctihatArama() {
  return (
    <>
      <SEOHead
        title="İçtihat Arama — Yargıtay ve Danıştay Kararları Yapay Zeka ile"
        description="700.000+ Yargıtay ve Danıştay kararında semantik içtihat araması. Doğal dille sorgulayın, kaynaklı emsal bulun. Avukatlar için ücretsiz deneyin."
        canonical="/ictihat-arama"
        schema={faqSchema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">İçtihat Araştırması</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            İçtihat Arama<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              yapay zeka ile saniyeler içinde
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            700.000'den fazla Yargıtay ve Danıştay kararını semantik arama ile tarayın. Her sonuçta kaynak linki, tarih, daire ve dava sonucu gösterilir.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Geleneksel içtihat aramasının sorunu</h2>
            <p className="text-white/60 leading-relaxed mb-5">
              Klasik anahtar kelime araması yalnızca tam eşleşme arar. "Kıdem tazminatı" araması yapıldığında bu kelimelerin geçtiği on binlerce karar çıkar; hangisinin sizin davanızla ilgili olduğunu bulmak saatler alır.
            </p>
            <p className="text-white/60 leading-relaxed mb-5">
              Daha da önemlisi: hukuki dil çok çeşitlidir. Aynı olgu farklı kararlarda farklı kelimelerle ifade edilebilir. "İşçinin haklı nedenle istifası" başka bir kararda "geçerli fesih nedeni işçi tarafında" olarak geçebilir. Anahtar kelime araması bunu yakalayamaz.
            </p>
            <p className="text-white/60 leading-relaxed">
              Semantik arama ise hukuki anlamı kavrar. Yazdığınız sorguyu anlayarak anlamsal olarak ilgili tüm kararları getirir, kelime eşleşmesi aramaz.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Nasıl çalışır?</h2>
            <div className="flex flex-col gap-1">
              {[
                { n: "01", title: "Davayı doğal dille anlatın", desc: "Teknik terim kullanmak zorunda değilsiniz. 'İşçi geçerli sebep olmaksızın işten çıkarıldı, kıdem ve ihbar tazminatı talep ediyor' gibi yazın." },
                { n: "02", title: "Yapay zeka anlar ve arar", desc: "Platform sorunuzu anlayarak 700.000'den fazla karar arasında semantik arama yapar. Daire ve tarih filtresi uygulayabilirsiniz." },
                { n: "03", title: "Sıralı sonuçlar gelir", desc: "En ilgili kararlar önce listelenir. Her kararın özeti, sonucu (onama/bozma) ve davayla ilişkisi gösterilir." },
                { n: "04", title: "Kaynak linkine erişin", desc: "Her kararın resmi kaynağına doğrudan ulaşın. Dilekçenizde kaynak gösterin, mahkemede tartışılabilir zemin oluşturun." },
              ].map((s) => (
                <div key={s.n} className="flex gap-6 py-6 border-b border-white/8">
                  <span className="text-[var(--miron-gold)] font-mono text-xl font-bold min-w-[2.5rem]">{s.n}</span>
                  <div>
                    <h3 className="font-bold text-white mb-1">{s.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Kapsanan mahkemeler</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["Yargıtay (tüm daireler)", "Danıştay", "Anayasa Mahkemesi", "Bölge Adliye Mahkemeleri", "Yargıtay İBK", "Danıştay İBK"].map((c) => (
                <div key={c} className="border border-white/10 px-4 py-3 text-sm text-white/65">{c}</div>
              ))}
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
            <h2 className="text-xl font-bold mb-3">İçtihat aramasını şimdi deneyin</h2>
            <p className="text-white/50 mb-7 text-sm">14 gün ücretsiz. Kart bilgisi gerekmez.</p>
            <Link to="/deneme-baslat" className="inline-block px-10 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors">
              Ücretsiz başla
            </Link>
          </div>
          <SeoRelated current="/ictihat-arama" />
        </div>
      </div>
    </>
  );
}
