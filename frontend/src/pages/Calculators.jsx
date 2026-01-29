// src/pages/Calculators.jsx
import React, { useState } from "react";

// Para gösterimi (çıktılar): 10.000,00 gibi
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Input formatlama (girilen tutarlar): 15000 -> 15.000
const formatMoneyInput = (raw) => {
  if (!raw) return "";
  // Sadece rakam ve virgül kalsın
  const cleaned = raw.replace(/[^\d,]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(",");
  let intPart = parts[0] || "";
  const decPart = parts[1] || "";

  // Baştaki gereksiz sıfırları kırp
  intPart = intPart.replace(/^0+(\d)/, "$1");

  const intNum = parseInt(intPart || "0", 10);
  if (isNaN(intNum)) return "";

  const formattedInt = intNum.toLocaleString("tr-TR");
  return decPart ? `${formattedInt},${decPart.slice(0, 2)}` : formattedInt;
};

// Basit tarih farkı (gün) – GG.AA.YYYY
const diffInDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start.split(".").reverse().join("-"));
  const e = new Date(end.split(".").reverse().join("-"));
  const ms = e - s;
  if (isNaN(ms)) return 0;
  return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
};

// AA.YYYY formatında ay farkı (dahil)
const parseMonthYear = (s) => {
  if (!s) return null;
  const parts = s.includes(".") ? s.split(".") : s.split("/");
  if (parts.length !== 2) return null;
  const [mStr, yStr] = parts;
  const month = parseInt(mStr, 10);
  const year = parseInt(yStr, 10);
  if (!month || !year || month < 1 || month > 12) return null;
  return { month, year };
};

const monthDiffInclusive = (start, end) => {
  const s = parseMonthYear(start);
  const e = parseMonthYear(end);
  if (!s || !e) return 0;
  const diff = (e.year - s.year) * 12 + (e.month - s.month);
  return diff >= 0 ? diff + 1 : 0;
};

