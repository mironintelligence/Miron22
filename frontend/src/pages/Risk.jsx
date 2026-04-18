import React, { useState } from "react";
import { motion } from "framer-motion";
import { authFetch } from "../auth/api";

const ALLOWED_EXTS = [".pdf", ".docx", ".txt"];
const ACCEPT_ATTR = ALLOWED_EXTS.join(",");
const MAX_FILE_BYTES = 15 * 1024 * 1024; // backend cap

export default function Risk() {
  const [file, setFile] = useState(null);
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (f) => {
    setErrorMsg("");
    if (!f) {
      setFile(null);
      return;
    }
    const name = String(f.name || "").toLowerCase();
    const ok = ALLOWED_EXTS.some((ext) => name.endsWith(ext));
    if (!ok) {
      setFile(null);
      setErrorMsg("Sadece .pdf, .docx ve .txt dosyaları desteklenir.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      setErrorMsg("Dosya çok büyük. En fazla 15 MB olmalı.");
      return;
    }
    setFile(f);
  };

  const onAnalyze = async () => {
    if (!file && !caseText.trim()) {
      setErrorMsg("Lütfen dosya seçin veya metin girin.");
      return;
    }
    setLoading(true);
    setResult(null);
    setErrorMsg("");

    const fd = new FormData();
    if (file) fd.append("file", file);
    if (caseText.trim()) fd.append("case_text", caseText);

    try {
      const r = await authFetch(`/api/risk/analyze`, { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : null;
        const msg =
          r.status === 401
            ? "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın."
            : r.status === 413
              ? "Dosya çok büyük. En fazla 15 MB yükleyebilirsiniz."
              : r.status === 415
                ? "Desteklenmeyen dosya türü."
                : r.status >= 500
                  ? "Sunucu hatası. Lütfen biraz sonra tekrar deneyin."
                  : detail || `Analiz hatası (HTTP ${r.status}).`;
        throw new Error(msg);
      }
      if (data && typeof data.risk_score === "number") {
        setResult(data);
      } else {
        throw new Error("Sunucudan beklenmeyen yanıt alındı.");
      }
    } catch (e) {
      setErrorMsg(e?.message || "Analiz sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-2 text-accent"> Risk & Strateji Analizi</h1>
      <p className="text-subtle mb-6">
        Dosyanızı veya dava özetinizi girin; Miron AI risk puanı, kazanma ihtimali ve strateji önerileri çıkarsın.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <div className="mb-3">
            <label className="block text-sm mb-2"> Dosya (PDF / DOCX / TXT — en fazla 15 MB)</label>
            <input
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-2"
            />
            {file ? (
              <div className="mt-2 text-xs text-white/60">Seçilen: {file.name}</div>
            ) : null}
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-2"> Veya metin girin</label>
            <textarea
              rows={10}
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Dava özeti / olaylar / deliller..."
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3"
            />
          </div>

          {errorMsg ? (
            <div
              role="alert"
              className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 text-red-100 text-sm px-3 py-2"
            >
              {errorMsg}
            </div>
          ) : null}

          <button
            onClick={onAnalyze}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-black bg-accent hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Analiz ediliyor..." : "Analiz Et"}
          </button>
        </motion.div>

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
                    {typeof result.risk_score === "number" ? `${result.risk_score}/100` : "—"}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/10 border border-white/10">
                  <div className="text-sm text-subtle">Kazanma Olasılığı</div>
                  <div className="text-3xl font-semibold text-fg">
                    {typeof result.winning_probability === "number" ? `${result.winning_probability}%` : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-1">Tahmini Dava Türü</div>
                <div className="font-semibold">{result.case_type_guess || "—"}</div>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Tespit Edilen Riskler</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.key_issues || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Önerilen Aksiyonlar</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.recommended_actions || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Taktik Strateji</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.tactical_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Savunma Stratejisi</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.defensive_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Karşı Strateji</div>
                <ul className="list-disc pl-5 space-y-1">
                  {(result.counter_strategy || []).map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-sm text-subtle mb-2"> Uzlaşma Analizi</div>
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
