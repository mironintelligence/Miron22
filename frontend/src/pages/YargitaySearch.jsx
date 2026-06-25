// src/pages/YargitaySearch.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  { court: "Yargıtay 3. HD", chamber: "3. Hukuk Dairesi", decision_number: "2023/1421", outcome: "ONAMA", year: "2023", summary: "Tahliye taleplerinde ihtar şartı somut olayla birlikte değerlendirilir." },
  { court: "Yargıtay 11. HD", chamber: "11. Hukuk Dairesi", decision_number: "2022/8834", outcome: "BOZMA", year: "2022", summary: "Ticari defterlerin usulüne uygun tutulması delil değerini artırır." },
  { court: "Yargıtay 12. HD", chamber: "12. Hukuk Dairesi", decision_number: "2023/4562", outcome: "ONAMA", year: "2023", summary: "İcra takiplerinde tebligat usulü kamu düzenindendir." },
  { court: "YHGK", chamber: "Genel Kurul", decision_number: "2022/3301", outcome: "ONAMA", year: "2022", summary: "Hakkın kötüye kullanılması iddiasında dürüstlük kuralı esas alınır." },
  { court: "Yargıtay 4. HD", chamber: "4. Hukuk Dairesi", decision_number: "2023/2219", outcome: "BOZMA", year: "2023", summary: "Manevi tazminatın takdirinde olayın özellikleri belirleyicidir." },
  { court: "Yargıtay 13. HD", chamber: "13. Hukuk Dairesi", decision_number: "2022/7741", outcome: "ONAMA", year: "2022", summary: "Tüketici uyuşmazlığında ispat yükü somut olgulara göre değişir." },
];

function AnalysisBlock({ text }) {
  if (!text) return null;
  return (
    <div
      className="mt-3 pt-3 border-t border-[#ebac00]/20 text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-mono bg-black/30 p-3 rounded-xl"
      style={{ fontSize: "12px" }}
    >
      <div className="text-[10px] text-[#ebac00]/60 uppercase tracking-wider mb-1.5">Yapay Zeka Analizi</div>
      {text}
    </div>
  );
}

