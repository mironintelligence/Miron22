import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";

export default function Upgrade() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState("pro");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!user) nav("/login");
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await authFetch("/api/billing/plans", { method: "GET" });
        const data = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setErr(data.detail || "Planlar alınamadı.");
          return;
        }
        setPlans(Array.isArray(data.plans) ? data.plans : []);
      } catch {
        if (!alive) return;
        setErr("Planlar alınamadı.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const r = await authFetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: selected, payment_method_id: reference || "manual" }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Yükseltme başarısız.");
      setOk("Abonelik güncellendi. Tekrar giriş yapmanız gerekebilir.");
    } catch (e) {
      setErr(e?.message || "Yükseltme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--miron-gold)]">Hesabı Yükselt</h1>
        <p className="text-white/60 mt-2">
          Demo hesabınız onaylandıysa veya aktif bir hesabınız varsa burada aboneliğinizi yükseltebilirsiniz.
        </p>

        <div className="card p-6 mt-6">
          <div className="text-sm text-white/60 mb-3">Plan Seç</div>
          <div className="grid md:grid-cols-2 gap-3">
            {(plans.length ? plans : [{ id: "pro", name: "Pro" }, { id: "enterprise", name: "Enterprise" }]).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`text-left rounded-xl border p-4 transition ${
                  selected === p.id ? "border-[var(--miron-gold)] bg-white/5" : "border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="font-bold">{p.name || p.id}</div>
                {p.price_monthly_try != null ? (
                  <div className="text-sm text-white/60 mt-1">{p.price_monthly_try} TL / ay</div>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-sm text-white/60 mb-2">Ödeme Referansı (Opsiyonel)</div>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="Dekont/işlem no"
            />
          </div>

          {err ? <div className="mt-4 text-sm text-red-400">{err}</div> : null}
          {ok ? <div className="mt-4 text-sm text-green-400">{ok}</div> : null}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold disabled:opacity-50"
          >
            {loading ? "İşleniyor..." : "Yükselt"}
          </button>
        </div>
      </div>
    </div>
  );
}

