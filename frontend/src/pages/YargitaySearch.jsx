import React, { useState } from "react";
import { authFetch } from "../auth/api";

const hukukDaireleri = [
  "3. Hukuk Dairesi",
  "4. Hukuk Dairesi",
  "11. Hukuk Dairesi",
  "12. Hukuk Dairesi",
  "13. Hukuk Dairesi",
  "YHGK",
];
const cezaDaireleri = [
  "1. Ceza Dairesi",
  "5. Ceza Dairesi",
  "11. Ceza Dairesi",
];

const sampleSnippets = [
  { court: "Yargıtay 3. HD", text: "Tahliye taleplerinde ihtar şartı somut olayla birlikte değerlendirilir." },
  { court: "Yargıtay 11. HD", text: "Ticari defterlerin usulüne uygun tutulması delil değerini artırır." },
  { court: "Yargıtay 12. HD", text: "İcra takiplerinde tebligat usulü kamu düzenindendir." },
  { court: "YHGK", text: "Hakkın kötüye kullanılması iddiasında dürüstlük kuralı esas alınır." },
  { court: "Yargıtay 4. HD", text: "Manevi tazminatın takdirinde olayın özellikleri belirleyicidir." },
  { court: "Yargıtay 13. HD", text: "Tüketici uyuşmazlığında ispat yükü somut olgulara göre değişir." },
  { court: "Yargıtay 2. HD", text: "Boşanma davalarında birlikte yaşamayı çekilmez kılan durum mahkemece takdir edilir." },
  { court: "Yargıtay 9. HD", text: "İşçinin kıdem tazminatına hak kazanması için en az bir yıl çalışması gereklidir." },
];

function MarqueeColumn({ snippets, speed, reverse = false }) {
  const doubled = [...snippets, ...snippets];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-black/20 flex-1 min-h-0">
      <div
        className="flex flex-col gap-2 px-1.5 py-1.5"
        style={{
          animation: `marqueeUp${reverse ? "Rev" : ""} ${speed}s linear infinite`,
        }}
      >
        {doubled.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-white/4 p-2.5 shrink-0"
          >
            <div className="text-[9px] font-bold text-yellow-400/70 mb-1 uppercase tracking-wide">{s.court}</div>
            <p className="text-[10px] text-white/65 leading-snug">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function YargitaySearch() {
  const [query, setQuery] = useState("");
  const [chamber, setChamber] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setSearched(false);
    setExpandedId(null);
    if (!query.trim()) { setError("Lütfen aranacak kelime veya cümle girin."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("q", query.trim());
      if (chamber) params.append("chamber", chamber);
      if (year) params.append("year", year);
      const res = await authFetch(`/api/search/decisions?${params.toString()}`, { method: "GET" });
      if (res.status === 204) { setResults([]); setSearched(true); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Arama sırasında hata oluştu."); }
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch (err) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const col1 = sampleSnippets.filter((_, i) => i % 3 === 0);
  const col2 = sampleSnippets.filter((_, i) => i % 3 === 1);
  const col3 = sampleSnippets.filter((_, i) => i % 3 === 2);

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-600 bg-clip-text text-transparent">
          Karar Arama Motoru
        </h1>
        <p className="text-white/55 mt-2 max-w-2xl mx-auto text-sm">
          Yapay zekâ destekli hibrit arama — Yargıtay ve Danıştay kararlarında derinlemesine arama yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_200px] gap-6">
        {/* FILTER SIDEBAR */}
        <aside className="bg-white/5 border border-white/10 rounded-2xl p-5 h-fit lg:sticky lg:top-24 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Arama</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none resize-none h-28"
                placeholder="kira tahliye ihtar süresi..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Yıl</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                placeholder="2023"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Daire</label>
              <select
                value={chamber}
                onChange={(e) => setChamber(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none appearance-none"
              >
                <option value="">Tüm Daireler</option>
                <optgroup label="Hukuk">
                  {hukukDaireleri.map((d) => <option key={d} value={d}>{d}</option>)}
                </optgroup>
                <optgroup label="Ceza">
                  {cezaDaireleri.map((d) => <option key={d} value={d}>{d}</option>)}
                </optgroup>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm shadow-lg transition disabled:opacity-50"
            >
              {loading ? "Aranıyor…" : "Karar Ara"}
            </button>
          </form>
        </aside>

        {/* RESULTS — full-width rows */}
        <div className="min-w-0 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">{error}</div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-16 text-white/40 text-sm">Aranıyor…</div>
          )}
          {!loading && searched && results.length === 0 && !error && (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-white">Karar Bulunamadı</h3>
              <p className="text-white/50 mt-1 text-sm">Arama kriterlerinizi genişleterek tekrar deneyin.</p>
            </div>
          )}
          {!loading && !searched && !error && (
            <div className="text-center py-16 text-white/30 text-sm">Aramak istediğiniz kavramı yazıp "Karar Ara" butonuna basın.</div>
          )}
          {results.map((item) => (
            <div
              key={item.id}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-yellow-500/40 transition-all cursor-pointer group"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-yellow-500/80">
                  <span className="bg-yellow-500/10 px-2 py-0.5 rounded">{item.court || "Yargıtay"}</span>
                  {item.chamber && <span className="bg-yellow-500/10 px-2 py-0.5 rounded">{item.chamber}</span>}
                  {item.decision_number && <span className="bg-white/8 px-2 py-0.5 rounded text-white/50">{item.decision_number}</span>}
                  {item.date && <span className="bg-white/8 px-2 py-0.5 rounded text-white/50">{item.date}</span>}
                </div>
                {item.final_score != null && (
                  <span className="text-[10px] text-white/30">Skor: {item.final_score.toFixed(2)}</span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white leading-snug mb-2 group-hover:text-yellow-300 transition-colors">
                {item.summary || "Özet bilgisi bulunmuyor."}
              </h3>
              <p className="text-sm text-white/60">
                Sonuç: <span className="font-semibold text-white/80">{item.outcome || "Belirtilmemiş"}</span>
              </p>
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Tam Metin</div>
                  <div className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap font-serif bg-black/20 p-4 rounded-xl">
                    {item.clean_text || "Tam metin bulunamadı."}
                  </div>
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-[10px] text-white/25 group-hover:text-yellow-500/60 transition-colors">
                  {expandedId === item.id ? "▲ Daralt" : "▼ Detay"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: 3-column marquee preview */}
        <aside className="hidden lg:flex flex-col gap-2 h-[78vh] sticky top-24">
          <div className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1 text-center">Örnek Kararlar</div>
          <div className="flex gap-1.5 flex-1 min-h-0 overflow-hidden">
            <MarqueeColumn snippets={col1.length ? col1 : sampleSnippets.slice(0,3)} speed={22} />
            <MarqueeColumn snippets={col2.length ? col2 : sampleSnippets.slice(2,5)} speed={28} reverse />
            <MarqueeColumn snippets={col3.length ? col3 : sampleSnippets.slice(4)} speed={20} />
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes marqueeUp { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
        @keyframes marqueeUpRev { 0% { transform: translateY(-50%); } 100% { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