function DecisionCard({ item, onAnalyze, analyzing, analysisText }) {
  const [expanded, setExpanded] = useState(false);
  const isOnama = (item.outcome || "").toUpperCase().includes("ONAMA");
  const fullText = item.full_text || item.clean_text || "";

  return (
    <div className="premium-scope bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#ebac00]/40 transition-all group flex flex-col gap-3">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-[#ebac00]/80">
            <span className="bg-[#ebac00]/10 px-2 py-0.5 rounded">{item.court || "Yargıtay"}</span>
            {item.chamber && <span className="bg-[#ebac00]/10 px-2 py-0.5 rounded">{item.chamber}</span>}
            {item.decision_number && <span className="bg-white/8 px-2 py-0.5 rounded text-white/50">{item.decision_number}</span>}
            {(item.date || item.year) && <span className="bg-white/8 px-2 py-0.5 rounded text-white/50">{item.date || item.year}</span>}
          </div>
          {item.final_score != null && (
            <span className="text-[10px] text-white/30">Skor: {item.final_score.toFixed(2)}</span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-[#ebac00] transition-colors line-clamp-3 mt-2">
          {item.summary || "Özet bilgisi bulunmuyor."}
        </h3>

        <div className="flex items-center justify-between mt-2">
          {item.outcome && (
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${isOnama ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
              {item.outcome}
            </span>
          )}
          <span className="text-[10px] text-white/30 ml-auto group-hover:text-[#ebac00]/60 transition-colors">
            {expanded ? "▲ Daralt" : "▼ Detay"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-3 border-t border-white/10">
          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Tam Metin</div>
          <div className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap font-serif bg-black/20 p-3 rounded-xl">
            {fullText || item.summary || "Tam metin bulunamadı."}
          </div>
        </div>
      )}

      {fullText && (
        <button
          onClick={() => onAnalyze(item)}
          disabled={analyzing}
          className="mt-1 w-full py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40"
          style={{
            background: analyzing ? "rgba(235,172,0,0.08)" : "rgba(235,172,0,0.12)",
            border: "0.5px solid rgba(235,172,0,0.3)",
            color: "#ebac00",
          }}
        >
          {analyzing ? "Analiz yapılıyor…" : "Yapay Zeka Analizi"}
        </button>
      )}

      <AnalysisBlock text={analysisText} />
    </div>
  );
}

export default function YargitaySearch() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [chamber, setChamber] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisMap, setAnalysisMap] = useState({});

  useEffect(() => {
    const st = location.state?.q;
    if (typeof st === "string" && st.trim()) {
      setQuery(st.trim());
    }
  }, [location.state]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setSearched(false);
    setAnalysisMap({});
    if (!query.trim()) { setError("Lütfen aranacak kelime veya cümle girin."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("q", query.trim());
      if (chamber) params.append("chamber", chamber);
      if (year) params.append("year", year);
      const res = await authFetch(`/api/yargitay/search?${params.toString()}`, { method: "GET" });
      if (res.status === 204) { setResults([]); setSearched(true); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Arama sırasında hata oluştu."); }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : (data.results || []));
      setSearched(true);
    } catch (err) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (item) => {
    const key = item.id || item.decision_number || Math.random().toString();
    setAnalyzingId(key);
    try {
      const fullText = item.full_text || item.clean_text || item.summary || "";
      const res = await authFetch("/api/yargitay/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_text: fullText }),
        timeoutMs: 90000,
      });
      if (!res.ok) throw new Error("Analiz başarısız");
      const data = await res.json();
      setAnalysisMap((prev) => ({ ...prev, [key]: data.analysis || "" }));
    } catch {
      setAnalysisMap((prev) => ({ ...prev, [key]: "Analiz sırasında hata oluştu." }));
    } finally {
      setAnalyzingId(null);
    }
  };

  const getItemKey = (item) => item.id || item.decision_number || "";

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent" style={{ background: 'linear-gradient(90deg, #ebac00, #b88700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Karar Arama Motoru
        </h1>
        <p className="text-white/55 mt-2 max-w-2xl mx-auto text-sm">
          Yapay zekâ destekli hibrit arama — Yargıtay ve Danıştay kararlarında derinlemesine arama yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* FILTER SIDEBAR */}
        <aside className="bg-white/5 border border-white/10 rounded-2xl p-5 h-fit lg:sticky lg:top-24 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Arama</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-[#ebac00] outline-none resize-none h-28"
                placeholder="kira tahliye ihtar süresi..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Yıl</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-[#ebac00] outline-none"
                placeholder="2023"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Daire</label>
              <select
                value={chamber}
                onChange={(e) => setChamber(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-[#ebac00] outline-none appearance-none"
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
              className="w-full py-3 rounded-xl bg-[#ebac00] hover:opacity-85 text-black font-bold text-sm shadow-lg transition disabled:opacity-50"
            >
              {loading ? "Aranıyor…" : "Karar Ara"}
            </button>
          </form>
        </aside>

        {/* MAIN CONTENT */}
        <div className="min-w-0">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm mb-4">{error}</div>
          )}

          {/* SEARCH RESULTS */}
          {(searched || loading) && (
            <>
              {loading && (
                <div className="flex items-center justify-center py-16 text-white/40 text-sm">Aranıyor…</div>
              )}
              {!loading && searched && results.length === 0 && !error && (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-lg font-semibold text-white">Karar Bulunamadı</h3>
                  <p className="text-white/50 mt-1 text-sm">Arama kriterlerinizi genişleterek tekrar deneyin.</p>
                </div>
              )}
              {!loading && results.length > 0 && (
                <>
                  <div className="text-xs text-white/40 mb-4">{results.length} karar bulundu</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {results.map((item) => {
                      const key = getItemKey(item);
                      return (
                        <DecisionCard
                          key={key || Math.random()}
                          item={item}
                          onAnalyze={handleAnalyze}
                          analyzing={analyzingId === key}
                          analysisText={analysisMap[key]}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* INITIAL STATE */}
          {!searched && !loading && !error && (
            <>
              <div className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-4">Örnek Kararlar</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sampleSnippets.map((item, i) => (
                  <DecisionCard
                    key={i}
                    item={item}
                    onAnalyze={() => {}}
                    analyzing={false}
                    analysisText={null}
                  />
                ))}
              </div>
              <p className="text-center text-white/25 text-xs mt-8">
                Yukarıdaki formu kullanarak gerçek Yargıtay kararlarında arama yapabilirsiniz.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
