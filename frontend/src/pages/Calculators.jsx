import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "../auth/api";

const FONT_SANS = "'IBM Plex Sans', sans-serif";
const FONT_DISPLAY = "'Abril Fatface', serif";
const FONT_SERIF = "'Libre Baskerville', serif";

const TABS = [
  { key: "faiz",       label: "Faiz",          ref: "BK m.88" },
  { key: "kidem",      label: "Kıdem / İhbar",  ref: "İK m.14-17" },
  { key: "iscilik",    label: "İşçilik",         ref: "İK m.63" },
  { key: "kira",       label: "Kira Artış",      ref: "TBK m.344" },
  { key: "netmaas",    label: "Net Maaş",        ref: "GVK m.103" },
  { key: "iseiade",    label: "İşe İade",        ref: "İK m.21" },
  { key: "kotuniyet",  label: "Kötü Niyet",      ref: "İK m.17" },
  { key: "zamanasimi", label: "Zamanaşımı",       ref: "TBK m.147" },
  { key: "harc",       label: "Harç / Vekalet",  ref: "492 SK" },
  { key: "icra",       label: "İcra Masrafı",    ref: "İİK m.59" },
];

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (typeof v === "number") {
    return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
};

const NON_MONETARY_KEYS = new Set([
  "days", "notice_weeks", "total_years", "days_left", "rate",
  "max_legal_rate", "applied_rate", "compensation_months",
  "expiry_date", "start_date", "is_expired", "capped",
]);

const normalize = (data, primaryKey, labelMap) => ({
  primary: data[primaryKey],
  primaryKey,
  primaryLabel: labelMap[primaryKey] || primaryKey,
  rows: Object.entries(data)
    .filter(([k, v]) => {
      if (k === primaryKey) return false;
      if (v === null || v === undefined) return false;
      if (typeof v === "object") return false;
      return true;
    })
    .map(([k, v]) => ({ key: k, label: labelMap[k] || k.replace(/_/g, " "), value: v })),
});

// ── design atoms ─────────────────────────────────────────────────────────────

const cardStyle = {
  background: "#0a0a0a",
  border: "0.5px solid #1e1e1e",
  borderRadius: 14,
  padding: "28px 24px",
};

const inputWrap = { display: "flex", flexDirection: "column", gap: 5 };

const labelStyle = {
  fontSize: 11,
  color: "#888",
  fontFamily: FONT_SERIF,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const inputStyle = {
  background: "#111",
  border: "0.5px solid #1e1e1e",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#fff",
  fontSize: 14,
  fontFamily: FONT_SANS,
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const calcBtnStyle = {
  background: "linear-gradient(90deg, #ebac00, #b88700)",
  border: "none",
  borderRadius: 8,
  padding: "12px 24px",
  color: "#000",
  fontSize: 13,
  fontFamily: FONT_SANS,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.02em",
  marginTop: 8,
};

const secBtnStyle = {
  ...calcBtnStyle,
  background: "#1a1a1a",
  color: "#888",
  border: "0.5px solid #2a2a2a",
};

const refBadge = (ref) => (
  <span style={{
    fontSize: 10, color: "#555", border: "0.5px solid #2a2a2a",
    borderRadius: 4, padding: "2px 7px", fontFamily: FONT_SANS,
    letterSpacing: "0.03em",
  }}>{ref}</span>
);

// ── Field + Input atoms ───────────────────────────────────────────────────────

const Field = ({ label, children }) => (
  <div style={inputWrap}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const NumInput = ({ value, onChange, placeholder, min, max, step = 1 }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onChange(Number(e.target.value))}
    placeholder={placeholder}
    style={inputStyle}
    onFocus={(e) => (e.target.style.borderColor = "#ebac00")}
    onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
  />
);

const DateInput = ({ value, onChange }) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ ...inputStyle, colorScheme: "dark" }}
    onFocus={(e) => (e.target.style.borderColor = "#ebac00")}
    onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
  />
);

// ── label maps ────────────────────────────────────────────────────────────────

