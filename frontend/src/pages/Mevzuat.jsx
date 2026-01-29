// src/pages/Mevzuat.jsx
import React, { useState } from "react";

const quickLaws = ["TBK", "TCK", "İİK", "HMK", "TTK"];

export default function Mevzuat() {
  const [law, setLaw] = useState("");
  const [article, setArticle] = useState("");
  const [articleText, setArticleText] = useState("");
  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAnswer("");

    if (!question.trim()) {
      setError("Önce bir soru / olay özeti yaz.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        law: law.trim() || null,
        article: article.trim() || null,
        question: question.trim(),
        article_text: articleText.trim() || null,
      };

      const res = await fetch("http://127.0.0.1:8000/mevzuat/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Sunucudan hata döndü.");
      }

      const data = await res.json();
      setAnswer(data.answer || "");
    } catch (err) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const setLawQuick = (k) => {
    setLaw(k);
  };

  return (
    <div className="mt-24 max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        {/* SOL: FORM */}
        <div className="glass px-6 py-6">
          <h2 className="text-2xl font-semibold mb-1">Mevzuat Analizi (AI)</h2>
          <p className="text-sm text-gray-500 mb-5">
            Belirli bir kanun ve maddeyi baz alarak veya sadece olayı anlatarak
            AI'dan açıklama, risk analizi ve strateji önerileri al.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kanun + Madde */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Kanun (opsiyonel)
                </label>
                <input
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                  value={law}
                  onChange={(e) => setLaw(e.target.value)}
                  placeholder="TBK, TCK, İİK..."
                />
                <div className="flex flex-wrap gap-1.5">
                  {quickLaws.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLawQuick(k)}
                      className={`px-2 py-1 rounded-full text-[11px] border border-white/10 ${
                        law === k ? "bg-primary text-black" : "bg-black/40"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Madde (opsiyonel)
                </label>
                <input
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="344, 32, 89/1..."
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Sadece kanun adını bile yazsan yeterli.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Not
                </label>
                <div className="text-[11px] text-gray-500 bg-black/40 border border-white/5 rounded-xl px-3 py-2">
                  Kanun / madde girmeden sadece olayı da anlatabilirsin; sistem
                  kendisi ilgili alanı tahmin etmeye çalışır.
                </div>
              </div>
            </div>

            {/* MADDE METNİ */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Madde metni (opsiyonel ama önerilir)
              </label>
              <textarea
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs min-h-[90px] focus:outline-none focus:ring-1 focus:ring-primary"
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder="İlgili kanun maddesinin tamamını buraya yapıştırırsan, AI yorumunu doğrudan bu metne göre yapar."
              />
            </div>

            {/* SORU / OLAY */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Soru / Olay Özeti
              </label>
              <textarea
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Örn: TBK m.344 kapsamında kira artış oranı nasıl belirlenir? Kiracı 5 yıldır oturuyor, sözleşmede TÜFE + %10 yazıyor..."
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-full bg-primary text-xs font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Analiz ediliyor..." : "AI ile Mevzuat Analizi Yap"}
              </button>
              <span className="text-[11px] text-gray-500">
                Güncel ve resmi metin için mevzuat.gov.tr’yi mutlaka kontrol et.
              </span>
            </div>
          </form>
        </div>

        {/* SAĞ: CEVAP + İPUÇLARI */}
        <div className="space-y-4">
          <div className="glass px-5 py-4 min-h-[160px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Analiz Sonucu</h3>
            </div>

            {loading && (
              <div className="text-xs text-gray-400">Cevap üretiliyor...</div>
            )}

            {!loading && !answer && (
              <div className="text-xs text-gray-500">
                Henüz bir analiz yok. Soldaki alanları doldurup sorgu gönder.
              </div>
            )}

            {!loading && answer && (
              <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>

          <div className="glass px-5 py-4">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">
              İpucu: Mevzuatı AI ile kullanırken
            </h4>
            <ul className="text-[11px] text-gray-400 space-y-1.5">
              <li>
                • İmkanın varsa ilgili maddeyi mevzuat.gov.tr’den kopyalayıp
                yukarıdaki kutuya yapıştır; AI yorumu direkt o metne göre yapar.
              </li>
              <li>
                • Olay özetinde tarih, taraf ilişkisi, sözleşme türü ve temel
                talebini net yaz; bulanık anlatırsan cevap da bulanık olur.
              </li>
              <li>
                • Çıkan sonucu “ön analiz” gibi düşün; nihai hukuki görüş için
                her zaman sorumlu avukat kontrolü gerekir.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
