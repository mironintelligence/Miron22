import React, { useEffect, useState } from "react";
import { authFetch } from "../auth/api";

export default function Reminders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/reminders");
      if (res.ok) {
        setItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim() || !dueAt) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, details, due_at: new Date(dueAt).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Hatırlatıcı kaydedilemedi.");
      }
      setTitle("");
      setDetails("");
      setDueAt("");
      await load();
    } catch (e) {
      alert(e.message || "Hatırlatıcı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const res = await authFetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 py-16">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-accent">⏰ Dava Hatırlatıcı</h1>
        <p className="text-sm text-white/60 mt-1">
          Dava tarihlerini kaydedin. Tarih geldiğinde uygulama içi bildirim alırsınız.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          <div className="glass p-6 rounded-2xl space-y-3">
            <div className="text-sm font-semibold">Yeni Hatırlatıcı</div>
            <input
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
              placeholder="Başlık (örn: Duruşma - 3. Asliye Hukuk)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm h-28 resize-none"
              placeholder="Detay (dosya no, notlar, yapılacaklar)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <input
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded-xl bg-[var(--miron-gold)] text-black text-xs font-semibold w-full"
              onClick={create}
              disabled={saving || !title.trim() || !dueAt}
            >
              {saving ? "Kaydediliyor..." : "Hatırlatıcıyı Kaydet"}
            </button>
          </div>

          <div className="glass p-6 rounded-2xl">
            <div className="text-sm font-semibold mb-3">Kayıtlı Hatırlatıcılar</div>
            {loading ? (
              <div className="text-xs text-white/50">Yükleniyor...</div>
            ) : items.length === 0 ? (
              <div className="text-xs text-white/50">Henüz hatırlatıcı yok.</div>
            ) : (
              <div className="space-y-3">
                {items.map((r) => (
                  <div key={r.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{r.title}</div>
                        <div className="text-xs text-white/60 mt-1">{r.details || ""}</div>
                        <div className="text-xs text-white/50 mt-2">
                          Tarih/Saat: {r.due_at}
                        </div>
                      </div>
                      <button
                        className="text-xs text-red-400 hover:underline"
                        onClick={() => remove(r.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

