import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Contracts() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates"); // 'templates' | 'analyze'
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const token = localStorage.getItem("miron_token");
      const res = await fetch(`${base}/api/contracts/templates`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (e) {
      console.error("Templates error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!analysisText.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const token = localStorage.getItem("miron_token");
      const res = await fetch(`${base}/api/contracts/analyze`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: "Sözleşme Analizi", content: analysisText })
      });
      if (res.ok) {
        setAnalysisResult(await res.json());
      }
    } catch (e) {
      console.error("Analysis error:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Sözleşme Merkezi</h1>
          <p className="text-white/50">Şablonları kullanın veya mevcut sözleşmeleri AI ile analiz edin.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-8">
          <button 
            onClick={() => setActiveTab("templates")}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === "templates" ? "text-[var(--miron-gold)] border-b-2 border-[var(--miron-gold)]" : "text-white/50 hover:text-white"}`}
          >
            Şablonlar
          </button>
          <button 
            onClick={() => setActiveTab("analyze")}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === "analyze" ? "text-[var(--miron-gold)] border-b-2 border-[var(--miron-gold)]" : "text-white/50 hover:text-white"}`}
          >
            AI Analizi
          </button>
        </div>

        {activeTab === "templates" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-20 text-white/30">Yükleniyor...</div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-20 text-white/30">Henüz şablon yok.</div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-[var(--miron-gold)]/50 transition-colors group">
                  <div className="text-xs font-bold text-[var(--miron-gold)] uppercase tracking-wider mb-2">{t.category}</div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-[var(--miron-gold)] transition-colors">{t.title}</h3>
                  <p className="text-white/60 text-sm mb-6 line-clamp-3">{t.description}</p>
                  <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition font-medium">
                    Şablonu Kullan
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "analyze" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Sözleşme Metni</label>
              <textarea 
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                placeholder="Sözleşme metnini buraya yapıştırın..."
                className="w-full h-[500px] bg-[#111] border border-white/10 rounded-2xl p-5 text-white/80 focus:ring-2 focus:ring-[var(--miron-gold)] outline-none resize-none"
              />
              <button 
                onClick={handleAnalyze}
                disabled={analyzing || !analysisText.trim()}
                className="mt-4 w-full py-4 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? "Analiz Ediliyor..." : "Risk Analizini Başlat"}
              </button>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-8 h-fit">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>🤖</span> Analiz Sonucu
              </h3>
              
              {!analysisResult ? (
                <div className="text-center py-20 text-white/30">
                  <p>Henüz analiz yapılmadı.</p>
                  <p className="text-xs mt-2">Metni yapıştırıp butona tıklayın.</p>
                </div>
              ) : (
                <div className="space-y-6 text-sm">
                  {analysisResult.analysis.guclu_yonler && (
                    <div>
                      <h4 className="font-bold text-green-400 mb-2">Güçlü Yönler</h4>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        {analysisResult.analysis.guclu_yonler.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {analysisResult.analysis.zayif_yonler && (
                    <div>
                      <h4 className="font-bold text-red-400 mb-2">Zayıf / Riskli Yönler</h4>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        {analysisResult.analysis.zayif_yonler.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {analysisResult.analysis.oneriler && (
                    <div>
                      <h4 className="font-bold text-[var(--miron-gold)] mb-2">Öneriler</h4>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        {analysisResult.analysis.oneriler.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
