import SEOHead from "../../components/SEOHead.jsx";
import { Link } from "react-router-dom";
import { SeoRelated } from "../../components/SeoRelated.jsx";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "ChatGPT mi Miron AI mi? Avukatlar İçin Karşılaştırma",
      "description": "ChatGPT ve Miron AI'ın avukatlar için karşılaştırması. Türk hukukunda hangi AI daha güvenilir, hangisi içtihat bulabilir, hangisi KVKK uyumlu?",
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
          "name": "ChatGPT mi Miron AI mi tercih edilmeli?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Türk avukatlar için Miron AI tercih edilmelidir. Miron AI RAG teknolojisiyle 700.000+ Yargıtay kararında kaynaklı arama yapar ve her yanıtta gerçek karar numarası gösterir. ChatGPT ise Türk hukukunda %58-88 halüsinasyon riski taşır, güncel Yargıtay kararlarına erişemez ve KVKK uyumu belirsizdir."
          }
        },
        {
          "@type": "Question",
          "name": "ChatGPT hukuki araştırma için kullanılabilir mi?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hayır, ChatGPT hukuki araştırma için güvenilir değildir. Türk hukuku konularında halüsinasyon oranı %58-88 arasındadır, güncel Yargıtay kararlarını bilemez ve kaynak gösteremez. Yanlış içtihat kullanan avukat ciddi mesleki risklerle karşılaşabilir."
          }
        },
        {
          "@type": "Question",
          "name": "Miron AI ChatGPT'den nasıl farklıdır?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Miron AI yalnızca Türk hukuku için özelleşmiştir. RAG teknolojisiyle gerçek Yargıtay kararlarından kaynaklı yanıtlar üretir, KVKK tam uyumludur, müvekkil verilerini modele göndermez. ChatGPT ise genel amaçlı bir araçtır; Türk hukukunda yanılma oranı yüksektir ve avukatlık sırrı açısından risk taşır."
          }
        }
      ]
    }
  ]
};

const COMPARISON = [
  { kriter: "Veri tabanı", miron: "700K+ Yargıtay & Danıştay kararı", chatgpt: "Genel internet verisi (eğitim kesim tarihi var)" },
  { kriter: "Kaynak gösterimi", miron: "Her yanıtta karar numarası ve daire", chatgpt: "Kaynak gösteremez ya da uydurur" },
  { kriter: "Halüsinasyon riski", miron: "Düşük — RAG tabanlı gerçek karar", chatgpt: "%58-88 Türk hukuku konularında" },
  { kriter: "Türk hukuku uzmanlığı", miron: "Tam — yalnızca Türkiye için", chatgpt: "Genel bilgi seviyesi" },
  { kriter: "Güncel içtihat", miron: "Sürekli güncellenen veri tabanı", chatgpt: "Eğitim kesim tarihinden sonraki kararlar yok" },
  { kriter: "KVKK uyumu", miron: "Tam uyumlu — veri Türkiye'de", chatgpt: "ABD sunucuları — KVKK riski" },
  { kriter: "Avukatlık sırrı", miron: "Veriler modele gönderilmez, silinir", chatgpt: "OpenAI politikası — belirsiz" },
  { kriter: "Dilekçe üretimi", miron: "Davaya özel, içtihat destekli", chatgpt: "Genel şablon, kaynaksız" },
  { kriter: "Hukuki hesaplama", miron: "11 modül (kıdem, ihbar, faiz vb.)", chatgpt: "Hata yapma riski yüksek" },
  { kriter: "Fiyat", miron: "12.000 TL/ay + KDV", chatgpt: "~600 TL/ay (ChatGPT Plus)" },
];

const SCENARIOS = [
  {
    title: "Senaryo 1: Yargıtay kararı aramak",
    miron: "İlgili dairenin son 5 yıl içtihadını tarayarak karar numarasıyla birlikte listeler.",
    chatgpt: "Var olmayan kararlar üretebilir ya da eski bilgi verir. Karar numarası doğrulanamaz.",
    winner: "miron",
  },
  {
    title: "Senaryo 2: Kıdem tazminatı hesaplamak",
    miron: "Brüt ücret, çalışma süresi ve yasal parametrelere göre kesintisiz hesaplar.",
    chatgpt: "Formül doğru olabilir fakat güncel SGK tavan tutarını bilmeyebilir.",
    winner: "miron",
  },
  {
    title: "Senaryo 3: Sözleşme risk analizi",
    miron: "Kritik maddeleri çıkarır, Yargıtay içtihadına göre riskleri işaretler.",
    chatgpt: "Genel risk tespiti yapar fakat Türk içtihadıyla bağdaştıramaz.",
    winner: "miron",
  },
  {
    title: "Senaryo 4: Hızlı hukuki özet",
    miron: "Kaynaklar gösterilerek Türkçe özet üretir.",
    chatgpt: "Genel hukuk bilgisi için faydalı, küçük işler için yeterli olabilir.",
    winner: "tie",
  },
];