const FAIZ_LABELS = {
  total: "Genel Toplam", interest: "Faiz Tutarı",
  principal: "Anapara", amount: "Anapara", days: "Gün Sayısı",
};
const KIDEM_LABELS = {
  gross_severance: "Kıdem Tazminatı (Brüt)", total_years: "Toplam Süre (Yıl)",
  capped: "Tavan Uygulandı", notice_pay: "İhbar Tazminatı", notice_weeks: "İhbar Süresi (Hafta)",
};
const ISCILIK_LABELS = {
  total: "Toplam İşçilik Alacağı", overtime_pay: "Fazla Mesai Ücreti",
  gross_severance: "Kıdem Tazminatı", notice_pay: "İhbar Tazminatı",
  hourly_rate: "Saatlik Ücret", notice_weeks: "İhbar Süresi (Hafta)",
};
const KIRA_LABELS = {
  new_rent: "Yeni Kira Tutarı", increase_amount: "Artış Miktarı",
  max_legal_rate: "Azami Yasal Oran (%)", current_rent: "Mevcut Kira", applied_rate: "Uygulanan Oran (%)",
};
const NETMAAS_LABELS = {
  net_salary: "Net Maaş", gross_salary: "Brüt Maaş",
  sgk_employee: "SGK İşçi Payı (%14)", unemployment: "İşsizlik Sigortası (%1)",
  income_tax: "Gelir Vergisi", stamp_tax: "Damga Vergisi", tax_base: "Vergi Matrahı",
};
const ISEIADE_LABELS = {
  total: "Toplam Alacak", reinstatement_pay: "İşe İade Tazminatı",
  idle_period_pay: "Boşta Geçen Süre Ücreti", compensation_months: "Tazminat Ayı",
};
const KOTUNIYET_LABELS = {
  bad_faith_compensation: "Kötü Niyet Tazminatı",
  notice_weeks: "İhbar Süresi (Hafta)", daily_wage: "Günlük Ücret",
};
const ZAMANASIMI_LABELS = {
  expiry_date: "Zamanaşımı Tarihi", days_left: "Kalan Gün", is_expired: "Süre Doldu mu",
};
const HARC_LABELS = {
  fee: "Hesaplanan Tutar", amount_in_dispute: "Uyuşmazlık Miktarı", rate: "Oran (%)",
};
const ICRA_LABELS = {
  total: "Toplam", fee: "İcra Masrafı", tax: "Vergi", principal: "Anapara",
};

// ── Form Components ───────────────────────────────────────────────────────────

function FaizForm({ onCalc, loading }) {
  const [type, setType] = useState("faiz-basit");
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(36);
  const [start, setStart] = useState("2024-01-01");
  const [end, setEnd] = useState("2024-12-31");
  const [cpY, setCpY] = useState(12);

  const FORMULA = {
    "faiz-basit": "I = P × r × (d/365)",
    "faiz-bilesik": "A = P × (1 + r/n)^(n×t)",
    "faiz-ticari": "I = P × r × (d/365) — Ticari faiz",
    "faiz-temerrut": "I = P × r × (d/365) — Temerrüt faizi",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { key: "faiz-basit", label: "Basit" },
          { key: "faiz-bilesik", label: "Bileşik" },
          { key: "faiz-ticari", label: "Ticari" },
          { key: "faiz-temerrut", label: "Temerrüt" },
        ].map((s) => (
          <button key={s.key} onClick={() => setType(s.key)} style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12, fontFamily: FONT_SANS, cursor: "pointer",
            background: type === s.key ? "rgba(235,172,0,0.12)" : "transparent",
            border: type === s.key ? "0.5px solid #ebac00" : "0.5px solid #2a2a2a",
            color: type === s.key ? "#fff" : "#555",
          }}>{s.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Anapara ₺"><NumInput value={principal} onChange={setPrincipal} /></Field>
        <Field label="Yıllık Faiz Oranı %"><NumInput value={rate} onChange={setRate} step={0.01} /></Field>
        <Field label="Başlangıç Tarihi"><DateInput value={start} onChange={setStart} /></Field>
        <Field label="Bitiş Tarihi"><DateInput value={end} onChange={setEnd} /></Field>
        {type === "faiz-bilesik" && (
          <Field label="Yıllık Bileşik Sayısı"><NumInput value={cpY} onChange={setCpY} /></Field>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS }}>{FORMULA[type]}</div>
      <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
        `/calc/${type}`,
        { principal, annual_rate: rate, start_date: start, end_date: end, compounds_per_year: cpY },
        "total", FAIZ_LABELS
      )}>{loading ? "Hesaplanıyor..." : "Faiz Hesapla"}</button>
    </div>
  );
}

