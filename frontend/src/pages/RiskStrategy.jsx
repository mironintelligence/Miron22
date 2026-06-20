import React, { useState } from "react";
import { authFetch } from "../auth/api";
import { motion, AnimatePresence } from "framer-motion";

// API base defined via authFetch relative path

export default function RiskStrategy() {
  const [file, setFile] = useState(null);
  const [caseText, setCaseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);

  const handleAnalyze = async () => {
    setErr("");
    setRes(null);

    if (!file && !caseText.trim()) {
      setErr("Lütfen bir dosya seçin veya metin girin.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (caseText.trim()) fd.append("case_text", caseText);

      const r = await authFetch("/api/risk/analyze", { method: "POST", body: fd });
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

  const ScoreCard = ({ label, value, color = "text-white", sub }) => (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
      <div className="text-sm text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );

  const ListSection = ({ title, items, icon = "•" }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="premium-scope bg-white/5 border border-white/10 p-5 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-[#ebac00]">{icon}</span> {title}
        </h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-white/80 flex gap-2">
              <span className="text-white/30 mt-1">▪</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-24 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-yellow-500 bg-clip-text text-transparent mb-4">
          Risk & Strateji Motoru
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Yapay zeka destekli derinlemesine dava analizi. Kazanma ihtimali, risk skoru ve taktiksel öneriler.
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        {/* INPUT SECTION */}
        <div className="space-y-6 h-fit sticky top-24">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-4">Dava Verileri</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Dosya Yükle (PDF/DOCX)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ebac00] file:text-black hover:file:opacity-85 transition"
                  accept=".pdf,.docx,.txt"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0a0a0a] px-2 text-white/40">veya</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Dava Metni / Özet</label>
                <textarea
                  rows={10}
                  value={caseText}
                  onChange={(e) => setCaseText(e.target.value)}
                  placeholder="Dava dilekçesi, olay özeti veya hukuki uyuşmazlık metnini buraya yapıştırın..."
                  className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white text-sm focus:ring-2 focus:ring-[#ebac00] outline-none resize-none"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={{ background: 'linear-gradient(90deg, #ebac00, #b88700)' }}
                className="w-full py-3 rounded-xl text-black font-bold shadow-lg hover:opacity-85 transition disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-xl">⟳</span> Analiz Ediliyor...
                  </>
                ) : (
                  "Analizi Başlat"
                )}
              </button>

              <button
                onClick={() => { setFile(null); setCaseText(""); setErr(""); setRes(null); }}
                className="w-full py-2 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition text-sm"
              >
                Temizle
              </button>
            </div>

            <AnimatePresence>
              {err && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm"
                >
                  {err}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RESULTS SECTION */}
        <div className="space-y-6">
          {!res && !loading && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="text-6xl mb-4 opacity-20"></div>
              <h3 className="text-xl font-semibold text-white/60">Analiz Sonucu Bekleniyor</h3>
              <p className="text-white/30 mt-2 max-w-md">
                Sol taraftan dosya yükleyin veya metin girerek yapay zeka destekli risk analizini başlatın.
              </p>
            </div>
          )}

          {res && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Score Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="Kazanma İhtimali" value={`%${res.winning_probability}`} color="text-green-400" />
                <ScoreCard label="Risk Skoru" value={res.risk_score} color={res.risk_score > 70 ? "text-red-500" : res.risk_score > 40 ? "text-yellow-500" : "text-green-500"} />
                <ScoreCard label="Risk Kategorisi" value={res.risk_category} color="text-white" />
                <ScoreCard label="Güven Skoru" value={res.confidence_score} sub="Model Güvenilirliği" />
              </div>

              {/* Probability Logic */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-white/50 uppercase mb-3">Analiz Mantığı</h3>
                <p className="text-white/90 leading-relaxed italic border-l-4 border-[#ebac00] pl-4">
                  "{res.probability_logic}"
                </p>
              </div>

              {/* Main Analysis Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <ListSection title="Kritik Riskler" items={res.key_issues} icon="" />
                <ListSection title="Olumlu Sinyaller" items={res.positive_signals} icon="" />
                <ListSection title="Eksik Unsurlar" items={res.missing_elements} icon="" />
                <ListSection title="Önerilen Aksiyonlar" items={res.recommended_actions} icon="" />
              </div>

              {/* Strategy Tabs / Sections */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">Stratejik Planlama</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <ListSection title="Taktiksel Strateji (Saldırı)" items={res.tactical_strategy} icon="" />
                  <ListSection title="Savunma Stratejisi" items={res.defensive_strategy} icon="" />
                  <ListSection title="Karşı Hamle Öngörüsü" items={res.counter_strategy} icon="" />
                  <ListSection title="Sulh & Anlaşma Analizi" items={res.settlement_analysis} icon="" />
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
