// src/pages/Analyze.jsx
import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { authFetch } from "../auth/api";

// Backend kabul listesiyle hizalı; aksi halde UploadFile 415 dönüp
// kullanıcıya görünmez hata yaratıyor.
const ALLOWED_EXTS = [".pdf", ".docx", ".txt"];
const ACCEPT_ATTR = ALLOWED_EXTS.join(",");
const MAX_FILE_BYTES = 15 * 1024 * 1024; // backend cap

function prettyBytes(n) {
  if (!Number.isFinite(n)) return "?";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------ helpers ------------------------ */
function pickFirstLine(val) {
  if (!val) return "";
  const s = String(val).replace(/\r/g, "").trim();
  if (!s) return "";
  const line = s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)[0];
  return line || "";
}

function takeHeaderPart(text) {
  const t = (text || "").replace(/\r/g, "");
  const idx = t.search(
    /(AÇIKLAMALAR|AÇIKLAMA|OLAYLAR|DELİLLER|HUKUKİ\s+NEDENLER|SONUÇ\s*VE\s*İSTEM|SONUÇ|İSTEM)/i
  );
  if (idx > 0) return t.slice(0, idx);
  return t.slice(0, 3000);
}

function cleanChunk(s) {
  if (!s) return "";
  let x = String(s).replace(/\r/g, " ");
  x = x.replace(/\s+/g, " ").trim();

  x = x.replace(
    /\b(Adres|TCKN|T\.?C\.?\s*Kimlik|Vergi\s*No|Mersis|Tel|Telefon|E-?posta|Email|Eposta)\b.*$/i,
    ""
  );
  x = x.replace(/\b(Vekili|VEKİLİ|Av\.?|Avukat)\b.*$/i, "");

  x = x.trim();
  if (x.length > 120) x = x.slice(0, 120).trim();
  return x;
}

function extractPersonName(chunk) {
  const c = cleanChunk(chunk);
  if (!c) return "";

  // 1) TAM BÜYÜK HARF: AHMET YILMAZ
  const upper = c.match(
    /\b([A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,}){1,4})\b/
  );
  if (upper) return upper[1].trim();

  // 2) Normal: Ahmet Yılmaz
  const normal = c.match(
    /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,3})\b/
  );
  if (normal) return normal[1].trim();

  const bad = /(KONUSU|AÇIKLAMALAR|DAVA|MAHKEME|İSTEM|SONUÇ|DELİL)/i;
  if (!bad.test(c) && c.length <= 80) return c;

  return "";
}

function grabBetweenLabels(headerText, label) {
  const t = headerText || "";
  const stop =
    "(?=\\s*(?:VEKİLİ|DAVACI|DAVALI|KONUSU|DAVA\\s*KONUSU|AÇIKLAMALAR|AÇIKLAMA|OLAYLAR|DELİLLER|SONUÇ|İSTEM)\\s*[:\\-])";

  const re = new RegExp(`${label}\\s*[:-]\\s*(.*?)${stop}`, "is");
  const m = t.match(re);
  if (m) return (m[1] || "").trim();

  const re2 = new RegExp(`${label}\\s*[:-]\\s*([^\\n\\r]+)`, "i");
  const m2 = t.match(re2);
  return m2 ? (m2[1] || "").trim() : "";
}

