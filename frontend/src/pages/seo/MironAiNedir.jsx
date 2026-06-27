import SEOHead from "../../components/SEOHead.jsx";
import { Link } from "react-router-dom";
import { SeoRelated } from "../../components/SeoRelated.jsx";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.mironintelligence.com/#software",
      "name": "Miron AI",
      "alternateName": "Miron Intelligence",
      "applicationCategory": "LegalTechnology",
      "operatingSystem": "Web",
      "url": "https://www.mironintelligence.com/",
      "description": "Miron AI, Türkiye'deki avukatlar ve hukuk büroları için RAG teknolojisiyle geliştirilmiş yapay zekâ destekli hukuk araştırma asistanıdır. 700.000'den fazla Yargıtay ve Danıştay kararında kaynaklı arama yapar.",
      "featureList": [
        "İçtihat arama — 700.000+ Yargıtay ve Danıştay kararı",
        "Kaynaklı yapay zekâ yanıtları",
        "Hukuki hesaplama motoru (11 modül)",
        "Sözleşme analizi ve taslak üretimi",
        "Dilekçe oluşturma",
        "Risk analizi ve dava stratejisi",
        "KVKK uyumlu altyapı"
      ],
      "offers": {
        "@type": "Offer",
        "price": "6999",
        "priceCurrency": "TRY",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "6999",
          "priceCurrency": "TRY",
          "unitText": "aylık"
        }
      },
      "publisher": {
        "@type": "Organization",
        "name": "Miron GROUP LLC",
        "url": "https://www.mironintelligence.com/"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Miron AI nedir?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miron AI, Türkiye'deki avukatlar için geliştirilmiş yapay zekâ destekli hukuk araştırma asistanıdır. RAG (Retrieval-Augmented Generation) teknolojisiyle 700.000'den fazla Yargıtay ve Danıştay kararında kaynaklı, doğrulanabilir arama yapar. Genel amaçlı yapay zekâ araçlarına kıyasla çok daha düşük hallüsinasyon riski sunar."
          }
        },
        {
          "@type": "Question",
          "name": "Miron AI ne işe yarar?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miron AI; içtihat araştırması, sözleşme analizi, dilekçe oluşturma, kıdem ve ihbar tazminatı hesaplama, dava risk değerlendirmesi gibi avukatlık süreçlerini otomatize eder. 11 ayrı hukuki hesaplama modülü ve 700.000+ yargı kararı ile Türk avukatlarının araştırma süresini önemli ölçüde kısaltır."
          }
        },
        {
          "@type": "Question",
          "name": "Miron AI ChatGPT'den farkı nedir?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ChatGPT genel amaçlı bir yapay zekâdır ve Türk hukuku hakkında güncel, kaynaklı bilgi sunamaz. Miron AI ise yalnızca Türk hukuku için özelleştirilmiştir: her yanıtta gerçek Yargıtay karar numarası gösterir, KVKK uyumludur ve halüsinasyon riski çok daha düşüktür."
          }
        },
        {
          "@type": "Question",
          "name": "Miron AI güvenilir mi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Evet. Miron AI, RAG teknolojisiyle çalıştığı için her yanıt gerçek yargı kararlarına dayandırılır. Sistem müvekkil verilerini kalıcı kaydetmez, model eğitiminde kullanmaz ve KVKK standartlarına tam uyumludur."
          }
        },
        {
          "@type": "Question",
          "name": "Miron AI fiyatı nedir?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miron AI aylık 12.000 TL + KDV'dir. Tekli lisans, tek kullanıcı. Toplu kullanım için iletişime geçiniz: mironintelligence@gmail.com"
          }
        }
      ]
    }
  ]
};

