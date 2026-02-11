import React, { useState } from "react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState("Bilinmiyor");

  const testConnection = async () => {
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL || "https://miron22.onrender.com"}/`
      );
      if (r.ok) setConnection("Bağlantı başarılı ✅");
      else setConnection("Sunucuya erişilemiyor ❌");
    } catch {
      setConnection("Sunucuya erişilemiyor ❌");
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-accent">⚙️ Ayarlar</h1>

      <div className="glass p-6 rounded-2xl mb-6">
        <h3 className="font-semibold mb-3">API Anahtarı</h3>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API anahtarınızı girin"
          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)] text-white"
        />
      </div>

      <div className="glass p-6 rounded-2xl mb-6">
        <h3 className="font-semibold mb-3">Bağlantı Testi</h3>
        <button
          onClick={testConnection}
          className="btn-primary"
        >
          Test Et
        </button>
        <div className="mt-2 text-sm text-muted">{connection}</div>
      </div>

      <footer className="text-center text-xs text-subtle mt-20 py-8 glass border-t border-white/10 rounded-t-2xl">
        ®2025 Miron Intelligence — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