function extractCourt(headerText) {
  const t = headerText || "";
  const m = t.match(/([A-ZÇĞİÖŞÜ0-9\s.'’()-]{6,}MAHKEMESİ)/);
  return m ? pickFirstLine(m[1]) : "";
}

function extractEsasKarar(headerText) {
  const t = headerText || "";

  const esas1 = t.match(/\b(\d{4}\/\d+)\s*E\.?\b/i);
  const karar1 = t.match(/\b(\d{4}\/\d+)\s*K\.?\b/i);

  const esas2 = t.match(/(?:Esas\s*No|E\.?\s*No)\s*[:-]\s*([^\n\r]+)/i);
  const karar2 = t.match(/(?:Karar\s*No|K\.?\s*No)\s*[:-]\s*([^\n\r]+)/i);

  return {
    esas: pickFirstLine(esas1?.[1] || esas2?.[1] || ""),
    karar: pickFirstLine(karar1?.[1] || karar2?.[1] || ""),
  };
}

function extractKonu(headerText) {
  const t = headerText || "";
  const m = t.match(
    /(?:KONUSU|DAVA\s*KONUSU)\s*[:-]\s*(.*?)(?=\s*(?:AÇIKLAMALAR|AÇIKLAMA|OLAYLAR|DELİLLER|SONUÇ|İSTEM)\b)/is
  );
  if (m) return pickFirstLine(m[1]);

  const m2 = t.match(/(?:KONUSU|DAVA\s*KONUSU)\s*[:-]\s*([^\n\r]+)/i);
  return m2 ? pickFirstLine(m2[1]) : "";
}

function extractFields(text) {
  const full = (text || "").replace(/\r/g, "");
  const header = takeHeaderPart(full);

  const davaciChunk = grabBetweenLabels(header, "DAVACI");
  const davaliChunk = grabBetweenLabels(header, "DAVALI");

  const davaci = extractPersonName(davaciChunk);
  const davali = extractPersonName(davaliChunk);

  const mahkeme = extractCourt(header);
  const { esas, karar } = extractEsasKarar(header);
  const konu = extractKonu(header);

  return {
    davaci: davaci || "—",
    davali: davali || "—",
    mahkeme: mahkeme || "—",
    esas: esas || "—",
    karar: karar || "—",
    konu: konu || "",
  };
}

/* ------------------------ component ------------------------ */
export default function Analyze() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  // Backend çıktıları
  // NOT: ham metni ekranda GÖSTERMİYORUZ, sadece alan çıkarma için saklıyoruz.
  const [analysisText, setAnalysisText] = useState("");
  const [summary, setSummary] = useState("");
  const [caseType, setCaseType] = useState("");
  const [structured, setStructured] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fields = useMemo(() => {
    if (structured && typeof structured === "object") {
      return {
        dosya_no: structured.dosya_no || "—",
        evrak_no: structured.evrak_no || "—",
        davaci: structured.davaci || "—",
        davali: structured.davali || "—",
        mahkeme: structured.mahkeme || "—",
        esas: (structured.dosya_no || "").includes("E") ? structured.dosya_no : "—",
        karar: structured.karar_no || structured.karar || "—",
        konu: structured.konu_ozeti || "",
      };
    }
    return extractFields(analysisText || summary || "");
  }, [analysisText, summary, structured]);

  const handleAnalyze = async () => {
    if (!file) {
      setErrorMsg("Lütfen bir dosya seçin.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await authFetch("/analyze", {
        method: "POST",
        body: fd,
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        // Prefer the backend's structured detail; fall back to status-based copy.
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((d) => d?.msg || d).join("; ")
              : "";
        const msg =
          detail ||
          (r.status === 401
            ? "Oturumunuzun süresi dolmuş olabilir, lütfen tekrar giriş yapın."
            : r.status === 413
              ? `Dosya çok büyük (maks. ${prettyBytes(MAX_FILE_BYTES)}).`
              : r.status === 415
                ? "Desteklenmeyen dosya türü. PDF, DOCX veya TXT yükleyin."
                : r.status >= 500
                  ? "Sunucu hatası oluştu. Lütfen birazdan tekrar deneyin."
                  : "Analiz başarısız oldu.");
        throw new Error(msg);
      }

      setAnalysisText(data.analysis || data.text || data.raw_text || "");
      setSummary(data.summary || data.ozet || "");
      setCaseType(data.dava_turu || data.case_type || data.caseType || "");
      setStructured(data.structured || null);
    } catch (e) {
      setAnalysisText("");
      setSummary("");
      setCaseType("");
      setStructured(null);
      setErrorMsg(e?.message || "Sunucu hatası / bağlantı sorunu.");
    } finally {
      setLoading(false);
    }
  };

  const hasResult = Boolean(summary || caseType || fields.konu || analysisText);

  return (
    <div className="premium-scope min-h-screen px-6 sm:px-10 md:px-16 pb-12">
      <div className="glass p-6 sm:p-8 rounded-2xl">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-accent">
              Dava Analizi
            </h2>
            <p className="text-sm text-subtle mt-2">
              Dosyanı yükle, sistem özet çıkarsın ve temel dava bilgilerini kutucuklara ayırsın.
            </p>

            {fileName ? (
              <p className="text-sm text-muted mt-4">
                Seçilen dosya:{" "}
                <span className="text-accent font-semibold">{fileName}</span>
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 items-center">
            <label className="px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 cursor-pointer text-sm font-medium">
              Dosya Seç
              <input
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setErrorMsg("");
                  if (!f) {
                    setFile(null);
                    setFileName("");
                    return;
                  }
                  const lower = f.name.toLowerCase();
                  const okExt = ALLOWED_EXTS.some((ext) => lower.endsWith(ext));
                  if (!okExt) {
                    setFile(null);
                    setFileName("");
                    setErrorMsg("Desteklenmeyen dosya türü. PDF, DOCX veya TXT yükleyin.");
                    return;
                  }
                  if (f.size > MAX_FILE_BYTES) {
                    setFile(null);
                    setFileName("");
                    setErrorMsg(`Dosya çok büyük (maks. ${prettyBytes(MAX_FILE_BYTES)}).`);
                    return;
                  }
                  setFile(f);
                  setFileName(f.name);
                  // Önceki sonuçlar karışmasın diye temizle.
                  setAnalysisText("");
                  setSummary("");
                  setCaseType("");
                  setStructured(null);
                }}
              />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-5 py-2 rounded-xl font-semibold text-black bg-accent hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Analiz..." : "Analiz Et"}
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/40 bg-red-950/40 text-red-100 text-sm px-4 py-3"
          >
            {errorMsg}
          </div>
        ) : null}

        {/* RESULTS */}
        {hasResult && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: TEMEL BİLGİLER */}
            <div className="lg:col-span-1">
              <div className="text-sm font-semibold mb-3">Temel Bilgiler</div>

              {caseType ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold mb-4">
                  {caseType}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="glass p-4 rounded-xl">
                  <div className="text-xs text-subtle mb-1">Davacı</div>
                  <div className="text-sm font-semibold text-fg">{fields.davaci}</div>
                </div>

                <div className="glass p-4 rounded-xl">
                  <div className="text-xs text-subtle mb-1">Davalı</div>
                  <div className="text-sm font-semibold text-fg">{fields.davali}</div>
                </div>

                <div className="glass p-4 rounded-xl">
                  <div className="text-xs text-subtle mb-1">Mahkeme</div>
                  <div className="text-sm font-semibold text-fg">{fields.mahkeme}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl">
                    <div className="text-xs text-subtle mb-1">Dosya No</div>
                    <div className="text-sm font-semibold text-fg">{fields.dosya_no || "—"}</div>
                  </div>
                  <div className="glass p-4 rounded-xl">
                    <div className="text-xs text-subtle mb-1">Evrak No</div>
                    <div className="text-sm font-semibold text-fg">{fields.evrak_no || "—"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl">
                    <div className="text-xs text-subtle mb-1">Esas No</div>
                    <div className="text-sm font-semibold text-fg">{fields.esas}</div>
                  </div>

                  <div className="glass p-4 rounded-xl">
                    <div className="text-xs text-subtle mb-1">Karar No</div>
                    <div className="text-sm font-semibold text-fg">{fields.karar}</div>
                  </div>
                </div>

                {fields.konu ? (
                  <div className="glass p-4 rounded-xl">
                    <div className="text-xs text-subtle mb-1">Dava Konusu</div>
                    <div className="text-sm text-fg">{fields.konu}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* RIGHT: DAVA ÖZETİ */}
            <div className="lg:col-span-2">
              <div className="glass p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-xl font-bold text-accent">Dava Özeti</h3>

                  {caseType ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold">
                      {caseType}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 text-sm text-fg leading-relaxed whitespace-pre-line">
                  {summary || "Özet üretilemedi."}
                </div>
              </div>

              {/* DETAILED STRATEGIC ANALYSIS */}
              {analysisText && (
                <div className="mt-6 glass p-6 rounded-2xl border border-white/10">
                  <h3 className="text-xl font-bold text-accent mb-4">
                    Detaylı Stratejik Analiz
                  </h3>
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-fg/90">
                    <ReactMarkdown>{analysisText}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 mb-6 text-center text-xs text-subtle">
         Yapay zekâ hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu lütfen kontrol edin.
      </footer>
    </div>
  );
}
