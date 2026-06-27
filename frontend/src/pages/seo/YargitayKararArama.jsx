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
      "name": "Yargıtay kararına nereden ulaşılır?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yargıtay kararlarına resmi yargitay.gov.tr sitesinden ulaşılabilir. Yapay zeka destekli platformlar ise semantik arama ile çok daha hızlı ve kapsamlı karar taraması sunar. Miron AI, 700.000'den fazla karar arasında doğal dille arama yapmanıza olanak tanır." }
    },
    {
      "@type": "Question",
      "name": "Yargıtay esas numarasına göre karar aranır mı?",
      "acceptedAnswer": { "@type": "Answer", "text": "Evet. Esas numarası veya karar numarası biliniyorsa doğrudan arama yapılabilir. Format genellikle 'Yıl/Sıra No' şeklindedir, örneğin: 2023/12345. Resmi site ve özel platformlar bu aramayı destekler." }
    },
    {
      "@type": "Question",
      "name": "Yargıtay kararı Türkçe olmayan dilden aranabilir mi?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yargıtay kararları yalnızca Türkçe olarak yayımlanır. Ancak bazı yapay zeka platformları, diğer dillerdeki sorguları Türkçeye çevirerek arama yapabilir." }
    },
    {
      "@type": "Question",
      "name": "En son Yargıtay kararlarına nasıl ulaşılır?",
      "acceptedAnswer": { "@type": "Answer", "text": "Son kararlar için yargitay.gov.tr'nin Kararlar bölümü veya Yargıtay Bilgi Bankası (YBK) kullanılabilir. Yapay zeka platformları düzenli güncelleme yapıyorsa en güncel kararlar da aranabilir." }
    }
  ]
};

export default function YargitayKararArama() {
  return (
    <>
      <SEOHead
        title="Yargıtay Karar Arama — Yapay Zeka ile Emsal Karar Bulun"
        description="Yargıtay ve Danıştay kararlarını yapay zeka ile arayın. Semantik arama, daire filtresi, tarih filtresi. Her kararda kaynak linki. Avukatlar için."
        canonical="/yargitay-karar-arama"
        schema={faqSchema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Emsal Karar Araştırması</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Yargıtay Karar Arama<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              dakikalar içinde doğru emsal
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            700.000'den fazla Yargıtay ve Danıştay kararı arasında semantik arama. Daire, tarih ve sonuç filtresiyle doğrudan ilgili emsal bulun.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Arama yöntemleri karşılaştırması</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/15">
                    <th className="text-left py-3 pr-4 text-white/50 font-medium">Özellik</th>
                    <th className="text-center py-3 pr-4 text-white/50 font-medium">Resmi site</th>
                    <th className="text-center py-3 text-[var(--miron-gold)] font-medium">Miron AI</th>
                  </tr>
                </thead>
                <tbody className="text-white/65">
                  {[
                    ["Arama türü", "Kelime bazlı", "Semantik (anlam bazlı)"],
                    ["Arama süresi", "Saatler", "Dakikalar"],
                    ["Karar özeti", "Yok", "Otomatik"],
                    ["Daire filtresi", "Var", "Var + öneriler"],
                    ["Onama/Bozma etiketi", "Yok", "Otomatik"],
                    ["Kaynak linki", "Var", "Var"],
                    ["Doğal dil sorgusu", "Yok", "Var"],
                  ].map(([o, r, m]) => (
                    <tr key={o} className="border-b border-white/8">
                      <td className="py-3 pr-4 text-white">{o}</td>
                      <td className="py-3 pr-4 text-center text-white/40">{r}</td>
                      <td className="py-3 text-center text-[var(--miron-gold)]">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Daire rehberi</h2>
            <p className="text-white/60 mb-6 text-sm leading-relaxed">Doğru daireden başlamak araştırma sürenizi önemli ölçüde kısaltır:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { daire: "9. HD / 22. HD", alan: "İş Hukuku (kıdem, ihbar, işe iade)" },
                { daire: "11. HD / 12. HD", alan: "Ticaret Hukuku" },
                { daire: "3. HD / 13. HD", alan: "Borçlar Hukuku" },
                { daire: "2. HD", alan: "Aile Hukuku" },
                { daire: "Ceza Daireleri", alan: "Ceza Hukuku" },
                { daire: "Danıştay 2. D.", alan: "İdare / Memur Hukuku" },
              ].map((d) => (
                <div key={d.daire} className="border border-white/10 px-5 py-4">
                  <span className="text-[var(--miron-gold)] text-sm font-bold">{d.daire}</span>
                  <p className="text-white/50 text-sm mt-1">{d.alan}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Doğru emsal kriterleri</h2>
            <div className="flex flex-col gap-4">
              {[
                { n: "1", t: "Hukuki sorun özdeş mi?", d: "Konu başlığı değil, hukuki sorunun özü aynı olmalı." },
                { n: "2", t: "Son 5 yıl içinde mi?", d: "İçtihat değişir. Eski kararları güncel mevzuatla karşılaştırın." },
                { n: "3", t: "Onama mı, bozma mı?", d: "Her iki sonuç da önemli ancak farklı şekillerde argüman oluşturur." },
                { n: "4", t: "Birden fazla tutarlı karar var mı?", d: "Tek karar yerine tutarlı içtihat daha güçlü argüman sunar." },
                { n: "5", t: "İçtihadı birleştirme kararı var mı?", d: "İBK'lar en bağlayıcı içtihat kaynağıdır, önce kontrol edin." },
              ].map((c) => (
                <div key={c.n} className="flex gap-4 border-b border-white/8 pb-4">
                  <span className="text-[var(--miron-gold)] font-mono font-bold min-w-[1.5rem]">{c.n}.</span>
                  <div>
                    <strong className="text-white text-sm">{c.t}</strong>
                    <p className="text-white/50 text-sm">{c.d}</p>
                  </div>
                </div>
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
            <h2 className="text-xl font-bold mb-3">Yargıtay aramasını hemen deneyin</h2>
            <p className="text-white/50 mb-7 text-sm">14 gün ücretsiz. Kurulum yok.</p>
            <Link to="/deneme-baslat" className="inline-block px-10 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors">
              Ücretsiz başla
            </Link>
          </div>
          <SeoRelated current="/yargitay-karar-arama" />
        </div>
      </div>
    </>
  );
}
