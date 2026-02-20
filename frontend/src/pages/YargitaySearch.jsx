// src/pages/YargitaySearch.jsx
import React, { useState } from "react";

const hukukDaireleri = [
  "3. HD",
  "4. HD",
  "11. HD",
  "13. HD",
  "YHGK",
];

const cezaDaireleri = [
  "1. CD",
  "5. CD",
  "11. CD",
];

export default function YargitaySearch() {
  const [question, setQuestion] = useState("");
  const [chamber, setChamber] = useState("");
  const [year, setYear] = useState("");
  const [law, setLaw] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [useDecisionText, setUseDecisionText] = useState(false);

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAnswer("");

    if (!question.trim()) {
      setError("Önce olayını veya sorunu detaylı yaz.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        question: question.trim(),
        chamber: chamber.trim() || null,
        year: year ? Number(year) : null,
        law: law.trim() || null,
        decision_text:
          useDecisionText && decisionText.trim()
            ? decisionText.trim()
            : null,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/yargitay/ai-search`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        }
      );

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

  const setChamberQuick = (val) => {
    setChamber(val);
  };

  const setLawQuick = (val) => {
    setLaw(val);
  };

  return (
    <div className="mt-24 max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        {/* SOL TARAF: FORM */}
        <div className="glass px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Yargıtay Karar Analizi (AI)
              </h2>
              <p className="text-sm text-subtle">
                Olayını, filtrelerini ve (varsa) karar metnini gir; AI sana
                emsal mantığı, riskler ve stratejiyi anlatsın.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OLAY / SORU */}
            <div>
              <label className="block text-xs font-medium text-subtle mb-1">
                Soru / Olay Özeti
              </label>
              <textarea
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm min-h-[130px] focus:outline-none focus:ring-1 focus:ring-accent"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Örn: Kira sözleşmesi feshi, tahliye ve birikmiş kira alacağı hakkında Yargıtay içtihadı nedir? Kiracı 3 dönemdir ödeme yapmıyor..."
              />
            </div>

            {/* HIZLI FILTRELER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Daire (opsiyonel)
                </label>
                <input
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent mb-2"
                  value={chamber}
                  onChange={(e) => setChamber(e.target.value)}
                  placeholder="Örn: 3. HD, 11. CD"
                />
                <div className="flex flex-wrap gap-1.5">
                  {hukukDaireleri.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setChamberQuick(d)}
                      className={`px-2 py-1 rounded-full text-[11px] border border-white/10 ${
                        chamber === d ? "bg-accent text-black" : "bg-black/40"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                  {cezaDaireleri.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setChamberQuick(d)}
                      className={`px-2 py-1 rounded-full text-[11px] border border-white/10 ${
                        chamber === d ? "bg-accent text-black" : "bg-black/40"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">
                    Yıl (opsiyonel)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2022"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">
                    İlgili Kanun (opsiyonel)
                  </label>
                  <input
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent mb-2"
                    value={law}
                    onChange={(e) => setLaw(e.target.value)}
                    placeholder="TBK, TCK, İİK..."
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {["TBK", "TCK", "İİK", "HMK"].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setLawQuick(k)}
                        className={`px-2 py-1 rounded-full text-[11px] border border-white/10 ${
                          law === k ? "bg-accent text-black" : "bg-black/40"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* KARAR METNİ TOGGLE + TEXTAREA */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-black/60"
                  checked={useDecisionText}
                  onChange={(e) => setUseDecisionText(e.target.checked)}
                />
                Elimde ilgili Yargıtay kararı var, metnini de analize dahil et
                (önerilir)
              </label>

              {useDecisionText && (
                <textarea
                  className="w-full bg-black/60 border border-accent/40 rounded-xl px-3 py-2 text-xs min-h-[110px] focus:outline-none focus:ring-1 focus:ring-accent"
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  placeholder="İlgili Yargıtay kararının gerekçesini buraya yapıştır. AI bunu emsal olarak dikkate alacak."
                />
              )}
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
                className="px-4 py-2 rounded-full bg-accent text-xs font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Analiz ediliyor..." : "AI ile Yargıtay Analizi Yap"}
              </button>
              <span className="text-[11px] text-subtle">
                Gerçek veri tabanına bağlı değil; emsal kontrolü için UYAP /
                Kazancı şart.
              </span>
            </div>
          </form>
        </div>

        {/* SAĞ TARAF: CEVAP + QUICK HINTS */}
        <div className="space-y-4">
          <div className="glass px-5 py-4 min-h-[160px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Analiz Sonucu</h3>
            </div>

            {loading && (
              <div className="text-xs text-subtle">Cevap üretiliyor...</div>
            )}

            {!loading && !answer && (
              <div className="text-xs text-subtle">
                Henüz bir analiz yok. Solda olayı ve filtreleri doldurup
                sorgu gönder.
              </div>
            )}

            {!loading && answer && (
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            )}
          </div>

          <div className="glass px-5 py-4">
            <h4 className="text-xs font-semibold text-muted mb-2">
              İpucu: Daha isabetli analiz için
            </h4>
            <ul className="text-[11px] text-subtle space-y-1.5">
              <li>
                • Olayı anlatırken; tarih, taraf sayısı, talep kalemleri ve
                önemli delilleri mutlaka yaz.
              </li>
              <li>
                • Elinde karar metni varsa mutlaka yukarıdaki kutuya yapıştır;
                AI tamamen o metne göre lehe/aleyhe analizi çıkarır.
              </li>
              <li>
                • Çıkan sonucu birebir hukuki görüş gibi kullanma; UYAP ve
                resmi mevzuat üzerinden her zaman kontrol et.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
