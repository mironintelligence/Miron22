import React, { useState } from "react";

export default function CaseSimulation() {
  const [formData, setFormData] = useState({
    case_description: "",
    jurisdiction: "Türkiye",
    user_role: "Davacı",
  });
  const [file, setFile] = useState(null); // Dosya state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.case_description.trim() && !file) {
      setError("Lütfen dava metni yazın veya dosya yükleyin (ya da ikisini birden).");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = new FormData();
      if (formData.case_description.trim()) {
        payload.append("case_description", formData.case_description);
      }
      payload.append("jurisdiction", formData.jurisdiction);
      payload.append("user_role", formData.user_role);
      if (file) {
        payload.append("file", file);
      }

      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const resp = await fetch(`${base}/api/risk/simulate`, {
        method: "POST",
        body: payload,
      });
      if (!resp.ok) {
        throw new Error("request_failed");
      }
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Simülasyon başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Gelişmiş Dava Simülasyonu
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Yapay zeka destekli stratejik analiz, risk hesaplama ve sonuç tahmini.
            Kıdemli bir hukuk danışmanı gibi davanızı simüle edin.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tarafınız
                </label>
                <select
                  name="user_role"
                  value={formData.user_role}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition"
                >
                  <option value="Davacı">Davacı (Talep Eden)</option>
                  <option value="Davalı">Davalı (Savunan)</option>
                  <option value="Sanık">Sanık</option>
                  <option value="Katılan">Katılan / Müşteki</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Yargı Yeri / Hukuk
                </label>
                <input
                  type="text"
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition"
                  placeholder="Örn: İstanbul Asliye Ticaret Mahkemesi"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Dava Dosyası / Ek Belge Yükle (İsteğe Bağlı)
              </label>
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
              />
              <p className="text-xs text-white/40 mt-1">PDF, DOCX veya TXT. Maks 10MB.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Dava Senaryosu ve Detaylar
              </label>
              <textarea
                name="case_description"
                value={formData.case_description}
                onChange={handleChange}
                rows={8}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none"
                placeholder="Olayın detaylarını, eldeki delilleri, karşı tarafın olası iddialarını ve hukuki süreci detaylıca anlatın..."
              />
              <p className="text-xs text-white/40 mt-2 text-right">
                Ne kadar detay verirseniz simülasyon o kadar isabetli olur.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold text-lg shadow-lg shadow-yellow-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Simülasyon Çalıştırılıyor...
                </span>
              ) : (
                "Simülasyonu Başlat"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-sm text-white/60 mb-1">Kazanma İhtimali</div>
                <div className="text-4xl font-bold text-green-400">{result.win_probability_percent}%</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-sm text-white/60 mb-1">Tahmini Süre</div>
                <div className="text-4xl font-bold text-blue-400">{result.estimated_duration_months} Ay</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-sm text-white/60 mb-1">Risk Skoru</div>
                <div className="text-4xl font-bold text-red-400">{100 - (result.win_probability_percent || 50)}/100</div>
              </div>
            </div>

            {/* Strategic Recommendation */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <span>🎯</span> Stratejik Tavsiye
              </h3>
              <p className="text-white/90 leading-relaxed text-lg">
                {result.strategic_recommendation}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
                  🧩 Zorunlu Yapısal Katmanlar
                </h3>
                <div className="space-y-4 text-white/85">
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Usul Riski
                    </div>
                    <div className="text-sm mt-1">
                      {result.procedural_risk?.level || "—"}{" "}
                      {result.procedural_risk?.details
                        ? `• ${result.procedural_risk.details}`
                        : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Çelişki Analizi
                    </div>
                    <div className="text-sm mt-1">
                      {result.contradiction_analysis?.internal || "—"}
                    </div>
                    {result.contradiction_analysis?.external ? (
                      <div className="text-sm mt-1">
                        {result.contradiction_analysis.external}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Eksik Talep
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {(result.missing_claims || []).length ? (
                        result.missing_claims.map((claim, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-yellow-400">•</span>
                            <span>{claim}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-white/60">—</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
                  🧭 Alternatif Hukuki Niteleme
                </h3>
                <div className="space-y-4 text-white/85">
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Mevcut Niteleme
                    </div>
                    <div className="text-sm mt-1">
                      {result.alternative_qualification?.current || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Alternatif Niteleme
                    </div>
                    <div className="text-sm mt-1">
                      {result.alternative_qualification?.proposed || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-white/50 tracking-wider">
                      Stratejik Avantaj
                    </div>
                    <div className="text-sm mt-1">
                      {result.alternative_qualification?.advantage || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column */}
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
                    ⚖️ Yargı Yeri ve Usul
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs uppercase text-white/50 tracking-wider">Analiz</span>
                      <p className="text-white/80 mt-1">{result.jurisdiction_analysis}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase text-white/50 tracking-wider">İspat Yükü</span>
                      <p className="text-white/80 mt-1">{result.burden_of_proof}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4 border-b border-white/10 pb-2">
                    ⚠️ Risk Faktörleri
                  </h3>
                  <ul className="space-y-2">
                    {result.risk_factors?.map((risk, i) => (
                      <li key={i} className="flex gap-3 text-white/80">
                        <span className="text-red-500">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-blue-400 mb-4 border-b border-white/10 pb-2">
                    🔮 Senaryolar
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                      <div className="text-xs font-bold text-green-400 uppercase mb-1">En İyi Senaryo</div>
                      <p className="text-sm text-white/80">{result.scenarios?.best_case}</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-xs font-bold text-yellow-400 uppercase mb-1">En Olası Sonuç</div>
                      <p className="text-sm text-white/80">{result.scenarios?.most_probable}</p>
                    </div>
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                      <div className="text-xs font-bold text-red-400 uppercase mb-1">En Kötü Senaryo</div>
                      <p className="text-sm text-white/80">{result.scenarios?.worst_case}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-orange-400 mb-4 border-b border-white/10 pb-2">
                    🛡️ Karşı Taraf Argümanları
                  </h3>
                  <ul className="space-y-2">
                    {result.counter_arguments?.map((arg, i) => (
                      <li key={i} className="flex gap-3 text-white/80">
                        <span className="text-orange-500">•</span>
                        {arg}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
