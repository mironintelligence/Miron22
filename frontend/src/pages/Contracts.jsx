import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Contracts() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = useMemo(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "analyze" || t === "create" || t === "templates") return t;
    return "templates";
  }, [location.search]);
  const [activeTab, setActiveTab] = useState(initialTab); // 'templates' | 'analyze' | 'create'
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDetail, setTemplateDetail] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchTemplates = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const token = localStorage.getItem("miron_token");
      const res = await fetch(`${base}/api/contracts/templates?include_remote=true`, {
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

  const setTab = (tab) => {
    navigate(`/contracts?tab=${tab}`);
  };

  const extractPlaceholders = (text) => {
    const out = new Set();
    const re = /{{\s*([^}]+?)\s*}}/g;
    let m;
    while ((m = re.exec(text || ""))) {
      const key = String(m[1] || "").trim();
      if (key) out.add(key);
    }
    return Array.from(out);
  };

  const placeholders = useMemo(() => extractPlaceholders(templateDetail?.content || ""), [templateDetail]);

  const loadTemplate = async (templateId) => {
    setSelectedTemplateId(String(templateId || ""));
    setTemplateDetail(null);
    setGeneratedText("");
    setFieldValues({});
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const token = localStorage.getItem("miron_token");
      const res = await fetch(`${base}/api/contracts/templates/${encodeURIComponent(String(templateId))}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplateDetail(data);
      }
    } catch (e) {
      console.error("Template detail error:", e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setGenerating(true);
    setGeneratedText("");
    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const token = localStorage.getItem("miron_token");
      const res = await fetch(`${base}/api/contracts/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ template_id: String(selectedTemplateId), values: fieldValues })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Sözleşme oluşturulamadı.");
      }
      setGeneratedText(data.generated || "");
    } catch (e) {
      console.error("Generate error:", e);
      alert(e.message || "Sözleşme oluşturulamadı.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Sözleşme Merkezi</h1>
          <p className="text-white/50">Şablonları kullanın, sözleşme oluşturun veya mevcut sözleşmeleri AI ile analiz edin.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-8">
          <button 
            onClick={() => setTab("templates")}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === "templates" ? "text-[var(--miron-gold)] border-b-2 border-[var(--miron-gold)]" : "text-white/50 hover:text-white"}`}
          >
            Şablonlar
          </button>
          <button 
            onClick={() => setTab("create")}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === "create" ? "text-[var(--miron-gold)] border-b-2 border-[var(--miron-gold)]" : "text-white/50 hover:text-white"}`}
          >
            Sözleşme Oluştur
          </button>
          <button 
            onClick={() => setTab("analyze")}
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
                  <button
                    onClick={() => {
                      setTab("create");
                      loadTemplate(t.id);
                    }}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition font-medium"
                  >
                    Şablonu Kullan
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "create" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-lg font-bold">Şablon Seç</div>
                <Link to="/contracts?tab=templates" className="text-xs text-[var(--miron-gold)] underline">
                  Şablonlara dön
                </Link>
              </div>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => loadTemplate(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Şablon seçin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.category} — {t.title}
                  </option>
                ))}
              </select>

              <div className="mt-6">
                <div className="text-sm font-semibold mb-2">Alanlar</div>
                {!templateDetail ? (
                  <div className="text-xs text-white/40">Şablon seçince alanlar burada görünecek.</div>
                ) : placeholders.length === 0 ? (
                  <div className="text-xs text-white/40">Bu şablonda doldurulabilir alan bulunamadı.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {placeholders.map((k) => (
                      <input
                        key={k}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                        placeholder={k}
                        value={fieldValues[k] || ""}
                        onChange={(e) => setFieldValues((p) => ({ ...p, [k]: e.target.value }))}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedTemplateId}
                className="mt-6 w-full py-4 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Oluşturuluyor..." : "Sözleşmeyi Oluştur"}
              </button>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="text-lg font-bold mb-4">Oluşturulan Metin</div>
              {!generatedText ? (
                <div className="text-xs text-white/40">Henüz sözleşme oluşturulmadı.</div>
              ) : (
                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="w-full h-[520px] bg-black/60 border border-white/15 rounded-2xl p-4 text-sm text-white/80 outline-none resize-none"
                />
              )}
            </div>
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
