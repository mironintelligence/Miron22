import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "../auth/api";

export default function Pleadings() {
  const [catalog, setCatalog] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [activeTpl, setActiveTpl] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [language, setLanguage] = useState("TR");
  const [includeStatutes, setIncludeStatutes] = useState(true);
  const [includeCaseLaw, setIncludeCaseLaw] = useState(true);
  const [maskPII, setMaskPII] = useState(true);
  const [aiNote, setAiNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch("/writer/catalog");
        const data = await r.json();
        setCatalog(data);
        if (data?.length) setActiveCat(data[0].category);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeTpl) return;
    (async () => {
      try {
        const r = await authFetch(`/writer/fields/${activeTpl}`);
        const data = await r.json();
        setFields(data.fields || []);
        const init = {};
        (data.fields || []).forEach((f) => {
          init[f.key] = "";
        });
        setValues(init);
        setPreview(null);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [activeTpl]);

  const currentItems = useMemo(() => {
    return catalog.find((c) => c.category === activeCat)?.items || [];
  }, [catalog, activeCat]);

  const groupedTemplates = useMemo(() => {
    const acc = {};
    (currentItems || []).forEach((it) => {
      const k = it.case_type || "Diğer";
      acc[k] = acc[k] || [];
      acc[k].push(it);
    });
    return acc;
  }, [currentItems]);

  const handleChange = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const doPreview = async () => {
    if (!activeTpl) return alert("Önce dilekçe türü seçiniz.");
    setLoading(true);
    try {
      const r = await authFetch("/writer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: activeTpl,
          values,
          language,
          include_statutes: includeStatutes,
          include_case_law: includeCaseLaw,
          mask_pii: maskPII,
          ai_note: aiNote,
        }),
      });
      const data = await r.json();
      setPreview(data);
    } catch (e) {
      console.error(e);
      alert("Önizleme alınamadı.");
    } finally {
      setLoading(false);
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

  const doExport = async (format = "docx") => {
    if (!activeTpl) return alert("Önce dilekçe türü seçiniz.");
    try {
      const r = await authFetch("/writer/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: activeTpl,
          values,
          language,
          include_statutes: includeStatutes,
          include_case_law: includeCaseLaw,
          mask_pii: maskPII,
          ai_note: aiNote,
          format, // ✅ docx | uyap | udf
        }),
      });

      // Eğer backend JSON hata döndürürse yakalamak için:
      const contentType = r.headers.get("content-type") || "";
      if (!r.ok) {
        if (contentType.includes("application/json")) {
          const err = await r.json();
          throw new Error(err?.detail || "Export failed");
        }
        throw new Error("Export failed");
      }

      const blob = await r.blob();
      downloadBlob(blob, `dilekce.${format}`);
    } catch (e) {
      console.error(e);
      alert("İndirme sırasında hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto pb-24 px-4">
      <div className="max-w-7xl mx-auto pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-accent mb-2">Dilekçe Oluşturucu</h1>
        <p className="text-center text-sm text-white/55 mb-8">Sol panelden kategori seçin; şablonlar ortada listelenir. Tür seçtikten sonra formu doldurun.</p>

        <div className="grid lg:grid-cols-[220px_1fr_360px] gap-6 items-start">
          {/* LEFT: Category sidebar */}
          <aside className="glass p-4 rounded-2xl lg:sticky lg:top-24 h-fit">
            <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Kategoriler</div>
            <div className="flex flex-col gap-1.5">
              {catalog.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => {
                    setActiveCat(cat.category);
                    setActiveTpl(null);
                  }}
                  className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition border ${
                    activeCat === cat.category
                      ? "bg-[var(--miron-gold)] text-black border-[var(--miron-gold)]"
                      : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          </aside>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-5 rounded-2xl"
          >
            <h3 className="text-sm font-semibold text-white/70 mb-4 text-center">Şablonlar — {activeCat || "—"}</h3>
            {!currentItems.length ? (
              <div className="text-sm text-white/50 text-center py-12">Bu kategoride şablon yok.</div>
            ) : (
              <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
                {Object.entries(groupedTemplates).map(([caseType, items]) => (
                  <div key={caseType} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-xs text-white/50 mb-3 uppercase tracking-wider">{caseType}</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveTpl(item.key)}
                          className={`text-left px-3 py-3 rounded-xl transition border text-sm ${
                            activeTpl === item.key
                              ? "bg-[var(--miron-gold)]/20 border-[var(--miron-gold)] text-white"
                              : "bg-black/30 border-white/10 text-white/85 hover:border-white/25"
                          }`}
                        >
                          <div className="font-semibold leading-snug">{item.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-5 rounded-2xl space-y-4 lg:sticky lg:top-24"
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                <div className="font-semibold mb-2 text-white/80">Dil</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("TR")}
                    className={`px-3 py-1 rounded-lg ${language === "TR" ? "bg-accent text-black" : "bg-white/10"}`}
                  >
                    TR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("EN")}
                    className={`px-3 py-1 rounded-lg ${language === "EN" ? "bg-accent text-black" : "bg-white/10"}`}
                  >
                    EN
                  </button>
                </div>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                <div className="font-semibold mb-2 text-white/80">Seçenekler</div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={includeStatutes} onChange={(e) => setIncludeStatutes(e.target.checked)} />
                  <span>Kanun</span>
                </label>
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={includeCaseLaw} onChange={(e) => setIncludeCaseLaw(e.target.checked)} />
                  <span>Emsal</span>
                </label>
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={maskPII} onChange={(e) => setMaskPII(e.target.checked)} />
                  <span>KVKK</span>
                </label>
              </div>
            </div>

            <h3 className="text-lg font-semibold">Form</h3>
        {!activeTpl && (
          <div className="text-sm opacity-70">Lütfen dilekçe türü seçiniz.</div>
        )}
        {activeTpl && (
          <>
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Yapay Zekaya Not</div>
              <textarea
                rows={3}
                value={aiNote}
                onChange={(e) => setAiNote(e.target.value)}
                placeholder="AI not: Üslup, vurgu, ek talepler, özel durumlar..."
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="text-sm">
                  <div className="mb-1">
                    {f.label}
                    {f.required && <span className="text-red-400"> *</span>}
                  </div>
                  {f.type === "textarea" ? (
                    <textarea
                      rows={4}
                      value={values[f.key] || ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      placeholder={f.placeholder || ""}
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={values[f.key] || ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                    >
                      <option value="">Seçiniz</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={values[f.key] || ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      placeholder={f.placeholder || ""}
                      className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={doPreview}
                disabled={loading}
              className="flex-1 py-2 rounded-xl bg-accent text-black font-semibold hover:scale-105 transition disabled:opacity-60"
              >
                {loading ? "Hazırlanıyor..." : "Önizleme"}
              </button>

              {/* ✅ 3 İNDİRME TUŞU */}
              <button
                onClick={() => doExport("docx")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20"
              >
                DOCX
              </button>
              <button
                onClick={() => doExport("pdf")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20"
              >
                PDF
              </button>
              <button
                onClick={() => doExport("uyap")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20"
              >
                UYAP
              </button>
              <button
                onClick={() => doExport("udf")}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20"
              >
                UDF
              </button>
            </div>

            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-4 p-3 rounded-xl bg-white/10 border border-white/10 text-sm"
                >
                  <div className="text-accent font-semibold mb-2">Önizleme</div>
                  {["strategic_assessment", "header", "summary", "legal_basis", "result_requests", "attachments"].map(
                    (k) =>
                      preview[k] ? (
                        <div key={k} className={`mb-3 ${k === "strategic_assessment" ? "bg-accent/10 p-3 rounded-lg border border-accent/20" : ""}`}>
                          <div className={`opacity-70 capitalize ${k === "strategic_assessment" ? "text-accent font-bold" : ""}`}>
                            {k === "strategic_assessment" ? "STRATEGIC PRE-CHECK" : k.replace("_", " ")}
                          </div>
                          <pre className="whitespace-pre-wrap">{preview[k]}</pre>
                        </div>
                      ) : null
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
          </motion.section>
        </div>

        <footer className="text-center text-xs text-subtle mt-12 py-6 glass border border-white/10 rounded-2xl">
          © 2025 Miron Intelligence — Tüm hakları saklıdır.
        </footer>
      </div>
    </div>
  );
}
