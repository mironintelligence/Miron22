// frontend/src/pages/DemoRequest.jsx
import React, { useState } from "react";
import axios from "axios";

export default function DemoRequest() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    lawFirm: "",
    password: "",
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
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const res = await axios.post(`${base}/api/demo-request`, form);
      if (res.data.status === "success") {
        setStatus("success");
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          city: "",
          lawFirm: "",
          password: "",
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-black text-white">
      <div className="w-full max-w-2xl glass p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-accent">
          Miron AI Demo Talep Formu
        </h1>
        <p className="text-center text-sm text-subtle mb-6">
          Demo erişimi başvurunuz alınır. Değerlendirme sonrası demo hesabınız oluşturulur ve e-posta ile bilgilendirilirsiniz.
        </p>

        {status === "success" && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 text-center">
            ✔ Demo talebiniz alındı. En kısa sürede e-posta ile dönüş yapılacaktır.
          </div>
        )}
        {status === "error" && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
            ❌ Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.
          </div>
        )}
        {status === "need_approve" && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 text-center">
            ⚠ Lütfen KVKK ve kullanım şartlarını onaylayın.
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

          <input name="password" value={form.password} onChange={handleChange} placeholder="Demo hesabınız için şifre (opsiyonel)"
            className="px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm outline-none text-white focus:ring-2 focus:ring-[var(--miron-gold)]"
          />

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
                <a className="text-accent hover:underline" href="/privacy" target="_blank" rel="noreferrer">Gizlilik Politikası</a>{" "}
                ve{" "}
                <a className="text-accent hover:underline" href="/terms" target="_blank" rel="noreferrer">Kullanım Şartları</a>{" "}
                ile{" "}
                <a className="text-accent hover:underline" href="/user-agreement" target="_blank" rel="noreferrer">Kullanıcı Sözleşmesi</a>{" "}
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
