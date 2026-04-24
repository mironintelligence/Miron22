import React, { useState, useEffect } from "react";
import { authFetch } from "../auth/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await authFetch("/api/notifications/");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.error("Notif error:", e);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new CustomEvent("notifications:changed"));
    } catch (e) {
      console.error("Read error:", e);
    }
  };

  return (
    <div className="premium-scope min-h-screen bg-[#050505] text-white pt-24 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bildirimler</h1>
            <p className="text-white/50">Duyurular, hatırlatmalar ve sistem mesajları.</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-white/30">Yükleniyor...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/10">
            <div className="text-4xl mb-4"></div>
            <p className="text-white/50">Henüz bildiriminiz yok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && markRead(n.id)}
                className={`relative p-6 rounded-2xl border transition-all cursor-pointer ${
                  n.is_read 
                    ? "bg-[#111] border-white/5 text-white/60" 
                    : "bg-[#1a1a1a] border-white/20 text-white hover:border-[var(--miron-gold)]/30"
                }`}
              >
                {!n.is_read && (
                  <div className="absolute top-6 right-6 w-2 h-2 bg-[var(--miron-gold)] rounded-full animate-pulse" />
                )}
                
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    n.type === 'admin' ? 'bg-red-500/20 text-red-400' : 
                    n.type === 'case_reminder' ? 'bg-blue-500/20 text-blue-400' : 
                    'bg-white/10 text-white/50'
                  }`}>
                    {n.type === 'admin' ? 'Duyuru' : n.type === 'case_reminder' ? 'Hatırlatma' : 'Sistem'}
                  </span>
                  <span className="text-xs text-white/30">
                    {new Date(n.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg mb-2">{n.title}</h3>
                <p className="text-sm leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
