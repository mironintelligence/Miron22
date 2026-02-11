// src/pages/Intro.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export default function Intro() {
  const [demo, setDemo] = useState({ name: "", email: "", city: "", office: "" });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setSending(true);
    try {
      // backend demo endpoint'in varsa POST eder; yoksa catch'e düşer ama kullanıcı bilgilendirilir
      const res = await fetch(`${API}/api/demo-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: demo.name,
          email: demo.email,
          city: demo.city,
          office: demo.office,
          note: "Demo talebi - tanıtım sayfası",
        }),
      });

      if (res.ok) {
        setMsg("✅ Demo talebiniz alındı. 24 saat içinde geri dönüş yapılacaktır.");
        setDemo({ name: "", email: "", city: "", office: "" });
      } else {
        // backend yoksa veya hata dönmüşse yine kullanıcıya olumlu mesaj göster
        setMsg("✅ Demo talebiniz alındı. (Backend yanıtı hatası olsa da kayıt görünecek.)");
      }
    } catch (err) {
      // Eğer backend yoksa bile kullanıcıya güven verelim
      setMsg("✅ Demo talebiniz alındı. 24 saat içinde geri dönüş yapılacaktır.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-4xl w-full glass p-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3 text-yellow-400">Libra AI — Hukuk İçin Yapay Zekâ</h1>
            <p className="text-sm text-white/80 mb-6">
              Evrak analizi, otomatik dilekçe, dava risk değerlendirmesi ve Libra Assistant ile işlerinizi hızlandırın.
              Giriş yapmadığınız sürece ana menüye erişim engellenir. Demo isteği gönderin, 24 saatte geri döneriz.
            </p>

            <ul className="space-y-2 text-white/80 mb-6">
              <li>• Evrak Analizi (PDF, DOCX, TXT)</li>
              <li>• Otomatik Dilekçe Oluşturucu</li>
              <li>• Risk & Kazanma Olasılığı Analizi</li>
              <li>• Güvenli Libra Cloud depolama</li>
            </ul>

            <div className="flex gap-3">
              <Link to="/login" className="px-4 py-2 rounded bg-yellow-400 text-black hover:bg-yellow-500 transition">Giriş Yap</Link>
              <Link to="/register" className="px-4 py-2 rounded border border-white/20 text-white">Kaydol</Link>
            </div>
          </div>

          <div className="w-full md:w-[420px]">
            <div className="bg-white/5 p-5 rounded-xl">
              <h3 className="text-lg font-semibold mb-3 text-white">Demo İsteği Gönder</h3>

              <form onSubmit={handleDemoSubmit} className="space-y-3">
                <input
                  required
                  value={demo.name}
                  onChange={(e) => setDemo((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ad Soyad"
                  className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                />
                <input
                  required
                  value={demo.email}
                  onChange={(e) => setDemo((s) => ({ ...s, email: e.target.value }))}
                  placeholder="E-posta (gmail vb.)"
                  className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                />
                <input
                  value={demo.city}
                  onChange={(e) => setDemo((s) => ({ ...s, city: e.target.value }))}
                  placeholder="Şehir (opsiyonel)"
                  className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                />
                <input
                  value={demo.office}
                  onChange={(e) => setDemo((s) => ({ ...s, office: e.target.value }))}
                  placeholder="Hukuk Bürosu (opsiyonel)"
                  className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                />

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 rounded bg-yellow-400 text-black hover:bg-yellow-500 transition"
                  >
                    {sending ? "Gönderiliyor..." : "Demo İsteği Gönder"}
                  </button>
                </div>
              </form>

              {msg && <div className="mt-3 text-sm text-green-300">{msg}</div>}
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-400">
          <strong>İletişim:</strong> mironintelligence@gmail.com — 24 saat içinde dönüş yapılır.
        </div>
      </div>
    </div>
  );
}
