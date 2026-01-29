import React, { useState } from "react";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState("Bilinmiyor");

  const testConnection = async () => {
    try {
      const r = await fetch("http://127.0.0.1:8000/");
      if (r.ok) setConnection("Bağlantı başarılı ✅");
      else setConnection("Sunucuya erişilemiyor ❌");
    } catch {
      setConnection("Sunucuya erişilemiyor ❌");
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">⚙️ Libra AI Ayarlar</h1>

      <div className="glass p-6 rounded-2xl mb-6">
        <h3 className="font-semibold mb-3">Tema</h3>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`px-4 py-2 rounded-xl ${
            darkMode
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
              : "bg-white/10 text-gray-200"
          }`}
        >
          {darkMode ? "Koyu Mod Aktif" : "Açık Mod Aktif"}
        </button>
      </div>

      <div className="glass p-6 rounded-2xl mb-6">
        <h3 className="font-semibold mb-3">API Anahtarı</h3>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API anahtarınızı girin"
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>

      <div className="glass p-6 rounded-2xl mb-6">
        <h3 className="font-semibold mb-3">Bağlantı Testi</h3>
        <button
          onClick={testConnection}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
        >
          Test Et
        </button>
        <div className="mt-2 text-sm text-gray-300">{connection}</div>
      </div>

      <footer className="text-center text-xs text-gray-400 mt-20 py-8 glass border-t border-white/10 rounded-t-2xl">
        ®2025 Miron Intelligence — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