export default function MironAiNedir() {
  return (
    <>
      <SEOHead
        title="Miron AI Nedir? — Avukatlar İçin Yapay Zekâ Hukuk Asistanı"
        description="Miron AI, Türkiye'deki avukatlar için RAG teknolojisiyle geliştirilmiş yapay zekâ destekli hukuk araştırma asistanıdır. 700.000+ Yargıtay kararında kaynaklı arama yapar."
        canonical="/miron-ai-nedir"
        schema={schema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-8 pb-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">

          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-4">Ürün Açıklaması</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Miron AI Nedir?
          </h1>

          <p className="text-lg text-white/70 leading-relaxed mb-8 border-l-2 border-yellow-500 pl-5">
            <strong className="text-white">Miron AI</strong>, Türkiye'deki avukatlar ve hukuk büroları için geliştirilen
            yapay zekâ destekli hukuk araştırma asistanıdır. RAG (Retrieval-Augmented Generation)
            teknolojisiyle 700.000'den fazla Yargıtay ve Danıştay kararında kaynaklı, doğrulanabilir
            arama yapar. Genel yapay zekâ araçlarına kıyasla halüsinasyon riski önemli ölçüde azaltılmıştır.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {[
              { label: "Yargı Kararı", value: "700K+" },
              { label: "Hesaplama Modülü", value: "11" },
              { label: "Aylık Fiyat", value: "12.000 TL" },
              { label: "Dil", value: "Türkçe" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-yellow-400 mb-1">{s.value}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4">Temel Özellikler</h2>
          <ul className="space-y-3 mb-12 text-white/70 text-sm leading-relaxed">
            {[
              "İçtihat Araştırması — 700.000+ Yargıtay ve Danıştay kararında semantik arama; her yanıtta karar numarası ve daire bilgisi gösterilir.",
              "Hukuki Asistan (Miron Assistant) — Türk hukukuna özel yapay zekâ sohbet asistanı; dava bazlı soru-cevap, kaynaklı yanıtlar.",
              "Hesaplama Motoru — Kıdem tazminatı, ihbar, fazla mesai, yasal faiz, harç, icra masrafları dahil 11 modül.",
              "Sözleşme Analizi — Risk tespiti, kritik madde çıkarımı, otomatik özet.",
              "Dilekçe Oluşturma — Davaya özel taslak; düzenleme ve dışa aktarma desteği.",
              "Risk & Strateji — Dava kazanma/kaybetme olasılığı, alternatif strateji önerileri.",
              "KVKK Uyumu — Veriler kalıcı kaydedilmez, model eğitiminde kullanılmaz, uçtan uca şifreli.",
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="text-yellow-400 mt-0.5">▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold mb-4">ChatGPT ve Genel Yapay Zekâdan Farkı</h2>
          <div className="overflow-x-auto mb-12">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-white/50 font-medium">Kriter</th>
                  <th className="text-left py-3 pr-6 text-yellow-400 font-medium">Miron AI</th>
                  <th className="text-left py-3 text-white/50 font-medium">ChatGPT / Genel AI</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                {[
                  ["Veri kaynağı", "700K+ Yargıtay & Danıştay kararı", "Genel internet verisi"],
                  ["Kaynak gösterimi", "Her yanıtta karar numarası", "Yok veya güvenilmez"],
                  ["Halüsinasyon riski", "Düşük (RAG tabanlı)", "Yüksek (%58–88)"],
                  ["Türk hukuku", "Tam uzmanlaşmış", "Genel bilgi seviyesi"],
                  ["KVKK uyumu", "Tam uyumlu", "Belirsiz / yetersiz"],
                  ["Güncellik", "Sürekli güncellenen", "Eğitim kesme tarihi ile sınırlı"],
                ].map(([k, v1, v2]) => (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-2.5 pr-6 font-medium text-white/60">{k}</td>
                    <td className="py-2.5 pr-6 text-green-400">{v1}</td>
                    <td className="py-2.5 text-white/40">{v2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">Sık Sorulan Sorular</h2>
          <div className="space-y-5 mb-12">
            {[
              {
                q: "Miron AI ne işe yarar?",
                a: "Miron AI; içtihat araştırması, sözleşme analizi, dilekçe oluşturma, kıdem ve ihbar tazminatı hesaplama, dava risk değerlendirmesi gibi avukatlık süreçlerini hızlandırır. 11 hukuki hesaplama modülü ve 700.000+ yargı kararı ile avukatların araştırma süresini önemli ölçüde kısaltır.",
              },
              {
                q: "Miron AI güvenilir mi?",
                a: "Evet. Miron AI RAG teknolojisiyle çalışır; her yanıt gerçek Yargıtay kararlarına dayandırılır. Müvekkil verilerini kalıcı kaydetmez, model eğitiminde kullanmaz ve KVKK standartlarına tam uyumludur.",
              },
              {
                q: "Miron AI Türkiye'de kullanılabilir mi?",
                a: "Evet. Miron AI yalnızca Türkiye pazarı için geliştirilmiştir. Türkçe arayüz, Türk yargı kararları ve Türk mevzuatı ile çalışır. Miron GROUP LLC bünyesinde geliştirilmektedir.",
              },
              {
                q: "Miron AI'a nasıl abone olunur?",
                a: "mironintelligence.com/kaydol adresinden kayıt oluşturabilirsiniz. Fiyat 12.000 TL + KDV/ay'dır. Toplu kullanım için iletişime geçiniz.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <div className="border border-yellow-500/30 rounded-xl p-6 text-center">
            <p className="text-white/60 text-sm mb-4">Miron AI'ı ücretsiz deneyin</p>
            <Link to="/kaydol" className="inline-block bg-yellow-500 text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors">
              Kayıt Ol — Ücretsiz Başla
            </Link>
          </div>
          <SeoRelated current="/miron-ai-nedir" source="Dahl et al., Journal of Legal Analysis (2024)" />

        </div>
      </div>
    </>
  );
}
