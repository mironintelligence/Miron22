import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";

export default function Contracts({ forcedTab = null }) {
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = useMemo(() => {
    if (forcedTab === "analyze" || forcedTab === "templates") return forcedTab;
    const t = new URLSearchParams(location.search).get("tab");
    if (t === "analyze" || t === "create" || t === "templates") return t;
    return "templates";
  }, [location.search, forcedTab]);
  const [activeTab, setActiveTab] = useState(initialTab); // 'templates' | 'analyze' | 'create'
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFile, setAnalysisFile] = useState(null);
  const [analysisFileName, setAnalysisFileName] = useState("");
  const [compareText, setCompareText] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDetail, setTemplateDetail] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [clauseType, setClauseType] = useState("Yetkili Mahkeme");
  const [clauseLoading, setClauseLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportCompanyName, setReportCompanyName] = useState("");
  const [reportLogoUrl, setReportLogoUrl] = useState("");
  const [reportPreview, setReportPreview] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchTemplates = async () => {
    try {
      const res = await authFetch("/api/contracts/templates?catalog=true");
      if (res.ok) {
        const data = await res.json();
        const cats = Array.isArray(data?.categories) ? data.categories : [];
        const tpls = Array.isArray(data?.templates) ? data.templates : [];
        setCategories(cats);
        setTemplates(tpls);
        if (!activeCategory && cats.length) setActiveCategory(String(cats[0].key || ""));
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
    setCompareResult(null);
    setReportPreview("");
    try {
      const res = await authFetch("/api/contracts/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Sözleşme Analizi", content: analysisText }),
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

  const handleAnalyzeFile = async () => {
    if (!analysisFile) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setCompareResult(null);
    setReportPreview("");
    try {
      const fd = new FormData();
      fd.append("file", analysisFile);
      fd.append("title", "Sözleşme Analizi");
      const res = await authFetch("/api/contracts/analyze-file", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Dosya analizi yapılamadı.");
      setAnalysisResult(data);
      if (data?.analysis?.genel_ozet || data?.analysis?.risk_puani !== undefined) {
        setAnalysisText("");
      }
    } catch (e) {
      console.error("Analyze file error:", e);
      alert(e.message || "Dosya analizi yapılamadı.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCompare = async () => {
    if (!analysisText.trim() || !compareText.trim()) return;
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await authFetch("/api/contracts/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          left_title: "Sürüm A",
          left_content: analysisText,
          right_title: "Sürüm B",
          right_content: compareText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Karşılaştırma yapılamadı.");
      setCompareResult(data);
    } catch (e) {
      console.error("Compare error:", e);
      alert(e.message || "Karşılaştırma yapılamadı.");
    } finally {
      setComparing(false);
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

  const fields = useMemo(() => {
    const f = templateDetail?.fields;
    if (Array.isArray(f) && f.length) return f;
    return placeholders.map((k) => ({ key: k, label: k, type: "text", placeholder: k, help: "", required: false }));
  }, [templateDetail, placeholders]);

  const missingRequired = useMemo(() => {
    return (fields || []).filter((f) => {
      if (!f?.required) return false;
      const v = fieldValues?.[f.key];
      if (f.type === "checkbox") return v !== true;
      return String(v || "").trim().length === 0;
    });
  }, [fields, fieldValues]);

  const filteredTemplates = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return (templates || []).filter((t) => {
      const catOk = !activeCategory || String(t.category_key || "").toLowerCase() === String(activeCategory).toLowerCase();
      if (!catOk) return false;
      if (!q) return true;
      return (
        String(t.title || "").toLowerCase().includes(q) ||
        String(t.description || "").toLowerCase().includes(q) ||
        String(t.subcategory || "").toLowerCase().includes(q)
      );
    });
  }, [templates, activeCategory, search]);

  const loadTemplate = async (templateId) => {
    setSelectedTemplateId(String(templateId || ""));
    setTemplateDetail(null);
    setGeneratedText("");
    setFieldValues({});
    try {
      const res = await authFetch(`/api/contracts/templates/${encodeURIComponent(String(templateId))}`);
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
      const res = await authFetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

  const handleGenerateClause = async () => {
    if (!clauseType) return;
    setClauseLoading(true);
    try {
      const res = await authFetch("/api/contracts/clauses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_type: clauseType,
          context: generatedText || templateDetail?.content || "",
          preferences: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Madde oluşturulamadı.");
      const clause = String(data.clause || "").trim();
      if (!clause) return;
      setGeneratedText((p) => (p ? `${p}\n\n${clause}` : clause));
    } catch (e) {
      console.error("Clause error:", e);
      alert(e.message || "Madde oluşturulamadı.");
    } finally {
      setClauseLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportContract = async (format) => {
    const text = generatedText || analysisText;
    if (!text.trim()) return;
    setExporting(true);
    try {
      const res = await authFetch("/api/contracts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "sozlesme", content: text, format }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
        throw new Error(data.detail || "Export başarısız.");
      }
      const blob = await res.blob();
      downloadBlob(blob, `sozlesme.${format}`);
    } catch (e) {
      console.error("Export error:", e);
      alert(e.message || "Export başarısız.");
    } finally {
      setExporting(false);
    }
  };

  const getAnalysisSourceText = () => {
    if (analysisResult?.content) return String(analysisResult.content || "");
    return String(analysisText || "");
  };

  const buildReportPayload = () => {
    return {
      title: analysisResult?.title || "Sözleşme Analizi",
      content: getAnalysisSourceText(),
      analysis: analysisResult?.analysis || {},
      company_name: reportCompanyName || undefined,
    };
  };

  const previewReport = async () => {
    if (!analysisResult?.analysis) return;
    setReportLoading(true);
    try {
      const res = await authFetch("/api/contracts/analysis/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReportPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Önizleme oluşturulamadı.");
      setReportPreview(String(data.report || ""));
    } catch (e) {
      console.error("Report preview error:", e);
      alert(e.message || "Önizleme oluşturulamadı.");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadAnalysisReport = async (format) => {
    if (!analysisResult?.analysis) return;
    setReportDownloading(true);
    try {
      const payload = { ...buildReportPayload(), format, logo_url: reportLogoUrl || undefined };
      const res = await authFetch("/api/contracts/analysis/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = ct.includes("application/json") ? await res.json().catch(() => ({})) : {};
        throw new Error(data.detail || "Rapor indirilemedi.");
      }
      const blob = await res.blob();
      const ext = format === "docx" ? "docx" : format === "pdf" ? "pdf" : "txt";
      downloadBlob(blob, `sozlesme_analiz_raporu.${ext}`);
    } catch (e) {
      console.error("Report download error:", e);
      alert(e.message || "Rapor indirilemedi.");
    } finally {
      setReportDownloading(false);
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
            onClick={() => setTab("analyze")}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === "analyze" ? "text-[var(--miron-gold)] border-b-2 border-[var(--miron-gold)]" : "text-white/50 hover:text-white"}`}
          >
            AI Analizi
          </button>
        </div>

        {activeTab === "templates" && (
          <div className="grid lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-3 bg-[#111] border border-white/10 rounded-2xl p-5 h-fit lg:sticky lg:top-28">
              <div className="text-sm font-semibold mb-3">Kategoriler</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Şablon ara..."
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm mb-4"
              />
              <div className="space-y-2">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(String(c.key || ""))}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                      String(activeCategory) === String(c.key)
                        ? "bg-[var(--miron-gold)]/15 border-[var(--miron-gold)]/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg">{c.icon}</div>
                      <div className="font-semibold text-sm">{c.title}</div>
                    </div>
                    <div className="text-[11px] text-white/50 mt-1">{c.description}</div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="lg:col-span-9">
              {loading ? (
                <div className="text-center py-20 text-white/30">Yükleniyor...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-20 text-white/30">Bu filtrede şablon bulunamadı.</div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-[var(--miron-gold)]/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-xs font-bold text-[var(--miron-gold)] uppercase tracking-wider">
                          {t.category}
                        </div>
                        {t.subcategory && <div className="text-[11px] text-white/45">{t.subcategory}</div>}
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--miron-gold)] transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-white/60 text-sm mb-4 line-clamp-3">{t.description}</p>
                      <div className="flex items-center justify-between gap-3 mb-5 text-[11px] text-white/45">
                        <div>{t.field_count || 0} alan</div>
                        <div>Profesyonel taslak</div>
                      </div>
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
                  ))}
                </div>
              )}
            </div>
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
                ) : fields.length === 0 ? (
                  <div className="text-xs text-white/40">Bu şablonda doldurulabilir alan bulunamadı.</div>
                ) : (
                  <div>
                    {missingRequired.length > 0 && (
                      <div className="mb-3 text-xs text-red-300">
                        {missingRequired.length} zorunlu alan eksik. Lütfen işaretli alanları doldurun.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {fields.map((f) => {
                        const key = String(f.key || "");
                        const type = String(f.type || "text");
                        const label = f.label || key;
                        const required = !!f.required;
                        const value = fieldValues?.[key];
                        const invalid =
                          required && (type === "checkbox" ? value !== true : String(value || "").trim().length === 0);

                        return (
                          <div key={key} className="bg-black/40 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="text-xs font-semibold text-white/80">
                                {label}
                                {required && <span className="text-red-400"> *</span>}
                              </div>
                              {type !== "checkbox" && (
                                <div className="text-[11px] text-white/40">{type}</div>
                              )}
                            </div>

                            {type === "textarea" ? (
                              <textarea
                                value={String(value || "")}
                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                placeholder={f.placeholder || ""}
                                title={f.help || ""}
                                rows={3}
                                className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-sm outline-none resize-none ${
                                  invalid ? "border-red-400/50" : "border-white/15"
                                }`}
                              />
                            ) : type === "select" ? (
                              <select
                                value={String(value || "")}
                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                title={f.help || ""}
                                className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-sm outline-none ${
                                  invalid ? "border-red-400/50" : "border-white/15"
                                }`}
                              >
                                <option value="">Seçiniz</option>
                                {(f.options || []).map((opt) => (
                                  <option key={String(opt)} value={String(opt)}>
                                    {String(opt)}
                                  </option>
                                ))}
                              </select>
                            ) : type === "checkbox" ? (
                              <label className="flex items-center gap-3 text-sm text-white/70 select-none">
                                <input
                                  type="checkbox"
                                  checked={value === true}
                                  onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.checked }))}
                                />
                                <span title={f.help || ""}>{f.placeholder || "Onaylıyorum"}</span>
                              </label>
                            ) : (
                              <input
                                type={type === "date" ? "date" : type === "number" ? "number" : "text"}
                                value={String(value ?? "")}
                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                placeholder={f.placeholder || ""}
                                title={f.help || ""}
                                className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-sm outline-none ${
                                  invalid ? "border-red-400/50" : "border-white/15"
                                }`}
                              />
                            )}

                            {(f.help || f.example) && (
                              <div className="mt-2 text-[11px] text-white/45">
                                {f.help ? <div>{f.help}</div> : null}
                                {f.example ? <div className="text-white/35">Örnek: {f.example}</div> : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedTemplateId || missingRequired.length > 0}
                className="mt-6 w-full py-4 bg-[var(--miron-gold)] text-black font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? "Oluşturuluyor..." : "Sözleşmeyi Oluştur"}
              </button>

              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="text-sm font-semibold mb-2">Otomatik Madde Oluştur</div>
                <div className="flex gap-3">
                  <select
                    value={clauseType}
                    onChange={(e) => setClauseType(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                  >
                    <option>Yetkili Mahkeme</option>
                    <option>Uyuşmazlık Çözümü</option>
                    <option>Gizlilik</option>
                    <option>KVKK / Veri Koruma</option>
                    <option>Mücbir Sebep</option>
                    <option>Cezai Şart</option>
                    <option>Fesih</option>
                    <option>Sorumluluk Sınırı</option>
                  </select>
                  <button
                    onClick={handleGenerateClause}
                    disabled={clauseLoading || !selectedTemplateId}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {clauseLoading ? "Oluşturuluyor..." : "Madde Ekle"}
                  </button>
                </div>
                <div className="text-[11px] text-white/45 mt-2">
                  Oluşturulan madde, sağdaki metnin sonuna eklenir.
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="text-lg font-bold mb-4">Oluşturulan Metin</div>
              {!generatedText ? (
                <div className="text-xs text-white/40">Henüz sözleşme oluşturulmadı.</div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={() => exportContract("docx")}
                      disabled={exporting}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      Word
                    </button>
                    <button
                      onClick={() => exportContract("pdf")}
                      disabled={exporting}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => exportContract("udf")}
                      disabled={exporting}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      UDF
                    </button>
                    <button
                      onClick={() => exportContract("uyap")}
                      disabled={exporting}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      UYAP
                    </button>
                  </div>
                  <textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    className="w-full h-[520px] bg-black/60 border border-white/15 rounded-2xl p-4 text-sm text-white/80 outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analyze" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Sözleşme Metni</label>
              <div className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-4">
                <div className="text-sm font-semibold mb-2">Dosya Yükle (PDF / DOCX / TXT)</div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAnalysisFile(f);
                      setAnalysisFileName(f ? f.name : "");
                    }}
                    className="text-xs text-white/70"
                  />
                  <button
                    onClick={handleAnalyzeFile}
                    disabled={analyzing || !analysisFile}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? "Yükleniyor..." : "Yükle ve Analiz Et"}
                  </button>
                </div>
                {analysisFileName && <div className="text-[11px] text-white/50 mt-2">{analysisFileName}</div>}
              </div>
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

              {analysisResult?.analysis && (
                <div className="mt-4 bg-[#111] border border-white/10 rounded-2xl p-5">
                  <div className="text-sm font-semibold mb-2">Analiz Raporu (Önizleme + İndirme)</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Şirket Adı (opsiyonel)</div>
                      <input
                        value={reportCompanyName}
                        onChange={(e) => setReportCompanyName(e.target.value)}
                        placeholder="Örn. Miron Intelligence"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Logo URL (opsiyonel)</div>
                      <input
                        value={reportLogoUrl}
                        onChange={(e) => setReportLogoUrl(e.target.value)}
                        placeholder="https://.../logo.png"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={previewReport}
                      disabled={reportLoading}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      {reportLoading ? "Hazırlanıyor..." : "Önizleme Oluştur"}
                    </button>
                    <button
                      onClick={() => downloadAnalysisReport("pdf")}
                      disabled={reportDownloading}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      PDF İndir
                    </button>
                    <button
                      onClick={() => downloadAnalysisReport("docx")}
                      disabled={reportDownloading}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      Word İndir
                    </button>
                    <button
                      onClick={() => downloadAnalysisReport("txt")}
                      disabled={reportDownloading}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold hover:bg-white/15 disabled:opacity-50"
                    >
                      TXT İndir
                    </button>
                  </div>

                  {reportPreview && (
                    <textarea
                      value={reportPreview}
                      readOnly
                      className="mt-4 w-full h-[240px] bg-black/60 border border-white/15 rounded-2xl p-4 text-xs text-white/75 outline-none resize-none"
                    />
                  )}
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-medium text-white/70 mb-3">Karşılaştırma (Opsiyonel)</label>
                <textarea
                  value={compareText}
                  onChange={(e) => setCompareText(e.target.value)}
                  placeholder="İkinci sözleşme sürümünü buraya yapıştırın..."
                  className="w-full h-[220px] bg-[#111] border border-white/10 rounded-2xl p-5 text-white/80 focus:ring-2 focus:ring-[var(--miron-gold)] outline-none resize-none"
                />
                <button
                  onClick={handleCompare}
                  disabled={comparing || !analysisText.trim() || !compareText.trim()}
                  className="mt-4 w-full py-3 bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {comparing ? "Karşılaştırılıyor..." : "Karşılaştırmalı Analiz"}
                </button>
              </div>
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
                  {typeof analysisResult?.analysis?.risk_puani === "number" && (
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                      <div className="text-xs text-white/60">Risk Puanı</div>
                      <div className="text-2xl font-bold text-[var(--miron-gold)]">
                        {analysisResult.analysis.risk_puani}/100
                      </div>
                      {analysisResult.analysis.risk_seviyesi && (
                        <div className="text-xs text-white/55 mt-1">
                          Seviye: {analysisResult.analysis.risk_seviyesi}
                        </div>
                      )}
                    </div>
                  )}
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

                  {analysisResult.analysis.eksik_maddeler && (
                    <div>
                      <h4 className="font-bold text-white mb-2">Eksik Maddeler</h4>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        {analysisResult.analysis.eksik_maddeler.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {analysisResult.analysis.uyum_kontrolleri && (
                    <div>
                      <h4 className="font-bold text-white mb-2">Hukuki Uyum Kontrolleri</h4>
                      <div className="space-y-3">
                        {Object.entries(analysisResult.analysis.uyum_kontrolleri).map(([k, arr]) => (
                          <div key={k}>
                            <div className="text-xs text-white/60 uppercase tracking-wider">{k}</div>
                            <ul className="list-disc pl-5 space-y-1 text-white/70">
                              {(arr || []).map((x, i) => <li key={i}>{x}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {compareResult?.compare && (
                <div className="mt-8 border-t border-white/10 pt-6">
                  <h4 className="text-lg font-bold mb-3">Karşılaştırmalı Analiz</h4>
                  <div className="text-sm text-white/70 mb-4">{compareResult.compare.ozet}</div>
                  {Array.isArray(compareResult.compare.degisiklikler) && compareResult.compare.degisiklikler.length > 0 && (
                    <div className="space-y-3">
                      {compareResult.compare.degisiklikler.slice(0, 12).map((d, i) => (
                        <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-4">
                          <div className="font-semibold">{d.baslik}</div>
                          <div className="text-xs text-white/60 mt-1">{d.degisiklik}</div>
                          <div className="text-xs text-white/55 mt-2">Risk etkisi: {d.risk_etkisi}</div>
                          {d.onerilen_aksiyon && <div className="text-xs text-[var(--miron-gold)] mt-2">{d.onerilen_aksiyon}</div>}
                        </div>
                      ))}
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
