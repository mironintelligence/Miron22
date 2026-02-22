import React, { useState } from "react";
import { motion } from "framer-motion";
import { authFetch } from "../auth/api";

export default function Calculators() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [interestType, setInterestType] = useState("faiz-basit");
  const [principal, setPrincipal] = useState(100000);
  const [annualRate, setAnnualRate] = useState(36);
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [compoundPerYear, setCompoundPerYear] = useState(12);

  const [amount, setAmount] = useState(50000);
  const [rate, setRate] = useState(6.83);

  const [monthlySalary, setMonthlySalary] = useState(30000);
  const [overtimeHours, setOvertimeHours] = useState(20);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [years, setYears] = useState(5);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);
  const [yearsWorked, setYearsWorked] = useState(2);
  const [cap, setCap] = useState("");

  const [limStart, setLimStart] = useState("2022-01-01");
  const [limYears, setLimYears] = useState(5);
  const [limMonths, setLimMonths] = useState(0);

  const [enfPrincipal, setEnfPrincipal] = useState(100000);
  const [enfFeeRate, setEnfFeeRate] = useState(10);
  const [enfTaxRate, setEnfTaxRate] = useState(18);

  const callCalc = async (path, payload) => {
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
      setResult(data);
    } catch (e) {
      setError(e.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-accent">📊 Hesaplama Araçları</h1>
        <p className="text-sm text-white/60 mb-8">
          Faiz, harç, vekalet, işçilik alacakları ve zamanaşımı hesapları.
        </p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-2xl space-y-8">
            <div className="space-y-4">
              <div className="text-sm font-semibold">Faiz Hesaplama</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "faiz-basit", label: "Basit" },
                  { key: "faiz-bilesik", label: "Bileşik" },
                  { key: "faiz-ticari", label: "Ticari" },
                  { key: "faiz-temerrut", label: "Temerrüt" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setInterestType(t.key)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      interestType === t.key ? "bg-[var(--miron-gold)] text-black border-[var(--miron-gold)]" : "bg-white/5 border-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} placeholder="Anapara" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} placeholder="Yıllık faiz (%)" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                {interestType === "faiz-bilesik" && (
                  <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={compoundPerYear} onChange={(e) => setCompoundPerYear(Number(e.target.value))} placeholder="Yıllık bileşik sayısı" />
                )}
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-[var(--miron-gold)] text-black text-xs font-semibold"
                onClick={() => callCalc(`/calc/${interestType}`, {
                  principal,
                  annual_rate: annualRate,
                  start_date: startDate,
                  end_date: endDate,
                  compounds_per_year: compoundPerYear,
                })}
                disabled={loading}
              >
                {loading ? "Hesaplanıyor..." : "Faiz Hesapla"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">İşçilik Alacakları</div>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} placeholder="Aylık ücret" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value))} placeholder="Fazla mesai saat" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(Number(e.target.value))} placeholder="Mesai katsayı" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} placeholder="Yıl" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} placeholder="Ay" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} placeholder="Gün" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={yearsWorked} onChange={(e) => setYearsWorked(Number(e.target.value))} placeholder="İhbar yıl" />
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-[var(--miron-gold)] text-black text-xs font-semibold"
                onClick={() => callCalc(`/calc/iscilik`, {
                  monthly_salary: monthlySalary,
                  overtime_hours: overtimeHours,
                  overtime_multiplier: overtimeMultiplier,
                  years,
                  months,
                  days,
                  years_worked: yearsWorked,
                })}
                disabled={loading}
              >
                {loading ? "Hesaplanıyor..." : "İşçilik Hesapla"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">Kıdem ve İhbar</div>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} placeholder="Aylık ücret" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={yearsWorked} onChange={(e) => setYearsWorked(Number(e.target.value))} placeholder="Çalışma yılı" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Kıdem tavanı (ops.)" />
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs"
                  onClick={() => callCalc(`/calc/kidem`, {
                    monthly_salary: monthlySalary,
                    years,
                    months,
                    days,
                    cap: cap ? Number(cap) : null,
                  })}
                  disabled={loading}
                >
                  Kıdem Hesapla
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs"
                  onClick={() => callCalc(`/calc/ihbar`, {
                    monthly_salary: monthlySalary,
                    years_worked: yearsWorked,
                  })}
                  disabled={loading}
                >
                  İhbar Hesapla
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">Zamanaşımı</div>
              <div className="grid grid-cols-3 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="date" value={limStart} onChange={(e) => setLimStart(e.target.value)} />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={limYears} onChange={(e) => setLimYears(Number(e.target.value))} placeholder="Yıl" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={limMonths} onChange={(e) => setLimMonths(Number(e.target.value))} placeholder="Ay" />
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs"
                onClick={() => callCalc(`/calc/zamanasimi`, {
                  start_date: limStart,
                  period_years: limYears,
                  period_months: limMonths,
                })}
                disabled={loading}
              >
                Zamanaşımı Hesapla
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">Harç ve Vekalet</div>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Uyuşmazlık miktarı" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} placeholder="Oran (%)" />
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs" onClick={() => callCalc(`/calc/harc`, { amount_in_dispute: amount, rate })} disabled={loading}>
                  Harç Hesapla
                </button>
                <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs" onClick={() => callCalc(`/calc/vekalet`, { amount_in_dispute: amount, rate })} disabled={loading}>
                  Vekalet Hesapla
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold">İcra Masrafı</div>
              <div className="grid grid-cols-3 gap-3">
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={enfPrincipal} onChange={(e) => setEnfPrincipal(Number(e.target.value))} placeholder="Ana para" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={enfFeeRate} onChange={(e) => setEnfFeeRate(Number(e.target.value))} placeholder="Masraf oranı" />
                <input className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm" type="number" value={enfTaxRate} onChange={(e) => setEnfTaxRate(Number(e.target.value))} placeholder="Vergi oranı" />
              </div>
              <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs" onClick={() => callCalc(`/calc/icra-masraf`, { principal: enfPrincipal, fee_rate: enfFeeRate, tax_rate: enfTaxRate })} disabled={loading}>
                İcra Masrafı Hesapla
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}
            {!error && !result && <div className="text-xs text-subtle">Hesaplama sonucu burada görünecek.</div>}
            {result && (
              <div className="text-sm text-white/80 space-y-2">
                <div className="font-semibold text-accent">Sonuç</div>
                <pre className="whitespace-pre-wrap text-xs bg-black/30 rounded-xl p-3">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