function KidemForm({ onCalc, loading }) {
  const [salary, setSalary] = useState(30000);
  const [years, setYears] = useState(5);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);
  const [cap, setCap] = useState("");
  const [yearsW, setYearsW] = useState(5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Aylık Brüt Ücret ₺"><NumInput value={salary} onChange={setSalary} /></Field>
        <Field label="Kıdem Tavanı ₺ (opsiyonel)">
          <input type="number" value={cap} onChange={(e) => setCap(e.target.value)}
            placeholder="Boş = tavansız" style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "#ebac00")}
            onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")} />
        </Field>
        <Field label="Hizmet Yılı"><NumInput value={years} onChange={setYears} min={0} /></Field>
        <Field label="Ay"><NumInput value={months} onChange={setMonths} min={0} max={11} /></Field>
        <Field label="Gün"><NumInput value={days} onChange={setDays} min={0} max={30} /></Field>
        <Field label="İhbar — Çalışma Yılı"><NumInput value={yearsW} onChange={setYearsW} min={0} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS }}>
        Kıdem = Aylık × Yıl (tavan dahil) · İhbar = Haftalık × Hafta
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
          "/calc/kidem", { monthly_salary: salary, years, months, days, cap: cap ? Number(cap) : null },
          "gross_severance", KIDEM_LABELS
        )}>{loading ? "..." : "Kıdem Hesapla"}</button>
        <button style={secBtnStyle} disabled={loading} onClick={() => onCalc(
          "/calc/ihbar", { monthly_salary: salary, years_worked: yearsW },
          "notice_pay", KIDEM_LABELS
        )}>İhbar Hesapla</button>
      </div>
    </div>
  );
}

function IscilikForm({ onCalc, loading }) {
  const [salary, setSalary] = useState(30000);
  const [hours, setHours] = useState(20);
  const [mult, setMult] = useState(1.5);
  const [years, setYears] = useState(5);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);
  const [yearsW, setYearsW] = useState(5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Aylık Brüt Ücret ₺"><NumInput value={salary} onChange={setSalary} /></Field>
        <Field label="Fazla Mesai Saati"><NumInput value={hours} onChange={setHours} min={0} /></Field>
        <Field label="Mesai Katsayısı"><NumInput value={mult} onChange={setMult} step={0.5} min={1} /></Field>
        <Field label="Kıdem Yılı"><NumInput value={years} onChange={setYears} min={0} /></Field>
        <Field label="Kıdem Ayı"><NumInput value={months} onChange={setMonths} min={0} max={11} /></Field>
        <Field label="Kıdem Günü"><NumInput value={days} onChange={setDays} min={0} max={30} /></Field>
        <Field label="İhbar Çalışma Yılı"><NumInput value={yearsW} onChange={setYearsW} min={0} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS }}>
        Saatlik = Aylık/225 · Mesai = Saatlik × Saat × Katsayı
      </div>
      <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
        { monthly_salary: salary, overtime_hours: hours, overtime_multiplier: mult, years, months, days, years_worked: yearsW }
      )}>{loading ? "Hesaplanıyor..." : "İşçilik Alacakları Hesapla"}</button>
    </div>
  );
}

function KiraForm({ onCompute }) {
  const [current, setCurrent] = useState(15000);
  const [tufe, setTufe] = useState(40);
  const [offered, setOffered] = useState(50);

  const compute = () => {
    const appliedRate = Math.min(tufe, offered);
    const newRent = current * (1 + appliedRate / 100);
    onCompute({
      new_rent: newRent, increase_amount: newRent - current,
      max_legal_rate: tufe, current_rent: current, applied_rate: appliedRate,
    }, "new_rent", KIRA_LABELS);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Mevcut Kira ₺"><NumInput value={current} onChange={setCurrent} min={0} /></Field>
        <Field label="TÜFE 12 Aylık Ortalama %"><NumInput value={tufe} onChange={setTufe} step={0.01} min={0} /></Field>
        <Field label="Teklif Edilen Artış %"><NumInput value={offered} onChange={setOffered} step={0.01} min={0} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS }}>
        TBK m.344: Artış TÜFE 12 aylık ortalamasını aşamaz.
        Yeni Kira = Mevcut × (1 + min(TÜFE, Teklif) / 100)
      </div>
      <button style={calcBtnStyle} onClick={compute}>Kira Artışını Hesapla</button>
    </div>
  );
}

