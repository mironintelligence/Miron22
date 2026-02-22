import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "../auth/api";

const API = `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/api/risk`;

export default function Risk() {
  const [file, setFile] = useState(null);
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onAnalyze = async () => {
    if (!file && !caseText.trim()) {
      alert("Lütfen dosya seçin veya metin girin.");
      return;
    }
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    if (file) fd.append("file", file);
    if (caseText.trim()) fd.append("case_text", caseText);

    try {
      const r = await authFetch(`/api/risk/analyze`, { method: "POST", body: fd });
      const data = await r.json();
      setResult(data);
    } catch (e) {
      alert("Analiz hatası: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-2 text-accent">🧠 Risk & Strateji Analizi</h1>
      <p className="text-subtle mb-6">
        Dosyanızı veya dava özetinizi girin; Miron AI risk puanı, kazanma ihtimali ve strateji önerileri çıkarsın.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol: Giriş */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <div className="mb-3">
            <label className="block text-sm mb-2">📂 Dosya (PDF/DOCX/TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.rtf,.odt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-2"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-2">📝 Veya metin girin</label>
            <textarea
              rows={10}
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Dava özeti / olaylar / deliller..."
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3"
            />
          </div>

          <button
            onClick={onAnalyze}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-black bg-accent hover:opacity-90"
          >
            {loading ? "Analiz ediliyor..." : "Analiz Et"}
          </button>
        </motion.div>

        {/* Sağ: Sonuç */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          {!result ? (
            <div className="text-subtle">Sonuç burada görünecek.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-sm text-subtle">Risk Skoru</div>
                  <div className="text-3xl font-semibold text-fg">
                    {result.risk_score}/100
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-sm text-subtle">Kazanma Olasılığı</div>
                  <div className="text-3xl font-semibold text-fg">
                    {result.winning_probability}%
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-1">Tahmini Dava Türü</div>
                <div className="font-semibold">{result.case_type_guess}</div>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">🔎 Tespit Edilen Riskler</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.key_issues || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">✅ Önerilen Aksiyonlar</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.recommended_actions || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">🎯 Taktik Strateji</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.tactical_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">🛡️ Savunma Stratejisi</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.defensive_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">🧩 Karşı Strateji</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.counter_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2">🤝 Uzlaşma Analizi</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.settlement_analysis || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 text-xs text-subtle">
                Olasılık mantığı: {result.probability_logic || "Belirtilmedi"}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
