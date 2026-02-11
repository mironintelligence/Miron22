// src/pages/Cases.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

const CASE_TYPES = [
  { value: "icra", label: "İcra Takibi" },
  { value: "dava", label: "Dava" },
  { value: "danismanlik", label: "Danışmanlık" },
];

const STATUS_OPTIONS = [
  { value: "acik", label: "Açık" },
  { value: "beklemede", label: "Beklemede" },
  { value: "kapandi", label: "Kapandı" },
];

function formatTL(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  const n = Number(num);
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "icra",
    court: "",
    city: "",
    file_number: "",
    client_name: "",
    opponent_name: "",
    principal_amount: "",
    status: "acik",
  });

  const loadCases = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/cases/`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Dosyalar getirilemedi.");
      }
      const data = await res.json();
      setCases(data);
    } catch (err) {
      setError(err.message || "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("En azından dosya başlığını doldur.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        court: form.court.trim() || null,
        city: form.city.trim() || null,
        file_number: form.file_number.trim() || null,
        client_name: form.client_name.trim() || null,
        opponent_name: form.opponent_name.trim() || null,
        principal_amount: form.principal_amount
          ? Number(form.principal_amount.replace(",", "."))
          : 0,
        status: form.status,
      };

      const res = await fetch(`${API_BASE}/cases/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Dosya oluşturulamadı.");
      }

      const created = await res.json();
      setCases((prev) => [created, ...prev]);
      setForm({
        title: "",
        type: "icra",
        court: "",
        city: "",
        file_number: "",
        client_name: "",
        opponent_name: "",
        principal_amount: "",
        status: "acik",
      });
      setShowCreate(false);
    } catch (err) {
      setError(err.message || "Bilinmeyen hata.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-24 max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Dosya Yönetimi</h2>
          <p className="text-sm text-gray-500">
            E-katip / Sinerji hafif versiyonu: icra, dava ve danışmanlık dosyalarını burada tut.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 rounded-full bg-primary text-xs font-semibold text-black"
        >
          {showCreate ? "Yeni dosya formunu gizle" : "Yeni dosya aç"}
        </button>
      </div>

      {/* YENI DOSYA FORMU */}
      {showCreate && (
        <div className="glass px-5 py-4 mb-5">
          <h3 className="text-sm font-semibold mb-3">Yeni Dosya Aç</h3>
          {error && (
            <div className="mb-2 text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Başlık <span className="text-red-400">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Örn: X Ltd. - Kira Tahliye"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Tür
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CASE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Statü
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mahkeme</label>
                <input
                  name="court"
                  value={form.court}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Örn: İstanbul 3. İcra D."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">İl</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="İstanbul"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Esas / Dosya No</label>
                <input
                  name="file_number"
                  value={form.file_number}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="2025/123 E."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Müvekkil</label>
                <input
                  name="client_name"
                  value={form.client_name}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ad Soyad / Ünvan"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Karşı Taraf</label>
                <input
                  name="opponent_name"
                  value={form.opponent_name}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ad Soyad / Ünvan"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Takip / Dava Değeri (₺)
                </label>
                <input
                  name="principal_amount"
                  value={form.principal_amount}
                  onChange={handleChange}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Örn: 15000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-full bg-primary text-xs font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Kaydediliyor..." : "Dosyayı oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTE */}
      <div className="glass px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Tüm Dosyalar</h3>
          <span className="text-[11px] text-gray-500">
            Toplam {cases.length} kayıt
          </span>
        </div>

        {loading && (
          <div className="text-xs text-gray-400">Yükleniyor...</div>
        )}

        {!loading && cases.length === 0 && (
          <div className="text-xs text-gray-500">
            Henüz hiç dosya yok. Yukarıdan yeni dosya oluştur.
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-white/5">
                  <th className="py-2 pr-3 font-medium">Başlık</th>
                  <th className="py-2 pr-3 font-medium">Tür</th>
                  <th className="py-2 pr-3 font-medium">Statü</th>
                  <th className="py-2 pr-3 font-medium">Müvekkil</th>
                  <th className="py-2 pr-3 font-medium">Değer</th>
                  <th className="py-2 pr-3 font-medium">Şehir</th>
                  <th className="py-2 pr-3 font-medium">Mahkeme</th>
                  <th className="py-2 pr-3 font-medium text-right">
                    Detay
                  </th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-100">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {c.file_number || "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {CASE_TYPES.find((t) => t.value === c.type)?.label ||
                        c.type}
                    </td>
                    <td className="py-2 pr-3">
                      {STATUS_OPTIONS.find((s) => s.value === c.status)?.label ||
                        c.status}
                    </td>
                    <td className="py-2 pr-3">
                      {c.client_name || "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {formatTL(c.principal_amount)}
                    </td>
                    <td className="py-2 pr-3">
                      {c.city || "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {c.court || "-"}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-primary/90 text-[11px] font-semibold text-black hover:bg-primary"
                      >
                        Görüntüle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="mt-6 mb-6 text-center text-[11px] text-gray-500">
        Bu ekran tam teşekküllü UYAP değil; ofis içi hafif dosya takibi.
      </footer>
    </div>
  );
}