function calcIncomeTax(base) {
  const brackets = [
    { limit: 158000, rate: 0.15, prev: 0 },
    { limit: 330000, rate: 0.20, prev: 158000 },
    { limit: 800000, rate: 0.27, prev: 330000 },
    { limit: 4300000, rate: 0.35, prev: 800000 },
    { limit: Infinity, rate: 0.40, prev: 4300000 },
  ];
  let tax = 0;
  for (const b of brackets) {
    if (base <= b.prev) break;
    const taxable = Math.min(base, b.limit) - b.prev;
    tax += taxable * b.rate;
    if (base <= b.limit) break;
  }
  return tax;
}

function NetMaasForm({ onCompute }) {
  const [gross, setGross] = useState(50000);

  const compute = () => {
    const sgk = gross * 0.14;
    const unemp = gross * 0.01;
    const taxBase = gross - sgk - unemp;
    const incomeTax = calcIncomeTax(taxBase);
    const stampTax = gross * 0.00759;
    const net = gross - sgk - unemp - incomeTax - stampTax;
    onCompute({
      net_salary: net, gross_salary: gross, sgk_employee: sgk,
      unemployment: unemp, tax_base: taxBase, income_tax: incomeTax, stamp_tax: stampTax,
    }, "net_salary", NETMAAS_LABELS);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Aylık Brüt Ücret ₺">
        <NumInput value={gross} onChange={setGross} min={0} />
      </Field>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS, lineHeight: 1.7 }}>
        SGK İşçi %14 · İşsizlik %1 · Gelir Vergisi (2025: 158k→%15, 330k→%20, 800k→%27, 4.3M→%35, üstü→%40) · Damga %0.759
      </div>
      <button style={calcBtnStyle} onClick={compute}>Net Maaş Hesapla</button>
    </div>
  );
}

function getNoticeWeeks(yearsWorked) {
  const m = yearsWorked * 12;
  if (m < 6) return 2;
  if (m < 18) return 4;
  if (m < 36) return 6;
  return 8;
}

function IseIadeForm({ onCompute }) {
  const [salary, setSalary] = useState(30000);
  const [compMonths, setCompMonths] = useState(4);

  const compute = () => {
    const reinstatement = salary * compMonths;
    const idle = salary * 4;
    onCompute({
      total: reinstatement + idle, reinstatement_pay: reinstatement,
      idle_period_pay: idle, compensation_months: compMonths,
    }, "total", ISEIADE_LABELS);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Aylık Brüt Ücret ₺"><NumInput value={salary} onChange={setSalary} min={0} /></Field>
        <Field label="Tazminat Ayı (4–8)"><NumInput value={compMonths} onChange={setCompMonths} min={4} max={8} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS, lineHeight: 1.7 }}>
        İK m.21: Tazminat min 4, max 8 aylık brüt ücret. Boşta geçen süre maks 4 ay.
      </div>
      <button style={calcBtnStyle} onClick={compute}>İşe İade Hesapla</button>
    </div>
  );
}

function KotuNiyetForm({ onCompute }) {
  const [salary, setSalary] = useState(30000);
  const [yearsWorked, setYearsWorked] = useState(3);

  const compute = () => {
    const weeks = getNoticeWeeks(yearsWorked);
    const daily = salary / 30;
    onCompute({
      bad_faith_compensation: 3 * weeks * 7 * daily,
      notice_weeks: weeks, daily_wage: daily,
    }, "bad_faith_compensation", KOTUNIYET_LABELS);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Aylık Brüt Ücret ₺"><NumInput value={salary} onChange={setSalary} min={0} /></Field>
        <Field label="Çalışma Süresi (Yıl)"><NumInput value={yearsWorked} onChange={setYearsWorked} min={0} step={0.5} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS, lineHeight: 1.7 }}>
        İK m.17: Kötü Niyet = 3 × İhbar Süresi × Günlük Ücret
        (&lt;6ay→2hf · 6ay-1.5yıl→4hf · 1.5-3yıl→6hf · &gt;3yıl→8hf)
      </div>
      <button style={calcBtnStyle} onClick={compute}>Kötü Niyet Hesapla</button>
    </div>
  );
}

function ZamanAsimiForm({ onCalc, loading }) {
  const [start, setStart] = useState("2022-01-01");
  const [years, setYears] = useState(5);
  const [months, setMonths] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Başlangıç Tarihi"><DateInput value={start} onChange={setStart} /></Field>
        <Field label="Süre (Yıl)"><NumInput value={years} onChange={setYears} min={0} /></Field>
        <Field label="Süre (Ay)"><NumInput value={months} onChange={setMonths} min={0} max={11} /></Field>
      </div>
      <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
        "/calc/zamanasimi",
        { start_date: start, period_years: years, period_months: months },
        "expiry_date", ZAMANASIMI_LABELS
      )}>{loading ? "Hesaplanıyor..." : "Zamanaşımı Hesapla"}</button>
    </div>
  );
}

