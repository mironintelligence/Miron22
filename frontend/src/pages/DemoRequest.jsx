// frontend/src/pages/DemoRequest.jsx
import React, { useState } from "react";
const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export default function DemoRequest() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    lawFirm: "",
    message: "",
  });

  const [status, setStatus] = useState(null);
  const [kvkkOk, setKvkkOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kvkkOk || !termsOk) {
      setStatus("need_approve");
      return;
    }

    setStatus("loading");
    try {
      const noteParts = [];
      if (form.city) noteParts.push(`Şehir: ${form.city}`);
      if (form.lawFirm) noteParts.push(`Büro/Şirket: ${form.lawFirm}`);
      if (form.message) noteParts.push(`Not: ${form.message}`);
      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || null,
        note: noteParts.join("\n") || null,
      };

      const r = await fetch(`${API_BASE}/api/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.status === "ok") {
        setStatus("success");
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          city: "",
          lawFirm: "",
          message: "",
        });
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const disabled = !form.firstName || !form.lastName || !form.email || !kvkkOk || !termsOk;

  return (
    <div className="premium-scope min-h-screen flex items-center justify-center px-4 py-10 bg-black text-white">
      <div className="w-full max-w-2xl glass p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-accent">
          Miron AI Demo Talep Formu
        </h1>
        <p className="text-center text-sm text-subtle mb-6">
          Demo erişimi başvurunuz alınır. Değerlendirme sonrası e-posta ile bilgilendirilirsiniz. Onaylandıktan sonra kayıt ekranında “Demo” seçeneğiyle hesabınızı oluşturabilirsiniz.
        </p>

        {status === "success" && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 text-center">
             Demo talebiniz alındı. En kısa sürede e-posta ile dönüş yapılacaktır.
          </div>
        )}
        {status === "error" && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
             Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.
          </div>
        )}
        {status === "need_approve" && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 text-center">
             Lütfen KVKK ve kullanım şartlarını onaylayın.
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Ad"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
            <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Soyad"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
            <input name="email" value={form.email} onChange={handleChange} placeholder="E-posta adresiniz"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Telefon (opsiyonel)"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
            <input name="city" value={form.city} onChange={handleChange} placeholder="Şehir (opsiyonel)"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
            <input name="lawFirm" value={form.lawFirm} onChange={handleChange} placeholder="Hukuk Bürosu / Çalıştığınız yer (opsiyonel)"
              className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
            />
          </div>

          <textarea name="message" value={form.message} onChange={handleChange} placeholder="Kısaca ofisinizden ve süreçlerinizden bahsedebilir misiniz? (opsiyonel)"
            rows={4}
            className="px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)] resize-none"
          />

          <div className="space-y-2 text-xs text-muted">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={kvkkOk} onChange={(e) => setKvkkOk(e.target.checked)} className="mt-1" />
              <span>
                KVKK ve kişisel verilerimin <span className="text-accent">Miron AI tarafından işlenmesini</span> kabul ediyorum.
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} className="mt-1" />
              <span>
                <a className="text-accent hover:underline" href="/legal/privacy" target="_blank" rel="noreferrer">Gizlilik Politikası</a>{" "}
                ve{" "}
                <a className="text-accent hover:underline" href="/legal/terms" target="_blank" rel="noreferrer">Kullanım Şartları</a>{" "}
                metinlerini okudum, kabul ediyorum.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={disabled || status === "loading"}
            className={`w-full mt-4 btn-primary ${
              disabled || status === "loading" ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {status === "loading" ? "Gönderiliyor..." : "Demo Talebi Gönder"}
          </button>

          <p className="text-[11px] text-subtle text-center mt-2">
            Formu göndererek Miron AI ekibinin sizinle e-posta üzerinden iletişime geçmesini kabul etmiş olursunuz.
          </p>
        </form>
      </div>
    </div>
  );
}
