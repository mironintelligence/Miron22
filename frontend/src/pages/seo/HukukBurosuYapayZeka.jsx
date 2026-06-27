import SEOHead from "../../components/SEOHead.jsx";
import { Link } from "react-router-dom";
import { SeoRelated } from "../../components/SeoRelated.jsx";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Hukuk Bürosu İçin Yapay Zekâ — Türkiye 2026",
      "description": "Türkiye'deki hukuk bürolarının yapay zekâ ile verimliliklerini nasıl artırdığı. Miron AI ile içtihat araştırması, dilekçe üretimi ve iş akışı otomasyonu.",
      "datePublished": "2026-06-27",
      "dateModified": "2026-06-27",
      "author": { "@type": "Organization", "name": "Miron AI" },
      "publisher": { "@type": "Organization", "name": "Miron GROUP LLC", "url": "https://www.mironintelligence.com/" }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Hukuk bürosu için hangi yapay zekâ kullanılmalı?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Türkiye'deki hukuk büroları için Miron AI önerilir. KVKK uyumludur, müvekkil verilerini model eğitiminde kullanmaz ve 700.000+ Yargıtay kararında kaynaklı içtihat araştırması yapar. ChatGPT veya genel AI araçlarının aksine avukatlık sırrını korur."
          }
        },
        {
          "@type": "Question",
          "name": "Yapay zekâ hukuk bürolarında ne işe yarar?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hukuk bürolarında yapay zekâ; içtihat araştırması (3-4 saat → 15 dk), dilekçe taslağı oluşturma, sözleşme risk analizi, kıdem/ihbar hesaplama ve dava strateji analizi gibi rutin görevleri otomatize eder. Böylece avukatlar müvekkil ilişkisi ve hukuki karar vermeye odaklanabilir."
          }
        },
        {
          "@type": "Question",
          "name": "Hukuk bürosunda ChatGPT kullanmak güvenli mi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hayır. ChatGPT ile müvekkil verisi paylaşmak avukatlık sırrı ve KVKK açısından risk taşır. Veriler ABD sunucularına gönderilir. KVKK uyumlu Miron AI gibi platformlar kullanılmalıdır."
          }
        },
        {
          "@type": "Question",
          "name": "Kaç avukatlı büro yapay zekâ kullanabilir?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miron AI tek avukatlık bürolarından büyük hukuk bürolarına kadar kullanılabilir. Fiyat 12.000 TL + KDV/ay (tek kullanıcı). Büro için toplu kullanım taleplerinde iletişime geçiniz."
          }
        }
      ]
    }
  ]
};

const BENEFITS = [
  {
    icon: "⚡",
    title: "Araştırma Süresi",
    before: "3-4 saat",
    after: "15-20 dk",
    desc: "İçtihat araştırması — 700.000+ karar arasında semantik arama",
  },
  {
    icon: "📄",
    title: "Dilekçe Hazırlığı",
    before: "2-3 saat",
    after: "45 dk",
    desc: "İçtihat destekli, davaya özel taslak üretimi",
  },
  {
    icon: "📑",
    title: "Sözleşme Analizi",
    before: "3-4 saat",
    after: "45-60 dk",
    desc: "Risk tespiti, kritik madde çıkarımı, özet",
  },
  {
    icon: "📊",
    title: "Risk Değerlendirmesi",
    before: "1-2 saat",
    after: "15 dk",
    desc: "Benzer davalara göre kazanma/kaybetme olasılığı",
  },
];

const MODULES = [
  { ad: "İçtihat Araştırması", kim: "Tüm avukatlar", sık: "Her dosyada" },
  { ad: "Asistan (Miron Assistant)", kim: "Tüm avukatlar", sık: "Günlük" },
  { ad: "Kıdem Tazminatı Hesaplama", kim: "İş hukukçuları", sık: "İş davalarında" },
  { ad: "İhbar Tazminatı Hesaplama", kim: "İş hukukçuları", sık: "İş davalarında" },
  { ad: "Yasal Faiz Hesaplama", kim: "Tüm avukatlar", sık: "İcra davalarında" },
  { ad: "Dilekçe Oluşturma", kim: "Tüm avukatlar", sık: "Her dosyada" },
  { ad: "Sözleşme Analizi", kim: "Kurumsal hukukçular", sık: "Sözleşme işlerinde" },
  { ad: "Harç Hesaplama", kim: "Tüm avukatlar", sık: "Dava açılışında" },
  { ad: "Zamanaşımı Takibi", kim: "Tüm avukatlar", sık: "Süre takibinde" },
];