function HarcForm({ onCalc, loading }) {
  const [amount, setAmount] = useState(50000);
  const [rate, setRate] = useState(6.83);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Uyuşmazlık Miktarı ₺"><NumInput value={amount} onChange={setAmount} min={0} /></Field>
        <Field label="Oran %"><NumInput value={rate} onChange={setRate} step={0.01} min={0} /></Field>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
          "/calc/harc", { amount_in_dispute: amount, rate }, "fee", HARC_LABELS
        )}>{loading ? "..." : "Harç Hesapla"}</button>
        <button style={secBtnStyle} disabled={loading} onClick={() => onCalc(
          "/calc/vekalet", { amount_in_dispute: amount, rate }, "fee", HARC_LABELS
        )}>Vekalet Hesapla</button>
      </div>
    </div>
  );
}

function IcraMasrafForm({ onCalc, loading }) {
  const [principal, setPrincipal] = useState(100000);
  const [feeRate, setFeeRate] = useState(10);
  const [taxRate, setTaxRate] = useState(18);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Anapara ₺"><NumInput value={principal} onChange={setPrincipal} min={0} /></Field>
        <Field label="Masraf Oranı %"><NumInput value={feeRate} onChange={setFeeRate} step={0.01} min={0} /></Field>
        <Field label="Vergi Oranı %"><NumInput value={taxRate} onChange={setTaxRate} step={0.01} min={0} /></Field>
      </div>
      <div style={{ fontSize: 11, color: "#3a3a3a", fontFamily: FONT_SANS }}>
        Masraf = Anapara × Masraf Oranı · Vergi = Masraf × Vergi Oranı
      </div>
      <button style={calcBtnStyle} disabled={loading} onClick={() => onCalc(
        "/calc/icra-masraf",
        { principal, fee_rate: feeRate, tax_rate: taxRate },
        "total", ICRA_LABELS
      )}>{loading ? "Hesaplanıyor..." : "İcra Masrafı Hesapla"}</button>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result, loading, error }) {
  const copyToClipboard = () => {
    if (!result) return;
    const lines = [
      `${result.primaryLabel}: ${fmt(result.primary)}`,
      ...result.rows.map((r) => `${r.label}: ${fmt(r.value)}`),
    ].join("\n");
    navigator.clipboard.writeText(lines).catch(() => {});
  };

  return (
    <div style={{ ...cardStyle, minHeight: 260, display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.7} }`}</style>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
          {[70, 55, 45, 40].map((w, i) => (
            <div key={i} style={{
              height: i === 0 ? 36 : 14, width: `${w}%`,
              background: "#1a1a1a", borderRadius: 4,
              animation: "pulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "14px 16px", color: "#f87171",
          fontSize: 13, fontFamily: FONT_SANS,
        }}>{error}</div>
      )}

      {!loading && !error && !result && (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 32, opacity: 0.1 }}>⚖</div>
          <div style={{ fontSize: 13, color: "#333", fontFamily: FONT_SANS, textAlign: "center", lineHeight: 1.6 }}>
            Parametreleri doldurun<br />ve hesapla butonuna basın.
          </div>
        </div>
      )}

      {!loading && !error && result && (
        <AnimatePresence mode="wait">
          <motion.div
            key={String(result.primary)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", flex: 1 }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, color: "#555", fontFamily: FONT_SERIF,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
              }}>
                {result.primaryLabel}
              </div>
              <div style={{
                fontSize: 36, fontFamily: FONT_DISPLAY, lineHeight: 1.1,
                background: "linear-gradient(90deg, #ebac00, #b88700)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {typeof result.primary === "number" && !NON_MONETARY_KEYS.has(result.primaryKey)
                  ? `${fmt(result.primary)} ₺`
                  : fmt(result.primary)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {result.rows.map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0",
                  borderBottom: i < result.rows.length - 1 ? "0.5px solid #161616" : "none",
                }}>
                  <span style={{ fontSize: 12, color: "#444", fontFamily: FONT_SANS }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: "#ccc", fontFamily: FONT_SANS, fontWeight: 500 }}>
                    {typeof row.value === "number" && !NON_MONETARY_KEYS.has(row.key)
                      ? `${fmt(row.value)} ₺`
                      : fmt(row.value)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={copyToClipboard}
              style={{
                marginTop: 20, background: "#111", border: "0.5px solid #1e1e1e",
                borderRadius: 8, padding: "9px 16px", color: "#444",
                fontSize: 12, fontFamily: FONT_SANS, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              ⎘ Kopyala
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Calculators() {
  const [activeTab, setActiveTab] = useState("faiz");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const callCalc = useCallback(async (path, payload, primaryKey, labelMap) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await authFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Hesaplama başarısız.");
      }
      const data = await res.json();
      setResult(normalize(data, primaryKey, labelMap));
    } catch (e) {
      setError(e.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  const computeLocal = useCallback((rawObj, primaryKey, labelMap) => {
    setError("");
    setResult(normalize(rawObj, primaryKey, labelMap));
  }, []);

  const callIscilik = useCallback(async (payload) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await authFetch("/calc/iscilik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Hesaplama başarısız.");
      }
      const data = await res.json();
      const flat = {
        total:           data.total,
        overtime_pay:    data.overtime?.overtime_pay,
        hourly_rate:     data.overtime?.hourly_rate,
        gross_severance: data.severance?.gross_severance,
        notice_pay:      data.notice?.notice_pay,
        notice_weeks:    data.notice?.notice_weeks,
      };
      setResult(normalize(flat, "total", ISCILIK_LABELS));
    } catch (e) {
      setError(e.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  const switchTab = (key) => {
    setActiveTab(key);
    setResult(null);
    setError("");
  };

  const activeTab_ = TABS.find((t) => t.key === activeTab);

  return (
    <div className="premium-scope" style={{ minHeight: "100vh", padding: "80px 24px 60px", fontFamily: FONT_SANS, background: "#000" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 34, lineHeight: 1.1, marginBottom: 10,
            background: "linear-gradient(90deg, #ebac00, #b88700)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Hukuki Hesaplama Motoru
          </h1>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, maxWidth: 520 }}>
            Faiz, kıdem, ihbar, kira artışı, net maaş, işe iade ve icra hesaplamalarını dakika içinde yapın.
            Tüm formüller güncel Türk mevzuatına göre hazırlanmıştır.
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{ overflowX: "auto", marginBottom: 28, paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => switchTab(t.key)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontFamily: FONT_SANS,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                background: activeTab === t.key ? "rgba(235,172,0,0.10)" : "transparent",
                border: activeTab === t.key ? "0.5px solid #ebac00" : "0.5px solid #1e1e1e",
                color: activeTab === t.key ? "#fff" : "#555",
                boxShadow: activeTab === t.key
                  ? "0 0 0 1px rgba(235,172,0,0.12), 0 0 16px rgba(235,172,0,0.06)"
                  : "none",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Two-column */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 1, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Form */}
          <div style={cardStyle}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22,
            }}>
              <div style={{ fontSize: 15, color: "#fff", fontFamily: FONT_SANS, fontWeight: 600 }}>
                {activeTab_?.label}
              </div>
              {activeTab_ && refBadge(activeTab_.ref)}
            </div>

            {activeTab === "faiz"       && <FaizForm onCalc={callCalc} loading={loading} />}
            {activeTab === "kidem"      && <KidemForm onCalc={callCalc} loading={loading} />}
            {activeTab === "iscilik"    && <IscilikForm onCalc={callIscilik} loading={loading} />}
            {activeTab === "kira"       && <KiraForm onCompute={computeLocal} />}
            {activeTab === "netmaas"    && <NetMaasForm onCompute={computeLocal} />}
            {activeTab === "iseiade"    && <IseIadeForm onCompute={computeLocal} />}
            {activeTab === "kotuniyet"  && <KotuNiyetForm onCompute={computeLocal} />}
            {activeTab === "zamanasimi" && <ZamanAsimiForm onCalc={callCalc} loading={loading} />}
            {activeTab === "harc"       && <HarcForm onCalc={callCalc} loading={loading} />}
            {activeTab === "icra"       && <IcraMasrafForm onCalc={callCalc} loading={loading} />}
          </div>

          {/* Result */}
          <div style={{ position: "sticky", top: 96 }}>
            <ResultPanel result={result} loading={loading} error={error} />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
