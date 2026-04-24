import React, { useEffect, useState } from "react";
import { authFetch } from "../auth/api";
import { emitToast } from "../utils/toastBus";

export default function Reminders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [remind7d, setRemind7d] = useState(true);
  const [remind1d, setRemind1d] = useState(true);
  const [remind1h, setRemind1h] = useState(true);
  const [customMinutes, setCustomMinutes] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/reminders");
      if (res.ok) {
        setItems(await res.json());
        return;
      }
      if (res.status === 401) {
        emitToast("Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.", "error");
      } else {
        emitToast("Hatırlatıcılar yüklenemedi.", "error");
      }
    } catch (e) {
      emitToast(e?.message || "Hatırlatıcılar yüklenemedi.", "error");
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
      const offsets = [];
      if (remind7d) offsets.push(7 * 24 * 60);
      if (remind1d) offsets.push(24 * 60);
      if (remind1h) offsets.push(60);
      const cm = parseInt(String(customMinutes || "").trim(), 10);
      if (!Number.isNaN(cm) && cm > 0) offsets.push(cm);
      const channels = ["in_app"];
      if (notifyEmail) channels.push("email");
      if (notifySms) channels.push("sms");
      if (notifyPush) channels.push("push");
      const res = await authFetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          details,
          case_number: caseNumber,
          court,
          due_at: new Date(dueAt).toISOString(),
          remind_offsets_minutes: offsets,
          channels,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Hatırlatıcı kaydedilemedi.");
      }
      setTitle("");
      setDetails("");
      setCaseNumber("");
      setCourt("");
      setDueAt("");
      setCustomMinutes("");
      setNotifyEmail(false);
      setNotifySms(false);
      setNotifyPush(false);
      emitToast("Hatırlatıcı kaydedildi.", "success");
      await load();
    } catch (e) {
      emitToast(e.message || "Hatırlatıcı kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (label, fn) => {
    try {
      const res = await fn();
      if (res.ok) {
        await load();
        return;
      }
      const data = await res.json().catch(() => ({}));
      const detail = typeof data?.detail === "string" ? data.detail : null;
      emitToast(detail || `${label} işlemi başarısız (HTTP ${res.status}).`, "error");
    } catch (e) {
      emitToast(e?.message || `${label} işlemi başarısız.`, "error");
    }
  };

  const remove = (id) =>
    handleAction("Silme", () =>
      authFetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" })
    );

  const archive = (id) =>
    handleAction("Arşivleme", () =>
      authFetch(`/api/reminders/${encodeURIComponent(id)}/archive`, { method: "POST" })
    );

  const unarchive = (id) =>
    handleAction("Geri alma", () =>
      authFetch(`/api/reminders/${encodeURIComponent(id)}/unarchive`, { method: "POST" })
    );

  const upcoming = items.filter((x) => !x.archived_at);
  const archived = items.filter((x) => !!x.archived_at);

  return (
    <div className="premium-scope min-h-screen px-6 sm:px-10 md:px-16 py-16">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-accent">Dava Hatırlatıcı</h1>
          <p className="text-sm text-white/60 mt-1">
            Duruşma ve süreleri kaydedin. Seçtiğiniz zamanlarda uygulama içi bildirim alırsınız.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-2xl space-y-4 border border-white/10">
            <div className="text-sm font-semibold">Yeni Hatırlatıcı</div>
            <label htmlFor="reminder-title" className="text-xs text-white/60">
              Başlık
            </label>
            <input
              id="reminder-title"
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
              placeholder="Başlık (örn: Duruşma - 3. Asliye Hukuk)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="reminder-details" className="text-xs text-white/60">
              Detay
            </label>
            <textarea
              id="reminder-details"
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm h-28 resize-none"
              placeholder="Detay (dosya no, notlar, yapılacaklar)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60">Dosya No</label>
                <input
                  className="w-full mt-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                  placeholder="2026/..."
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Mahkeme</label>
                <input
                  className="w-full mt-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
                  placeholder="... Asliye ... / ..."
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                />
              </div>
            </div>
            <label htmlFor="reminder-dueat" className="text-xs text-white/60">
              Tarih/Saat
            </label>
            <input
              id="reminder-dueat"
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-semibold text-white/70 mb-2">Hatırlatma Zamanları</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/70">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remind7d} onChange={(e) => setRemind7d(e.target.checked)} />
                  <span>7 gün önce</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remind1d} onChange={(e) => setRemind1d(e.target.checked)} />
                  <span>1 gün önce</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remind1h} onChange={(e) => setRemind1h(e.target.checked)} />
                  <span>1 saat önce</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-24 bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs"
                    inputMode="numeric"
                    placeholder="dakika"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                  />
                  <span>önce (ek)</span>
                </div>
              </div>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-xs font-semibold text-white/70 mb-2">Bildirim Kanalları</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/70">
                <div className="text-white/70">Uygulama içi: Aktif</div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyPush} onChange={(e) => setNotifyPush(e.target.checked)} />
                  <span>Push</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                  <span>E-posta</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
                  <span>SMS</span>
                </label>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-xl bg-[var(--miron-gold)] text-black text-xs font-semibold w-full"
              onClick={create}
              disabled={saving || !title.trim() || !dueAt}
            >
              {saving ? "Kaydediliyor..." : "Hatırlatıcıyı Kaydet"}
            </button>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Kayıtlı Hatırlatıcılar</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowArchived(false)}
                  className={`px-3 py-1 rounded-lg text-xs ${!showArchived ? "bg-accent text-black" : "bg-white/10"}`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  className={`px-3 py-1 rounded-lg text-xs ${showArchived ? "bg-accent text-black" : "bg-white/10"}`}
                >
                  Arşiv
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-xs text-white/50">Yükleniyor...</div>
            ) : (!showArchived ? upcoming : archived).length === 0 ? (
              <div className="text-xs text-white/50">Henüz hatırlatıcı yok.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {(!showArchived ? upcoming : archived).map((r) => (
                  <div
                    key={r.id}
                    className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                      <div>
                        <div className="font-semibold">{r.title}</div>
                        <div className="text-xs text-white/60 mt-1">{r.details || ""}</div>
                        {(r.court || r.case_number) && (
                          <div className="text-xs text-white/55 mt-2">
                            {r.court ? `Mahkeme: ${r.court}` : ""}
                            {r.court && r.case_number ? " · " : ""}
                            {r.case_number ? `Dosya No: ${r.case_number}` : ""}
                          </div>
                        )}
                        <div className="text-xs text-white/50 mt-2">
                          Tarih/Saat: {r.due_at}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {!r.archived_at ? (
                          <button className="text-xs text-white/70 hover:underline" onClick={() => archive(r.id)}>
                            Arşivle
                          </button>
                        ) : (
                          <button className="text-xs text-white/70 hover:underline" onClick={() => unarchive(r.id)}>
                            Geri Al
                          </button>
                        )}
                        <button className="text-xs text-red-400 hover:underline" onClick={() => remove(r.id)}>
                          Sil
                        </button>
                      </div>
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