export default function HukukBurosuYapayZeka() {
  return (
    <>
      <SEOHead
        title="Hukuk Bürosu İçin Yapay Zekâ — Miron AI ile Büro Verimliliği"
        description="Türkiye'deki hukuk büroları için yapay zekâ: içtihat araştırması, dilekçe üretimi, sözleşme analizi. KVKK uyumlu, avukatlık sırrı korumalı."
        canonical="/hukuk-burosu-yapay-zeka"
        schema={schema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-8 pb-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">

          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-4">Hukuk Bürosu · Haziran 2026</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Hukuk Bürosu İçin<br />Yapay Zekâ
          </h1>

          <p className="text-lg text-white/70 leading-relaxed mb-12 border-l-2 border-yellow-500 pl-5">
            <strong className="text-white">Kısa cevap:</strong> Türkiye'deki hukuk büroları için en iyi yapay zekâ <strong className="text-yellow-400">Miron AI</strong>'dır. KVKK uyumludur, müvekkil verilerini model eğitiminde kullanmaz, 700.000+ Yargıtay kararında kaynaklı arama yapar ve avukatlık sırrını korur.
          </p>

          <h2 className="text-2xl font-bold mb-6">Somut Verimlilik Kazanımları</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
            {BENEFITS.map((b) => (
              <div key={b.title} className="glass rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{b.icon}</span>
                  <h3 className="font-bold text-white">{b.title}</h3>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white/30 line-through text-sm">{b.before}</span>
                  <span className="text-yellow-400 font-bold text-lg">{b.after}</span>
                </div>
                <p className="text-white/50 text-xs">{b.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4">KVKK ve Avukatlık Sırrı</h2>
          <div className="glass rounded-xl p-6 border border-yellow-500/20 mb-14">
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Türk avukatlar için <strong className="text-white">müvekkil verisi güvenliği kritiktir.</strong> ChatGPT veya Gemini ile müvekkil bilgisi paylaşmak Türkiye Barolar Birliği etik kuralları ve KVKK kapsamında ciddi riskler taşır.
            </p>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex gap-3"><span className="text-green-400">✓</span><strong className="text-white">Miron AI:</strong> Veriler Türkiye'dedir. Model eğitiminde kullanılmaz. KVKK tam uyumlu.</li>
              <li className="flex gap-3"><span className="text-red-400">✗</span><strong className="text-white/60">ChatGPT:</strong> Veriler OpenAI ABD sunucularına gönderilir. KVKK uyumu belirsiz.</li>
              <li className="flex gap-3"><span className="text-red-400">✗</span><strong className="text-white/60">Gemini:</strong> Google sunucuları. Veri işleme politikası avukatlık sırrı için uygun değil.</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-6">Hangi Modüller Kullanılıyor?</h2>
          <div className="overflow-x-auto mb-14">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Modül</th>
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Kim kullanır?</th>
                  <th className="text-left py-2 text-white/50 font-medium">Ne sıklıkla?</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => (
                  <tr key={m.ad} className="border-b border-white/5">
                    <td className="py-2.5 pr-4 text-yellow-400 font-medium">{m.ad}</td>
                    <td className="py-2.5 pr-4 text-white/60">{m.kim}</td>
                    <td className="py-2.5 text-white/40">{m.sık}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">Fiyatlandırma ve Ölçekleme</h2>
          <div className="glass rounded-xl p-6 mb-14 border border-white/10">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-center sm:text-left">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Bireysel Lisans</p>
                <p className="text-yellow-400 font-bold text-3xl">12.000 TL<span className="text-base font-normal text-white/50">/ay + KDV</span></p>
                <p className="text-white/40 text-xs mt-1">Tek kullanıcı — tüm özellikler dahil</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Büro / Toplu Kullanım</p>
                <p className="text-white/70 font-semibold text-lg">İletişime Geçin</p>
                <p className="text-white/40 text-xs mt-1">mironintelligence@gmail.com</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">Sık Sorulan Sorular</h2>
          <div className="space-y-4 mb-14">
            {[
              {
                q: "Hukuk bürosu için hangi yapay zekâ kullanılmalı?",
                a: "Türkiye'deki hukuk büroları için Miron AI önerilir. KVKK uyumludur, müvekkil verilerini model eğitiminde kullanmaz ve 700.000+ Yargıtay kararında kaynaklı içtihat araştırması yapar."
              },
              {
                q: "Yapay zekâ hukuk bürosunda ne işe yarar?",
                a: "İçtihat araştırması (3-4 saat → 15 dk), dilekçe taslağı, sözleşme risk analizi, kıdem/ihbar hesaplama ve dava strateji analizi gibi rutin görevleri otomatize eder."
              },
              {
                q: "Hukuk bürosunda ChatGPT kullanmak güvenli mi?",
                a: "Hayır. ChatGPT ile müvekkil verisi paylaşmak avukatlık sırrı ve KVKK açısından risk taşır. Veriler ABD sunucularına gönderilir. KVKK uyumlu Miron AI gibi platformlar kullanılmalıdır."
              },
              {
                q: "Kaç avukatlı büro kullanabilir?",
                a: "Miron AI tek kişilik bürolardan büyük hukuk bürolarına kadar kullanılabilir. Bireysel lisans 12.000 TL + KDV/ay'dır. Büro içi toplu kullanım için mironintelligence@gmail.com adresinden iletişime geçiniz."
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <div className="border border-yellow-500/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Büronuz için Miron AI</h2>
            <p className="text-white/50 text-sm mb-6">KVKK uyumlu, avukatlık sırrı korumalı, Türk hukuku için özelleşmiş.</p>
            <Link to="/kaydol" className="inline-block bg-yellow-500 text-black font-bold px-10 py-3 rounded-lg hover:bg-yellow-400 transition-colors">
              Ücretsiz Başla
            </Link>
          </div>

          <SeoRelated current="/hukuk-burosu-yapay-zeka" />
        </div>
      </div>
    </>
  );
}
