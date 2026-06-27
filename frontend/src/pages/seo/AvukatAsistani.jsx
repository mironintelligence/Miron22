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
      "name": "Yapay zeka avukat asistanı ne kadar güvenilir?",
      "acceptedAnswer": { "@type": "Answer", "text": "RAG mimarisi kullanan yapay zeka asistanları gerçek hukuk veritabanlarına dayandığından hallüsinasyon riski minimumdur. Her yanıt kaynağıyla gösterilir ve doğrulanabilir. Nihai hukuki karar yine de avukatta kalır." }
    },
    {
      "@type": "Question",
      "name": "Avukat yapay zeka asistanı KVKK'ya uyumlu mu?",
      "acceptedAnswer": { "@type": "Answer", "text": "Miron AI KVKK uyumlu çalışır. Müvekkil bilgileri ve dava detayları güvenli şekilde işlenir, üçüncü taraflarla paylaşılmaz ve model eğitiminde kullanılmaz." }
    },
    {
      "@type": "Question",
      "name": "Yapay zeka asistanı Türkçe hukuk diline hakim mi?",
      "acceptedAnswer": { "@type": "Answer", "text": "Evet. Miron AI Türk hukuku terminolojisi, mevzuatı ve içtihadı üzerine özelleştirilmiştir. Standart hukuki Türkçeyi hem anlayar hem üretebilir." }
    },
    {
      "@type": "Question",
      "name": "Kaç farklı hukuk alanında asistan var mı?",
      "acceptedAnswer": { "@type": "Answer", "text": "Miron AI iş hukuku, ticaret hukuku, borçlar hukuku, aile hukuku, ceza hukuku ve idare hukuku dahil Türk hukukunun tüm temel alanlarında asistan hizmeti sunar." }
    }
  ]
};

export default function AvukatAsistani() {
  return (
    <>
      <SEOHead
        title="Avukat Yapay Zeka Asistanı — Türk Hukuku için AI Destekli Çalışma"
        description="Avukatlar için yapay zeka asistanı: içtihat, mevzuat, dilekçe ve risk analizi. KVKK uyumlu, kaynaklı, Türk hukukuna özel. Ücretsiz deneyin."
        canonical="/avukat-yapay-zeka-asistani"
        schema={faqSchema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24">
        <div className="max-w-3xl mx-auto">

          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-white/30 mb-5">Yapay Zeka Asistan</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Avukat Yapay Zeka Asistanı<br />
            <span style={{ background: "linear-gradient(90deg,#ebac00,#b88700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Türk hukuku için özelleştirilmiş
            </span>
          </h1>
          <p className="text-white/55 text-lg mb-16 leading-relaxed">
            İçtihat, mevzuat, risk analizi ve dilekçe desteği — tek bir asistanda. Her yanıt Yargıtay kaynaklı, doğrulanabilir.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Genel asistanla fark nedir?</h2>
            <p className="text-white/60 leading-relaxed mb-5">
              ChatGPT veya Gemini gibi genel asistanlar hukuki sorulara tahmin üretir. Türkiye hukuk sistemine özgü güncel içtihadı bilmezler; ürettikleri "Yargıtay kararları" çoğunlukla gerçek değildir.
            </p>
            <p className="text-white/60 leading-relaxed mb-5">
              Miron AI ise farklı çalışır: her yanıt, gerçek veritabanında arama yapıldıktan sonra bulunan gerçek belgelere dayandırılır. Kararın esas numarasını, tarihini ve kaynağını görürsünüz. Doğrulanamayan yanıt vermez.
            </p>
            <p className="text-white/60 leading-relaxed">
              Bu fark teorik değil, pratik bir ayrımdır. Mahkemede "Yargıtay bu konuda X demiştir" diyebilmek için o kararın gerçek olması gerekir.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Asistan ne yapabilir?</h2>
            <div className="flex flex-col gap-0">
              {[
                { q: "Bu davanın benzer örnekleri Yargıtay'da var mı?", a: "İlgili kararları listeler, özetler ve kaynak gösterir." },
                { q: "Bu sözleşmede riskli maddeler hangileri?", a: "Sözleşmeyi okur, yüksek riskli bölümleri işaretler, hukuki gerekçe sunar." },
                { q: "İşçi bu davayı kazanma ihtimali nedir?", a: "Benzer davaların sonuçlarını tarar, risk skoru ve strateji önerisi verir." },
                { q: "Kıdem tazminatını nasıl hesaplarım?", a: "Güncel tavan rakamlarıyla adım adım hesaplar, yasal dayanağı gösterir." },
                { q: "Bu konuda dilekçe taslağı oluşturabilir misin?", a: "Standart format ve içtihat destekli taslak oluşturur, düzenlemenizi bekler." },
              ].map((item, i) => (
                <div key={i} className="border-b border-white/8 py-5">
                  <p className="text-white/80 font-medium mb-2 text-sm">Soru: "{item.q}"</p>
                  <p className="text-[var(--miron-gold)] text-sm">→ {item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Güvenlik ve gizlilik</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: "🔒", title: "KVKK uyumlu", desc: "Kişisel ve dava verileriniz mevzuata uygun işlenir." },
                { icon: "🚫", title: "Model eğitiminde kullanılmaz", desc: "Verileriniz AI modelini geliştirmek için kullanılmaz." },
                { icon: "🛡️", title: "Müvekkil gizliliği", desc: "Hiçbir dava detayı üçüncü taraflarla paylaşılmaz." },
                { icon: "🔐", title: "Şifreli depolama", desc: "Tüm sohbet geçmişi şifreli biçimde saklanır." },
              ].map((g) => (
                <div key={g.title} className="border border-white/10 p-5">
                  <span className="text-lg mb-2 block">{g.icon}</span>
                  <h3 className="font-bold text-white text-sm mb-1">{g.title}</h3>
                  <p className="text-white/45 text-sm">{g.desc}</p>
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
            <h2 className="text-xl font-bold mb-3">Asistanı şimdi deneyin</h2>
            <p className="text-white/50 mb-7 text-sm">14 gün ücretsiz. Kayıt yeterli.</p>
            <Link to="/deneme-baslat" className="inline-block px-10 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors">
              Ücretsiz başla
            </Link>
          </div>
          <SeoRelated current="/avukat-yapay-zeka-asistani" />
        </div>
      </div>
    </>
  );
}
