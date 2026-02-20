// src/pages/CaseDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

const EVENT_TYPES = [
  { value: "tebligat", label: "Tebligat" },
  { value: "tahsilat", label: "Tahsilat" },
  { value: "haciz", label: "Haciz" },
  { value: "satis", label: "Satış" },
  { value: "dilekce", label: "Dilekçe" },
  { value: "not", label: "Not" },
  { value: "sure", label: "Süre / Term" },
];

const STATUS_OPTIONS = [
  { value: "acik", label: "Açık" },
  { value: "beklemede", label: "Beklemede" },
  { value: "kapandi", label: "Kapandı" },
];

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR");
}

function formatTL(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  const n = Number(num);
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [events, setEvents] = useState([]);
  const [finance, setFinance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [evLoading, setEvLoading] = useState(true);
  const [finLoading, setFinLoading] = useState(true);

  const [error, setError] = useState("");
  const [evError, setEvError] = useState("");
  const [finError, setFinError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [eventForm, setEventForm] = useState({
    event_type: "not",
    date: "",
    description: "",
    amount: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const loadCase = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/cases/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Dosya bulunamadı.");
      }
      const data = await res.json();
      setCaseData(data);
      setEditForm({
        title: data.title || "",
        status: data.status || "acik",
        court: data.court || "",
        city: data.city || "",
        file_number: data.file_number || "",
        client_name: data.client_name || "",
        opponent_name: data.opponent_name || "",
        principal_amount: String(data.principal_amount ?? ""),
        type: data.type || "icra",
      });
    } catch (err) {
      setError(err.message || "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    setEvLoading(true);
    setEvError("");
    try {
      const res = await fetch(`${API_BASE}/cases/${id}/events`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Olaylar getirilemedi.");
      }
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setEvError(err.message || "Bilinmeyen hata.");
    } finally {
      setEvLoading(false);
    }
  };

  const loadFinance = async () => {
    setFinLoading(true);
    setFinError("");
    try {
      const res = await fetch(`${API_BASE}/cases/${id}/finance-summary`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Finans özeti getirilemedi.");
      }
      const data = await res.json();
      setFinance(data);
    } catch (err) {
      setFinError(err.message || "Bilinmeyen hata.");
    } finally {
      setFinLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadCase();
    loadEvents();
    loadFinance();
  }, [id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!caseData) return;

    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        principal_amount: editForm.principal_amount
          ? Number(editForm.principal_amount.replace(",", "."))
          : 0,
      };

      const res = await fetch(`${API_BASE}/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Güncelleme başarısız.");
      }

      const updated = await res.json();
      setCaseData(updated);
      setEditMode(false);
      // finansı yeniden çek; değer değişmiş olabilir
      loadFinance();
    } catch (err) {
      setError(err.message || "Bilinmeyen hata.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEvError("");

    if (!eventForm.description.trim()) {
      setEvError("En azından kısa bir açıklama yaz.");
      return;
    }

    setSavingEvent(true);
    try {
      const payload = {
        event_type: eventForm.event_type,
        date: eventForm.date || null,
        description: eventForm.description.trim(),
        amount: eventForm.amount
          ? Number(eventForm.amount.replace(",", "."))
          : null,
      };

      const res = await fetch(`${API_BASE}/cases/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Olay kaydedilemedi.");
      }

      await res.json();
      setEventForm({
        event_type: "not",
        date: "",
        description: "",
        amount: "",
      });
      await loadEvents();
      await loadFinance();
    } catch (err) {
      setEvError(err.message || "Bilinmeyen hata.");
    } finally {
      setSavingEvent(false);
    }
  };

  if (loading && !caseData) {
    return (
      <div className="mt-24 max-w-4xl mx-auto px-4">
        <div className="glass px-5 py-4 text-xs text-subtle">
          Dosya yükleniyor...
        </div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="mt-24 max-w-4xl mx-auto px-4">
        <div className="glass px-5 py-4 text-xs text-red-400">
          {error}
        </div>
        <div className="mt-3">
          <Link
            to="/cases"
            className="text-xs text-accent underline underline-offset-4"
          >
            Dosya listesine dön
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const statusLabel =
    STATUS_OPTIONS.find((s) => s.value === caseData.status)?.label ||
    caseData.status;

  return (
        <div className="mt-24 max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-subtle mb-1">
            <Link
              to="/cases"
              className="text-accent underline underline-offset-4 mr-1"
            >
              Dosyalar
            </Link>
            / Detay
          </p>
          <h2 className="text-2xl font-semibold">{caseData.title}</h2>
          <p className="text-sm text-subtle">
            {caseData.file_number || "Dosya no yok"} ·{" "}
            {caseData.court || "Mahkeme belirtilmemiş"} ·{" "}
            {caseData.city || "Şehir yok"}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-[11px] text-white hover:bg-black"
        >
          Geri
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        {/* SOL: TEMEL BILGI + OLAYLAR */}
        <div className="space-y-4">
          {/* TEMEL BILGI KARTI */}
          <div className="glass px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Dosya Özeti</h3>
              <button
                onClick={() => setEditMode((m) => !m)}
                className="text-[11px] text-accent underline underline-offset-4"
              >
                {editMode ? "Düzenlemeyi iptal et" : "Düzenle"}
              </button>
            </div>

            {!editMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-subtle">Tür</div>
                  <div className="text-white">
                    {caseData.type === "icra"
                      ? "İcra Takibi"
                      : caseData.type === "dava"
                      ? "Dava"
                      : caseData.type === "danismanlik"
                      ? "Danışmanlık"
                      : caseData.type}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Statü</div>
                  <div className="text-white">{statusLabel}</div>
                </div>
                <div>
                  <div className="text-subtle">Müvekkil</div>
                  <div className="text-white">
                    {caseData.client_name || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Karşı Taraf</div>
                  <div className="text-white">
                    {caseData.opponent_name || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Değer</div>
                  <div className="text-white">
                    {formatTL(caseData.principal_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Oluşturulma</div>
                  <div className="text-white">
                    {formatDate(caseData.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Son Güncelleme</div>
                  <div className="text-white">
                    {formatDate(caseData.updated_at)}
                  </div>
                </div>
              </div>
            )}

            {editMode && (
              <form
                onSubmit={handleSaveEdit}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
              >
                <div>
                  <label className="block text-subtle mb-1">
                    Başlık
                  </label>
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Statü
                  </label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Mahkeme
                  </label>
                  <input
                    name="court"
                    value={editForm.court}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Şehir
                  </label>
                  <input
                    name="city"
                    value={editForm.city}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Esas / Dosya No
                  </label>
                  <input
                    name="file_number"
                    value={editForm.file_number}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Değer (₺)
                  </label>
                  <input
                    name="principal_amount"
                    value={editForm.principal_amount}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Müvekkil
                  </label>
                  <input
                    name="client_name"
                    value={editForm.client_name}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Karşı Taraf
                  </label>
                  <input
                    name="opponent_name"
                    value={editForm.opponent_name}
                    onChange={handleEditChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>

                {error && (
                  <div className="md:col-span-2 text-[11px] text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="md:col-span-2 flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-1.5 rounded-full bg-[var(--miron-gold)] text-[11px] font-semibold text-black hover:brightness-[1.05] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingEdit ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* OLAYLAR / TIMELINE */}
              <div className="glass px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Zaman Çizelgesi</h3>
            </div>

            {evLoading && (
              <div className="text-xs text-subtle">Olaylar yükleniyor...</div>
            )}

            {!evLoading && evError && (
              <div className="text-xs text-red-400 mb-2">{evError}</div>
            )}

            {!evLoading && events.length === 0 && !evError && (
              <div className="text-xs text-subtle mb-2">
                Henüz kayıtlı olay yok. Aşağıdan ekleyebilirsin.
              </div>
            )}

            {!evLoading && events.length > 0 && (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex gap-3 text-xs border-l border-[rgba(255,215,0,0.4)] pl-3"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[var(--miron-gold)] mt-1" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white">
                          {
                            EVENT_TYPES.find((t) => t.value === ev.event_type)
                              ?.label || ev.event_type
                          }
                        </div>
                        <div className="text-[11px] text-subtle">
                          {formatDate(ev.date)}
                        </div>
                      </div>
                      <div className="text-muted mt-0.5">
                        {ev.description}
                      </div>
                      {ev.amount !== null && (
                        <div className="text-[11px] text-accent mt-0.5">
                          Tutar: {formatTL(ev.amount)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* YENI OLAY FORMU */}
            <form onSubmit={handleCreateEvent} className="mt-4 space-y-2 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-subtle mb-1">
                    Tür
                  </label>
                  <select
                    name="event_type"
                    value={eventForm.event_type}
                    onChange={handleEventChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Tarih (boş bırakılırsa bugün)
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleEventChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-subtle mb-1">
                    Tutar (sadece tahsilat/haciz/satış)
                  </label>
                  <input
                    name="amount"
                    value={eventForm.amount}
                    onChange={handleEventChange}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                    placeholder="Örn: 15000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-subtle mb-1">
                  Açıklama
                </label>
                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                  placeholder="Örn: 15.12.2025 tarihli ödeme emri tebliğ edildi. Borçlu 7 gün içinde itiraz etmezse takip kesinleşecek."
                />
              </div>

              {evError && (
                <div className="text-[11px] text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-1.5">
                  {evError}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-4 py-1.5 rounded-full bg-[var(--miron-gold)] text-[11px] font-semibold text-black hover:brightness-[1.05] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingEvent ? "Kaydediliyor..." : "Olay ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SAG: FINANS OZETI + NOT */}
        <div className="space-y-4">
          <div className="glass px-5 py-4">
            <h3 className="text-sm font-semibold mb-3">Finans Özeti</h3>
            {finLoading && (
              <div className="text-xs text-subtle">
                Finans bilgisi yükleniyor...
              </div>
            )}
            {!finLoading && finError && (
              <div className="text-xs text-red-400">{finError}</div>
            )}
            {!finLoading && finance && (
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <div className="text-subtle">Takip / Dava Değeri</div>
                  <div className="text-white">
                    {formatTL(finance.principal_amount)}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Toplam Tahsilat</div>
                  <div className="text-emerald-300">
                    {formatTL(finance.total_collected)}
                  </div>
                </div>
                <div>
                  <div className="text-subtle">Kalan</div>
                  <div className="text-amber-300">
                    {formatTL(finance.remaining)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass px-5 py-4">
            <h4 className="text-xs font-semibold text-muted mb-2">
              Not
            </h4>
            <p className="text-[11px] text-subtle">
              Bu ekran tam muhasebe modülü değil; sadece dosya bazlı hızlı
              takip için. Tahsilat/haciz/satış olaylarına tutar girersen
              yukarıdaki hesaplar otomatik güncellenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
