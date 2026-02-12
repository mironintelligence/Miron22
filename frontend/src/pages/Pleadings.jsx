import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/writer`;

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
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/catalog`);
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
        const r = await fetch(`${API}/fields/${activeTpl}`);
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

  const handleChange = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const doPreview = async () => {
    if (!activeTpl) return alert("Önce dilekçe türü seçiniz.");
    setLoading(true);
    try {
      const r = await fetch(`${API}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: activeTpl,
          values,
          language,
          include_statutes: includeStatutes,
          include_case_law: includeCaseLaw,
          mask_pii: maskPII,
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
      const r = await fetch(`${API}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: activeTpl,
          values,
          language,
          include_statutes: includeStatutes,
          include_case_law: includeCaseLaw,
          mask_pii: maskPII,
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
    <div className="min-h-screen overflow-y-auto pb-24 mt-12 grid grid-cols-12 gap-5">
      {/* Sol: Kategoriler */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="col-span-12 md:col-span-3 glass p-4 h-fit sticky top-20"
      >
        <h3 className="text-lg font-semibold mb-3">🗂️ Kategoriler</h3>
        <div className="space-y-2">
          {catalog.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setActiveCat(cat.category)}
              className={`w-full text-left px-3 py-2 rounded-xl transition ${
                activeCat === cat.category
                  ? "bg-accent text-black"
                  : "bg-white/10 hover:bg-white/20 text-fg"
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>
      </motion.aside>

      {/* Orta: Dilekçe Türleri */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-12 md:col-span-5 glass p-4"
      >
        <h3 className="text-lg font-semibold mb-3">📄 Dilekçe Türleri</h3>
        {!currentItems.length && (
          <div className="text-sm opacity-70">Bu kategoride kayıt yok.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentItems.map((item) => (
            <motion.button
              key={item.key}
              onClick={() => setActiveTpl(item.key)}
              whileHover={{ scale: 1.02 }}
              className={`text-left p-4 rounded-2xl border border-white/10 backdrop-blur-xl transition ${
                activeTpl === item.key
                  ? "bg-accent text-black"
                  : "bg-white/10 hover:bg-white/20 text-fg"
              }`}
            >
              <div className="text-sm opacity-80">{item.case_type}</div>
              <div className="font-semibold">{item.title}</div>
            </motion.button>
          ))}
        </div>

        {/* Ayarlar */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="glass p-3 rounded-xl">
            <div className="font-semibold mb-2">Dil</div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("TR")}
                className={`px-3 py-1 rounded-lg ${
                  language === "TR"
                    ? "bg-accent text-black"
                    : "bg-white/10"
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage("EN")}
                className={`px-3 py-1 rounded-lg ${
                  language === "EN"
                    ? "bg-accent text-black"
                    : "bg-white/10"
                }`}
              >
                EN
              </button>
            </div>
          </div>
          <div className="glass p-3 rounded-xl">
            <div className="font-semibold mb-2">Seçenekler</div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeStatutes}
                onChange={(e) => setIncludeStatutes(e.target.checked)}
              />
              <span>Kanun Maddeleri</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={includeCaseLaw}
                onChange={(e) => setIncludeCaseLaw(e.target.checked)}
              />
              <span>Yargıtay Emsal Önerisi</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={maskPII}
                onChange={(e) => setMaskPII(e.target.checked)}
              />
              <span>KVKK Maskeleme</span>
            </label>
          </div>
        </div>
      </motion.section>

      {/* Sağ: Dinamik Form + Önizleme */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-12 md:col-span-4 glass p-4"
      >
        <h3 className="text-lg font-semibold mb-3">🧾 Form</h3>
        {!activeTpl && (
          <div className="text-sm opacity-70">Lütfen dilekçe türü seçiniz.</div>
        )}
        {activeTpl && (
          <>
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
                  <div className="text-accent font-semibold mb-2">
                    📄 Önizleme
                  </div>
                  {["header", "summary", "legal_basis", "result_requests", "attachments"].map(
                    (k) =>
                      preview[k] ? (
                        <div key={k} className="mb-3">
                          <div className="opacity-70 capitalize">
                            {k.replace("_", " ")}
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

      {/* ✅ Alt Telif Satırı */}
      <footer className="col-span-12 text-center text-xs text-subtle mt-10 py-6 glass border-t border-white/10 rounded-t-2xl">
        ®2025 Miron Intelligence — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