const CalculatorSection = ({ title, description, isOpen, onToggle, children }) => {
  return (
    <div
      style={{
        marginBottom: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          color: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          {description && (
            <div
              style={{
                fontSize: 12,
                opacity: 0.65,
                marginTop: 3,
                textAlign: "left",
              }}
            >
              {description}
            </div>
          )}
        </div>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          {isOpen ? "−" : "+"}
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.10)",
            padding: "18px 20px 20px",
            background: "rgba(0,0,0,0.55)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default function Calculators() {
  const [openSection, setOpenSection] = useState("faiz");

  // 1) Faiz Hesabı
  const [interestMode, setInterestMode] = useState("yasal"); // yasal | ticari | avans | anlasmali
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rate, setRate] = useState("");
  const [faizResult, setFaizResult] = useState(null);

  // 2) Vekalet ücreti
  const [disputeValue, setDisputeValue] = useState("");
  const [vekaletResult, setVekaletResult] = useState(null);

  // 3) Harç
  const [harcValue, setHarcValue] = useState("");
  const [harcResult, setHarcResult] = useState(null);

  // 4) KDV
  const [kdvBase, setKdvBase] = useState("");
  const [kdvRate, setKdvRate] = useState("20");
  const [kdvResult, setKdvResult] = useState(null);

  // 5) İcra İnkar Tazminatı
  const [inkarBase, setInkarBase] = useState("");
  const [inkarRate, setInkarRate] = useState("20"); // %20 default
  const [inkarResult, setInkarResult] = useState(null);

  // 6) Gecikmiş Kira
  const [rentAmount, setRentAmount] = useState("");
  const [rentStart, setRentStart] = useState("");
  const [rentEnd, setRentEnd] = useState("");
  const [rentResult, setRentResult] = useState(null);

  // 7) Taksitli Ödeme Planı
  const [instPrincipal, setInstPrincipal] = useState("");
  const [instRate, setInstRate] = useState("");
  const [instMonths, setInstMonths] = useState("");
  const [instResult, setInstResult] = useState(null);

  // ----------------- HESAPLAMALAR -----------------

  const handleFaizCalc = () => {
    const p = parseFloat(principal.replace(/\./g, "").replace(",", "."));
    const r = parseFloat(rate.replace(",", "."));
    if (!p || !r || !startDate || !endDate) {
      setFaizResult(null);
      return;
    }
    const days = diffInDays(startDate, endDate);
    const interest = (p * r * days) / (365 * 100); // basit faiz
    const total = p + interest;
    const totalPercent = (interest / p) * 100;
    const dailyRatePercent = r / 365;
    setFaizResult({
      days,
      interest,
      total,
      totalPercent,
      dailyRatePercent,
    });
  };

  const handleVekaletCalc = () => {
    const val = parseFloat(disputeValue.replace(/\./g, "").replace(",", "."));
    if (!val || isNaN(val)) {
      setVekaletResult(5000);
      return;
    }
    // Örnek: %10 ama min 5.000
    const fee = Math.max(val * 0.1, 5000);
    setVekaletResult(fee);
  };

  const handleHarcCalc = () => {
    const val = parseFloat(harcValue.replace(/\./g, "").replace(",", "."));
    if (!val || isNaN(val)) {
      setHarcResult(null);
      return;
    }
    // Örnek olarak sabit oran; gerçek oranı backend'den parametreleyeceksin
    const harc = val * 0.0683;
    setHarcResult(harc);
  };

  const handleKdvCalc = () => {
    const base = parseFloat(kdvBase.replace(/\./g, "").replace(",", "."));
    const rateNum = parseFloat(kdvRate.replace(",", "."));
    if (!base || !rateNum) {
      setKdvResult(null);
      return;
    }
    const tax = (base * rateNum) / 100;
    const total = base + tax;
    setKdvResult({ tax, total });
  };

  const handleInkarCalc = () => {
    const base = parseFloat(inkarBase.replace(/\./g, "").replace(",", "."));
    const r = parseFloat(inkarRate.replace(",", "."));
    if (!base || !r) {
      setInkarResult(null);
      return;
    }
    const tazminat = (base * r) / 100;
    setInkarResult(tazminat);
  };

  const handleRentCalc = () => {
    const monthly = parseFloat(rentAmount.replace(/\./g, "").replace(",", "."));
    const months = monthDiffInclusive(rentStart, rentEnd);
    if (!monthly || !months) {
      setRentResult(null);
      return;
    }
    const total = monthly * months;
    setRentResult({ months, total });
  };

  const handleInstallmentCalc = () => {
    const P = parseFloat(instPrincipal.replace(/\./g, "").replace(",", "."));
    const rMonthly = parseFloat(instRate.replace(",", ".")) / 100;
    const n = parseInt(instMonths, 10);
    if (!P || !rMonthly || !n) {
      setInstResult(null);
      return;
    }
    const payment =
      (P * rMonthly) / (1 - Math.pow(1 + rMonthly, -Math.abs(n || 0)));
    const total = payment * n;
    const interest = total - P;
    setInstResult({ payment, total, interest });
  };

  const commonInputStyle = {
    width: "100%",
    padding: "8px 10px",
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #555",
    background: "#111",
    color: "#f5f5f5",
    fontSize: 14,
  };

  const labelStyle = { fontSize: 13, opacity: 0.8 };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 18px 32px" }}>
      <h2 style={{ fontSize: 20, marginBottom: 14 }}>Hesaplamalar</h2>

      {/* 1) FAİZ HESABI */}
      <CalculatorSection
        title="Faiz Hesabı"
        description="Ana alacak, tarih aralığı ve faiz oranına göre basit faiz hesabı."
        isOpen={openSection === "faiz"}
        onToggle={() => setOpenSection(openSection === "faiz" ? null : "faiz")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Faiz Türü</label>
            <select
              style={commonInputStyle}
              value={interestMode}
              onChange={(e) => setInterestMode(e.target.value)}
            >
              <option value="yasal">Yasal Faiz</option>
              <option value="ticari">Ticari Faiz</option>
              <option value="avans">Avans Faizi</option>
              <option value="anlasmali">Sözleşmesel / Özel Oran</option>
            </select>

            <label style={labelStyle}>Ana Para (₺)</label>
            <input
              style={commonInputStyle}
              value={principal}
              onChange={(e) => setPrincipal(formatMoneyInput(e.target.value))}
              placeholder="Örn: 15.000"
            />

            <label style={labelStyle}>Başlangıç Tarihi</label>
            <input
              style={commonInputStyle}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="GG.AA.YYYY  örn: 14.06.2018"
            />

            <label style={labelStyle}>Bitiş Tarihi</label>
            <input
              style={commonInputStyle}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="GG.AA.YYYY  örn: 10.12.2025"
            />

            <label style={labelStyle}>
              Yıllık Faiz Oranı (%){" "}
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                (Güncel yasal/ticari oranı kendin gir)
              </span>
            </label>
            <input
              style={commonInputStyle}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Örn: 12"
            />

            <button
              onClick={handleFaizCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#22c55e,#16a34a)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {faizResult ? (
              <>
                <div>
                  <strong>Gün sayısı:</strong> {faizResult.days}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam faiz tutarı:</strong> ₺{" "}
                  {formatCurrency(faizResult.interest)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam borç (ana para + faiz):</strong> ₺{" "}
                  {formatCurrency(faizResult.total)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam faiz yüzdesi:</strong>{" "}
                  {faizResult.totalPercent.toFixed(2)}%
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Günlük faiz oranı (yaklaşık):</strong>{" "}
                  {faizResult.dailyRatePercent.toFixed(4)}%
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  Not: Hesaplama basit faiz üzerinden yapılır. Resmi oranlar
                  değişebildiği için, faiz oranını her zaman manuel girmen
                  gerekir.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Sol tarafta bilgileri doldurup &quot;Hesapla&quot; butonuna basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 2) VEKÂLET ÜCRETİ */}
      <CalculatorSection
        title="Vekalet Ücreti"
        description="Uyuşmazlık değeri üzerinden vekalet ücreti hesabı."
        isOpen={openSection === "vekalet"}
        onToggle={() =>
          setOpenSection(openSection === "vekalet" ? null : "vekalet")
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Uyuşmazlık Değeri (₺)</label>
            <input
              style={commonInputStyle}
              value={disputeValue}
              onChange={(e) => setDisputeValue(formatMoneyInput(e.target.value))}
              placeholder="Örn: 200.000"
            />
            <button
              onClick={handleVekaletCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#3b82f6,#2563eb)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {vekaletResult !== null ? (
              <>
                <div>
                  <strong>Hesaplanan Vekalet Ücreti:</strong> ₺{" "}
                  {formatCurrency(vekaletResult)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Not: Bu sadece örnek hesaplamadır. Gerçek hesap için Türkiye
                  Barolar Birliği&apos;nin güncel vekalet ücreti tarifesini
                  kullanman gerekir.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Uyuşmazlık değerini girip &quot;Hesapla&quot; butonuna basın.
                Değer girilmezse asgari 5.000 ₺ gösterilir.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 3) HARÇ HESABI */}
      <CalculatorSection
        title="Harç Hesabı"
        description="Uyuşmazlık değerine göre tahmini harç tutarı."
        isOpen={openSection === "harc"}
        onToggle={() => setOpenSection(openSection === "harc" ? null : "harc")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Uyuşmazlık Değeri (₺)</label>
            <input
              style={commonInputStyle}
              value={harcValue}
              onChange={(e) => setHarcValue(formatMoneyInput(e.target.value))}
              placeholder="Örn: 100.000"
            />
            <button
              onClick={handleHarcCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#f97316,#ea580c)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {harcResult !== null ? (
              <>
                <div>
                  <strong>Tahmini Harç:</strong> ₺ {formatCurrency(harcResult)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Not: Bu alan, kullanacağın gerçek oranlara göre uyarlanmalıdır.
                  Harç oranlarını backend tarafında parametrelemeyi unutma.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Değeri girip &quot;Hesapla&quot; butonuna basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 4) KDV HESABI */}
      <CalculatorSection
        title="KDV Hesabı"
        description="Net tutar ve KDV oranına göre vergi ve toplam tutarı hesapla."
        isOpen={openSection === "kdv"}
        onToggle={() => setOpenSection(openSection === "kdv" ? null : "kdv")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Tutar (₺)</label>
            <input
              style={commonInputStyle}
              value={kdvBase}
              onChange={(e) => setKdvBase(formatMoneyInput(e.target.value))}
              placeholder="Örn: 10.000"
            />

            <label style={labelStyle}>KDV Oranı (%)</label>
            <input
              style={commonInputStyle}
              value={kdvRate}
              onChange={(e) => setKdvRate(e.target.value)}
              placeholder="Örn: 20"
            />

            <button
              onClick={handleKdvCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#a855f7,#7c3aed)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {kdvResult !== null ? (
              <>
                <div>
                  <strong>KDV Tutarı:</strong> ₺ {formatCurrency(kdvResult.tax)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam (KDV Dahil):</strong> ₺{" "}
                  {formatCurrency(kdvResult.total)}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Tutar ve oran girip &quot;Hesapla&quot; butonuna basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 5) İCRA İNKAR TAZMİNATI */}
      <CalculatorSection
        title="İcra İnkar Tazminatı"
        description="Uyuşmazlık değeri ve oran üzerinden icra inkar tazminatı hesabı."
        isOpen={openSection === "inkar"}
        onToggle={() =>
          setOpenSection(openSection === "inkar" ? null : "inkar")
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Uyuşmazlık Değeri (₺)</label>
            <input
              style={commonInputStyle}
              value={inkarBase}
              onChange={(e) => setInkarBase(formatMoneyInput(e.target.value))}
              placeholder="Örn: 50.000"
            />

            <label style={labelStyle}>Tazminat Oranı (%)</label>
            <input
              style={commonInputStyle}
              value={inkarRate}
              onChange={(e) => setInkarRate(e.target.value)}
              placeholder="Örn: 20"
            />

            <button
              onClick={handleInkarCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#ec4899,#db2777)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {inkarResult !== null ? (
              <>
                <div>
                  <strong>İcra İnkar Tazminatı:</strong> ₺{" "}
                  {formatCurrency(inkarResult)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Not: Oranı (örn. %20) kendin belirlemelisin. İlgili dosya türüne
                  göre kanuni sınırlar değişebilir.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Değeri ve oranı girip &quot;Hesapla&quot; butonuna basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 6) GECİKMİŞ KİRA HESABI */}
      <CalculatorSection
        title="Gecikmiş Kira Hesabı"
        description="Aylık kira ve ay sayısına göre toplam gecikmiş kira hesabı."
        isOpen={openSection === "kira"}
        onToggle={() => setOpenSection(openSection === "kira" ? null : "kira")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Aylık Kira (₺)</label>
            <input
              style={commonInputStyle}
              value={rentAmount}
              onChange={(e) => setRentAmount(formatMoneyInput(e.target.value))}
              placeholder="Örn: 15.000"
            />

            <label style={labelStyle}>Başlangıç Ayı</label>
            <input
              style={commonInputStyle}
              value={rentStart}
              onChange={(e) => setRentStart(e.target.value)}
              placeholder="AA.YYYY  örn: 06.2022"
            />

            <label style={labelStyle}>Bitiş Ayı</label>
            <input
              style={commonInputStyle}
              value={rentEnd}
              onChange={(e) => setRentEnd(e.target.value)}
              placeholder="AA.YYYY  örn: 12.2025"
            />

            <button
              onClick={handleRentCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#0ea5e9,#0284c7)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {rentResult ? (
              <>
                <div>
                  <strong>Ay sayısı:</strong> {rentResult.months}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam Gecikmiş Kira:</strong> ₺{" "}
                  {formatCurrency(rentResult.total)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Not: Faiz ve endeks farkı dahil değildir; sadece kira
                  çarpımıdır.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Aylık tutar ve ay aralığını girip &quot;Hesapla&quot;ya basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      {/* 7) TAKSİTLİ ÖDEME PLANI */}
      <CalculatorSection
        title="Taksitli Ödeme Planı"
        description="Ana para, aylık faiz ve taksit sayısına göre sabit taksit hesabı."
        isOpen={openSection === "taksit"}
        onToggle={() =>
          setOpenSection(openSection === "taksit" ? null : "taksit")
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Ana Para (₺)</label>
            <input
              style={commonInputStyle}
              value={instPrincipal}
              onChange={(e) =>
                setInstPrincipal(formatMoneyInput(e.target.value))
              }
              placeholder="Örn: 100.000"
            />

            <label style={labelStyle}>Aylık Faiz Oranı (%)</label>
            <input
              style={commonInputStyle}
              value={instRate}
              onChange={(e) => setInstRate(e.target.value)}
              placeholder="Örn: 2"
            />

            <label style={labelStyle}>Taksit Sayısı (Ay)</label>
            <input
              style={commonInputStyle}
              value={instMonths}
              onChange={(e) => setInstMonths(e.target.value)}
              placeholder="Örn: 24"
            />

            <button
              onClick={handleInstallmentCalc}
              style={{
                marginTop: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#22c55e,#84cc16)",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Hesapla
            </button>
          </div>

          <div style={{ fontSize: 14 }}>
            {instResult ? (
              <>
                <div>
                  <strong>Aylık Taksit:</strong> ₺{" "}
                  {formatCurrency(instResult.payment)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam Ödenecek Tutar:</strong> ₺{" "}
                  {formatCurrency(instResult.total)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Toplam Faiz:</strong> ₺{" "}
                  {formatCurrency(instResult.interest)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Not: Standart annuiteli kredi formülü kullanılmıştır. Erken
                  ödeme, değişken faiz vb. durumlar hesaba katılmaz.
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>
                Ana para, oran ve taksit sayısını girip &quot;Hesapla&quot;ya
                basın.
              </div>
            )}
          </div>
        </div>
      </CalculatorSection>

      <div
        style={{
          marginTop: 18,
          fontSize: 11,
          textAlign: "center",
          opacity: 0.7,
        }}
      >
        ⚠ Otomatik hesaplamalar ve yapay zekâ hatalı sonuç verebilir. Önemli
        işlemler öncesinde resmi mevzuat ve güncel tarifeleri mutlaka kontrol
        edin.
      </div>
    </div>
  );
}
