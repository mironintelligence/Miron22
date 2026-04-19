import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { emitToast } from "../utils/toastBus";
import { getApiBase } from "../lib/apiBase.js";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState("Bilinmiyor");
  const [loggingOut, setLoggingOut] = useState(false);

  const testConnection = async () => {
    try {
      const r = await fetch(`${getApiBase()}/api/health`);
      if (r.ok) setConnection("Bağlantı başarılı ");
      else setConnection("Sunucuya erişilemiyor ");
    } catch {
      setConnection("Sunucuya erişilemiyor ");
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      emitToast("Oturum kapatıldı.", "success");
      navigate("/", { replace: true });
    } catch (e) {
      emitToast(e?.message || "Çıkış yapılamadı", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-20 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-2 text-accent"> Ayarlar</h1>
      <p className="text-sm text-subtle mb-8">
        {user?.email ? `Oturum: ${user.email}` : ""}
      </p>

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
        <button type="button" onClick={testConnection} className="btn-primary">
          Test Et
        </button>
        <div className="mt-2 text-sm text-muted">{connection}</div>
      </div>

      <div className="glass p-6 rounded-2xl border border-white/10">
        <h3 className="font-semibold mb-2">Oturumu kapat</h3>
        <p className="text-xs text-subtle mb-4">
          Ana menüde çıkış gösterilmez; güvenlik için çıkış yalnızca buradan yapılır.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-100 font-semibold hover:bg-red-900/90 disabled:opacity-50"
        >
          {loggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
        </button>
      </div>

      <footer className="text-center text-xs text-subtle mt-20 py-8 glass border-t border-white/10 rounded-t-2xl">
        ®2025 Miron Intelligence — Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
