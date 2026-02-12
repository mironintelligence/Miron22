import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/risk`;

export default function RiskStrategy() {
  const [file, setFile] = useState(null);
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);

  const handleAnalyze = async () => {
    setErr("");
    setRes(null);

    const noInput = !file && !caseText.trim();
    if (noInput) {
      setErr("Lütfen bir dosya seçin veya metin girin.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (caseText.trim()) fd.append("case_text", caseText);

      const r = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(txt || `Sunucu hatası: ${r.status}`);
      }
      const data = await r.json();
      setRes(data);
    } catch (e) {
      setErr(e.message || "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  // basit bar komponenti (grafiksiz)
  const Bar = ({ label, value, max = 100 }) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs text-subtle mb-1">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <div className="glass p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-accent mb-6">
          🛡️ Risk & Strateji Analizi
        </h1>

        {/* GİRİŞ BLOKU */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dosya / Metin */}
          <div className="glass p-4">
            <div className="mb-4">
              <label className="block text-sm text-muted mb-1">Dosya (PDF/DOCX/TXT…)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-2"
                accept=".pdf,.docx,.txt,.rtf,.odt"
              />
              {file && (
                <div className="text-xs text-subtle mt-1">
                  Seçilen: <span className="text-fg">{file.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Veya Metin</label>
              <textarea
                rows={8}
                value={caseText}
                onChange={(e) => setCaseText(e.target.value)}
                placeholder="Dava özeti / olay metni…"
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-accent text-black font-semibold hover:scale-105 transition disabled:opacity-60"
              >
                {loading ? "Analiz ediliyor…" : "Analiz Et"}
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setCaseText("");
                  setErr("");
                  setRes(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/20"
              >
                Temizle
              </button>
            </div>

            <AnimatePresence>
              {err && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="mt-3 text-sm text-red-400"
                >
                  ❌ {err}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sonuç kartı */}
          <div className="glass p-4">
            <h3 className="text-lg font-semibold mb-3 text-accent">📊 Sonuç</h3>

            {!res && (
              <div className="text-sm text-subtle">
                Henüz analiz yok. Dosya yükleyin veya metin girip <span className="text-accent">Analiz Et</span>’e basın.
              </div>
            )}

            {res && (
              <div className="space-y-4">
                {/* üst özet */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="glass p-3">
                    <div className="text-subtle">Dosya/Kaynak</div>
                    <div className="font-semibold">{res.source || "-"}</div>
                  </div>
                  <div className="glass p-3">
                    <div className="text-subtle">Olası Tür</div>
                    <div className="font-semibold">{res.case_type_guess || "-"}</div>
                  </div>
                  <div className="glass p-3">
                    <div className="text-subtle">Metin Uzunluğu</div>
                    <div className="font-semibold">{res.length || 0}</div>
                  </div>
                  <div className="glass p-3">
                    <div className="text-subtle">Tarih</div>
                    <div className="font-semibold">{res.created_at || "-"}</div>
                  </div>
                </div>

                {/* barlar */}
                <Bar label="Kazanma İhtimali" value={res.winning_probability} />
                <Bar label="Risk Skoru" value={res.risk_score} />

                {/* kritik başlıklar */}
                <div className="glass p-3">
                  <div className="text-sm text-accent font-semibold mb-2">⚠️ Risk/Kritik Başlıklar</div>
                  {(res.key_issues || []).length ? (
                    <ul className="list-disc ml-5 text-sm text-fg space-y-1">
                      {res.key_issues.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-subtle">Kayıt yok.</div>
                  )}
                </div>

                {/* öneriler */}
                <div className="glass p-3">
                  <div className="text-sm text-accent font-semibold mb-2">🧭 Strateji / Öneriler</div>
                  {(res.recommended_actions || []).length ? (
                    <ul className="list-disc ml-5 text-sm text-fg space-y-1">
                      {res.recommended_actions.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-subtle">Kayıt yok.</div>
                  )}
                </div>

                {/* rapor yolu */}
                {res.saved_report && (
                  <div className="text-xs text-subtle">
                    Kaydedildi: <span className="text-muted">{res.saved_report}</span>
                  </div>
                )}

                {/* yazdır */}
                <div className="flex justify-end">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-sm"
                  >
                    Yazdır
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* bilgilendirme */}
        <p className="text-xs text-subtle mt-6">
          Not: Bu modül <span className="text-accent">/risk/analyze</span> endpoint’inden canlı sonuç çeker.
        </p>
      </div>
    </div>
  );
}
