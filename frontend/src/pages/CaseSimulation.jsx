import React, { useRef, useState } from "react";
import { authFetch, apiDetailMessage } from "../auth/api";

const SIM_ALLOWED_EXT = [".pdf", ".docx", ".txt"];
const SIM_MAX_BYTES = 15 * 1024 * 1024;

function extOf(name) {
  const n = String(name || "").toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i) : "";
}

export default function CaseSimulation() {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    case_description: "",
    jurisdiction: "Türkiye",
    user_role: "Davacı",
  });
  const [attachment, setAttachment] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setAttachment(null);
      return;
    }
    const ex = extOf(f.name);
    if (!SIM_ALLOWED_EXT.includes(ex)) {
      setError(`Yalnızca ${SIM_ALLOWED_EXT.join(", ")} yükleyebilirsiniz.`);
      clearAttachment();
      return;
    }
    if (f.size > SIM_MAX_BYTES) {
      setError(`Dosya en fazla ${SIM_MAX_BYTES / (1024 * 1024)} MB olabilir.`);
      clearAttachment();
      return;
    }
    setError("");
    setAttachment(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const desc = formData.case_description.trim();
    if (!desc && !attachment) {
      setError("Dava senaryosu yazın veya PDF/DOCX/TXT dosyası yükleyin (ikisi birlikte de olabilir).");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = new FormData();
      payload.append("case_description", desc);
      payload.append("jurisdiction", formData.jurisdiction);
      payload.append("user_role", formData.user_role);
      if (attachment) {
        payload.append("file", attachment, attachment.name);
      }

      const resp = await authFetch("/api/risk/simulate", {
        method: "POST",
        body: payload,
      });
      if (!resp.ok) {
        let detail = "Simülasyon başarısız oldu.";
        try {
          const t = await resp.json();
          detail = apiDetailMessage(t) || detail;
        } catch {
          /* ignore */
        }
        setError(detail);
        return;
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
    <div className="premium-scope min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent" style={{ background: 'linear-gradient(90deg, #ebac00, #b88700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#ebac00] outline-none transition"
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
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#ebac00] outline-none transition"
                  placeholder="Örn: İstanbul Asliye Ticaret Mahkemesi"
                />
              </div>
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
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#ebac00] outline-none transition resize-none"
                placeholder="Olayın detaylarını, eldeki delilleri, karşı tarafın olası iddialarını ve hukuki süreci detaylıca anlatın..."
              />
              <p className="text-xs text-white/40 mt-2 text-right">
                Ne kadar detay verirseniz simülasyon o kadar isabetli olur. İsterseniz aşağıdan dilekçe / özet PDF veya DOCX yükleyin; metin çıkarılıp simülasyona eklenir.
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 space-y-3">
              <label className="block text-sm font-medium text-white/80">
                Dosya yükle (isteğe bağlı)
              </label>
              <p className="text-xs text-white/45">
                PDF, DOCX veya TXT — en fazla 15 MB. Yüklenen dosyanın metni sunucuda çıkarılır ve dava senaryosuyla birlikte modele gönderilir.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={onPickFile}
                  className="text-sm text-white/80 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ebac00]/20 file:px-3 file:py-2 file:text-[#ebac00] file:font-medium"
                />
                {attachment ? (
                  <span className="text-sm text-white/70 flex items-center gap-2">
                    <span className="text-[#ebac00]/90">{attachment.name}</span>
                    <span className="text-white/40">({(attachment.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="text-xs text-red-300 hover:text-red-200 underline"
                    >
                      Kaldır
                    </button>
                  </span>
                ) : null}
              </div>
            </div>

            <div
              className="rounded-2xl border-2 border-amber-400/90 bg-amber-300/35 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(234,179,8,0.18)]"
              role="presentation"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-lg tracking-wide shadow-md border border-amber-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  "Çalıştır"
                )}
              </button>
            </div>
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
            {result.simulation_input_meta?.file_attached ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/95">
                <span className="font-semibold text-emerald-300">Dosya işlendi ve analize dahil edildi.</span>{" "}
                {result.simulation_input_meta.file_name ? (
                  <>
                    <span className="text-white/80">{result.simulation_input_meta.file_name}</span>
                    {" — "}
                  </>
                ) : null}
                Çıkarılan metin:{" "}
                <span className="tabular-nums text-white">
                  {(result.simulation_input_meta.file_text_chars_extracted ?? 0).toLocaleString("tr-TR")}
                </span>{" "}
                karakter; modele gömülen bölüm:{" "}
                <span className="tabular-nums text-white">
                  {(result.simulation_input_meta.file_text_chars_embedded ?? 0).toLocaleString("tr-TR")}
                </span>{" "}
                karakter
                {(result.simulation_input_meta.file_text_chars_extracted || 0) >
                (result.simulation_input_meta.file_text_chars_embedded || 0)
                  ? " (uzun dosyalarda ilk kısım kullanılır)."
                  : "."}
              </div>
            ) : null}

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
            <div className="bg-gradient-to-br from-[#ebac00]/10 to-black border border-[#ebac00]/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-[#ebac00] mb-4 flex items-center gap-2">
                <span></span> Stratejik Tavsiye
              </h3>
              <p className="text-white/90 leading-relaxed text-lg">
                {result.strategic_recommendation}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
                   Zorunlu Yapısal Katmanlar
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
                            <span className="text-[#ebac00]">•</span>
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
                   Alternatif Hukuki Niteleme
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
                     Yargı Yeri ve Usul
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
                     Risk Faktörleri
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
                     Senaryolar
                  </h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                      <div className="text-xs font-bold text-green-400 uppercase mb-1">En İyi Senaryo</div>
                      <p className="text-sm text-white/80">{result.scenarios?.best_case}</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-xs font-bold text-[#ebac00] uppercase mb-1">En Olası Sonuç</div>
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
                     Karşı Taraf Argümanları
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