export default function ChatGPTvsMironAI() {
  return (
    <>
      <SEOHead
        title="ChatGPT mi Miron AI mi? Avukatlar İçin Karşılaştırma 2026"
        description="ChatGPT ve Miron AI'ı avukatlar için karşılaştırıyoruz. Türk hukukunda halüsinasyon riski, kaynak gösterimi, KVKK uyumu ve fiyat analizi."
        canonical="/chatgpt-mi-miron-ai-mi"
        schema={schema}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-8 pb-24 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto">

          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-4">Karşılaştırma · Haziran 2026</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            ChatGPT mi, Miron AI mi?
          </h1>
          <p className="text-lg text-white/60 mb-4">Türk avukatlar için hangisi daha güvenilir?</p>

          <p className="text-lg text-white/70 leading-relaxed mb-12 border-l-2 border-yellow-500 pl-5">
            <strong className="text-white">Kısa cevap:</strong> Türk avukatlar için <strong className="text-yellow-400">Miron AI</strong> tercih edilmelidir. ChatGPT Türk hukukunda %58–88 halüsinasyon riski taşır, güncel Yargıtay kararlarına erişemez ve KVKK uyumu belirsizdir. Miron AI ise 700.000+ gerçek yargı kararıyla çalışır, her yanıtta kaynak gösterir.
          </p>

          <h2 className="text-2xl font-bold mb-6">Detaylı Karşılaştırma</h2>
          <div className="overflow-x-auto mb-14">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-white/50 font-medium w-1/3">Kriter</th>
                  <th className="text-left py-3 pr-6 text-yellow-400 font-medium w-1/3">Miron AI</th>
                  <th className="text-left py-3 text-white/50 font-medium w-1/3">ChatGPT</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.kriter} className="border-b border-white/5">
                    <td className="py-3 pr-6 text-white/60 font-medium align-top">{row.kriter}</td>
                    <td className="py-3 pr-6 text-green-400 align-top">{row.miron}</td>
                    <td className="py-3 text-white/40 align-top">{row.chatgpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-6">Gerçek Kullanım Senaryoları</h2>
          <div className="space-y-4 mb-14">
            {SCENARIOS.map((s) => (
              <div key={s.title} className="glass rounded-xl p-5 border border-white/10">
                <h3 className="font-bold text-white mb-3">{s.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-yellow-400 mb-1">
                      Miron AI {s.winner === "miron" ? "✓ Kazanır" : "—"}
                    </p>
                    <p className="text-white/60">{s.miron}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/40 mb-1">ChatGPT</p>
                    <p className="text-white/40">{s.chatgpt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-6 mb-14 border border-red-500/20">
            <h2 className="text-xl font-bold text-red-400 mb-3">ChatGPT ile Hukuki Araştırma Riskleri</h2>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex gap-3"><span className="text-red-400">!</span>ChatGPT var olmayan Yargıtay kararları üretebilir (halüsinasyon)</li>
              <li className="flex gap-3"><span className="text-red-400">!</span>Müvekkil verilerini OpenAI sunucularına gönderir — KVKK ve avukatlık sırrı riski</li>
              <li className="flex gap-3"><span className="text-red-400">!</span>2023 sonrası Yargıtay kararlarını bilmez</li>
              <li className="flex gap-3"><span className="text-red-400">!</span>Yanıtların doğruluğunu denetlemek zaman alır, verimlilik kaybı</li>
              <li className="flex gap-3"><span className="text-red-400">!</span>Hatalı içtihat kullanımı mesleki sorumluluk riski yaratır</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-6">Sık Sorulan Sorular</h2>
          <div className="space-y-4 mb-14">
            {[
              {
                q: "ChatGPT hukuki araştırma için kullanılabilir mi?",
                a: "Hayır, güvenilir değildir. Türk hukuku konularında halüsinasyon oranı %58-88'dir, güncel Yargıtay kararlarını bilemez ve kaynak gösteremez. Yanlış içtihat kullanan avukat ciddi mesleki risklerle karşılaşabilir."
              },
              {
                q: "Miron AI ne kadar güvenilir?",
                a: "Miron AI RAG teknolojisiyle çalışır; her yanıt gerçek Yargıtay kararlarına dayandırılır ve karar numarasıyla gösterilir. ChatGPT'ye kıyasla Türk hukuku için çok daha güvenilirdir. KVKK uyumludur ve müvekkil verilerini model eğitimine kullanmaz."
              },
              {
                q: "Avukatlar için ChatGPT'ye alternatif nedir?",
                a: "Türk avukatlar için en iyi ChatGPT alternatifi Miron AI'dır. 700.000+ Yargıtay kararıyla çalışır, KVKK uyumludur ve hukuki içtihat araştırması için özelleşmiştir."
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-white/10 rounded-xl p-5">
                <h3 className="font-bold text-white mb-2">{q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <div className="border border-yellow-500/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Miron AI ile Başlayın</h2>
            <p className="text-white/50 text-sm mb-6">ChatGPT yerine hukuka özel, kaynaklı yapay zekâ.</p>
            <Link to="/kaydol" className="inline-block bg-yellow-500 text-black font-bold px-10 py-3 rounded-lg hover:bg-yellow-400 transition-colors">
              Ücretsiz Kayıt Ol
            </Link>
          </div>
          <SeoRelated current="/chatgpt-mi-miron-ai-mi" source="Dahl et al., Journal of Legal Analysis (2024)" />

        </div>
      </div>
    </>
  );
}
