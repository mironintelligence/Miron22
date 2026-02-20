// src/pages/YargitaySearch.jsx
import React, { useState } from "react";
import { api } from "../auth/api"; // Assuming we can use the helper, or use fetch

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

export default function YargitaySearch() {
  const [query, setQuery] = useState("");
  const [chamber, setChamber] = useState("");
  const [year, setYear] = useState("");
  const [court, setCourt] = useState("");

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

    if (!query.trim()) {
      setError("Lütfen aranacak kelime veya cümle girin.");
      return;
    }

    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("q", query.trim());
      if (chamber) params.append("chamber", chamber);
      if (year) params.append("year", year);
      if (court) params.append("court", court);

      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const res = await fetch(`${base}/api/search/decisions?${params.toString()}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token") || "demo"}`,
            "Content-Type": "application/json"
        }
      });

      if (res.status === 204) {
         setResults([]);
         setSearched(true);
         return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Arama sırasında hata oluştu.");
      }

      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);

    } catch (err) {
      console.error(err);
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="mt-24 max-w-7xl mx-auto px-4 pb-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-600 bg-clip-text text-transparent">
          Karar Arama Motoru
        </h1>
        <p className="text-white/60 mt-2 max-w-2xl mx-auto">
          Yapay zeka destekli hibrit arama (Semantik + Anahtar Kelime). 
          Yargıtay ve Danıştay kararlarında derinlemesine arama yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* FILTERS SIDEBAR */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit sticky top-24 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Arama Metni
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none h-32"
                placeholder="Örn: kira sözleşmesi tahliye birikmiş kira alacağı..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Yıl
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                placeholder="Örn: 2023"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Mahkeme / Daire
              </label>
              <select
                value={chamber}
                onChange={(e) => setChamber(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500 outline-none appearance-none"
              >
                <option value="">Tüm Daireler</option>
                <optgroup label="Hukuk Daireleri">
                  {hukukDaireleri.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </optgroup>
                <optgroup label="Ceza Daireleri">
                  {cezaDaireleri.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Aranıyor..." : "Karar Ara"}
            </button>
          </form>
        </div>

        {/* RESULTS AREA */}
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white">Karar Bulunamadı</h3>
              <p className="text-white/50 mt-2">
                Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz.
              </p>
            </div>
          )}

          {results.map((item) => (
            <div 
              key={item.id} 
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 transition-all cursor-pointer group"
              onClick={() => toggleExpand(item.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-2 text-xs font-mono text-yellow-500/80">
                  <span className="bg-yellow-500/10 px-2 py-1 rounded">{item.court || "Yargıtay"}</span>
                  <span className="bg-yellow-500/10 px-2 py-1 rounded">{item.chamber}</span>
                  <span className="bg-yellow-500/10 px-2 py-1 rounded">{item.decision_number}</span>
                  <span className="bg-yellow-500/10 px-2 py-1 rounded">{item.date}</span>
                </div>
                <div className="text-xs text-white/40 flex flex-col items-end">
                  <span>Skor: {item.final_score?.toFixed(2)}</span>
                  <span className="text-[10px] opacity-60">
                    (S: {item.semantic_score?.toFixed(2)} / K: {item.keyword_rank?.toFixed(2)})
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                {item.summary || "Özet bilgisi bulunmuyor."}
              </h3>
              
              <div className="text-sm text-white/70 mb-4 line-clamp-2">
                 Sonuç: <span className="font-bold text-white">{item.outcome || "Belirtilmemiş"}</span>
              </div>

              {/* Expanded Content */}
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in">
                  <h4 className="text-xs font-bold text-white/50 uppercase mb-2">Tam Metin</h4>
                  <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-serif bg-black/20 p-4 rounded-lg">
                    {item.clean_text || "Tam metin bulunamadı."}
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-center">
                 <span className="text-xs text-white/30 group-hover:text-yellow-500/70 transition-colors">
                    {expandedId === item.id ? "▲ Daralt" : "▼ Detayları Göster"}
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
