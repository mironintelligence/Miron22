import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [cred, setCred] = useState({ firstName: "", lastName: "", password: "" });
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");
  const [msg, setMsg] = useState("");

  // Pricing State
  const [pricing, setPricing] = useState({
    base_price: 8000,
    discount_rate: 20,
    bulk_threshold: 3,
  });

  // Demo Requests State
  const [demos, setDemos] = useState([]);
  
  // Users State
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (token) {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthed(true);
        localStorage.setItem("adminToken", token);
        fetchData();
      } else {
        // Don't auto-fail on load, just stay unauthed
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    fetchPricing();
    fetchDemos();
    fetchUsers();
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pricing/config`);
      if (res.ok) {
        const data = await res.json();
        setPricing(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchDemos = async () => {
    try {
        const res = await fetch(`${API_BASE}/admin/demo-requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setDemos(data);
        }
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred),
      });
      if (!res.ok) {
        setMsg("❌ Giriş başarısız.");
        return;
      }
      const data = await res.json();
      const t = data?.token;
      if (!t) {
        setMsg("❌ Token alınamadı.");
        return;
      }
      setToken(t);
      localStorage.setItem("adminToken", t);
      setAuthed(true);
      setMsg("✅ Giriş başarılı.");
      fetchData();
    } catch (err) {
      console.error(err);
      setMsg("❌ Hata oluştu.");
    }
  };

  const updatePricing = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/pricing/config`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(pricing)
        });
        if (res.ok) {
            setMsg("✅ Fiyatlandırma güncellendi.");
            setTimeout(() => setMsg(""), 3000);
            fetchPricing();
        } else {
            setMsg("❌ Güncelleme başarısız.");
        }
    } catch (e) {
        setMsg("❌ Hata oluştu.");
    }
  };

  const handleApproveDemo = async (id, email) => {
      if(!window.confirm(`${email} için demo onaylansın mı?`)) return;
      try {
          const res = await fetch(`${API_BASE}/admin/demo-requests/${id || email}/approve`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              setMsg("✅ Demo onaylandı.");
              fetchDemos();
              setTimeout(() => setMsg(""), 3000);
          } else {
              setMsg("❌ Onay başarısız.");
          }
      } catch (e) {
          console.error(e);
          setMsg("❌ Hata oluştu.");
      }
  };

  const handleRejectDemo = async (id, email) => {
      if(!window.confirm(`${email} için demo reddedilsin mi?`)) return;
      try {
          const res = await fetch(`${API_BASE}/admin/demo-requests/${id || email}/reject`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              setMsg("✅ Demo reddedildi.");
              fetchDemos();
              setTimeout(() => setMsg(""), 3000);
          } else {
              setMsg("❌ Red başarısız.");
          }
      } catch (e) {
          console.error(e);
          setMsg("❌ Hata oluştu.");
      }
  };

  const handleDeleteUser = async (email) => {
      if(!window.confirm(`${email} kullanıcısı silinsin mi?`)) return;
      try {
          const res = await fetch(`${API_BASE}/admin/users/${email}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              setMsg("✅ Kullanıcı silindi.");
              fetchUsers();
              setTimeout(() => setMsg(""), 3000);
          } else {
              setMsg("❌ Silme başarısız.");
          }
      } catch (e) {
          console.error(e);
          setMsg("❌ Hata oluştu.");
      }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="p-8 bg-white/5 rounded-xl border border-white/10 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-center text-accent">Admin Girişi</h2>
          {msg && <div className="mb-3 text-sm text-white/80">{msg}</div>}
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="text"
              value={cred.firstName}
              onChange={e => setCred(s => ({ ...s, firstName: e.target.value }))}
              placeholder="Ad"
              className="p-3 bg-black/40 rounded border border-white/15 text-white focus:border-[var(--miron-gold)] focus:outline-none"
              required
            />
            <input
              type="text"
              value={cred.lastName}
              onChange={e => setCred(s => ({ ...s, lastName: e.target.value }))}
              placeholder="Soyad"
              className="p-3 bg-black/40 rounded border border-white/15 text-white focus:border-[var(--miron-gold)] focus:outline-none"
              required
            />
            <input
              type="password"
              value={cred.password}
              onChange={e => setCred(s => ({ ...s, password: e.target.value }))}
              placeholder="Şifre"
              className="p-3 bg-black/40 rounded border border-white/15 text-white focus:border-[var(--miron-gold)] focus:outline-none"
              required
            />
            <button type="submit" className="bg-[var(--miron-gold)] hover:brightness-[1.05] text-black p-3 rounded font-bold transition">Giriş</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6 pb-12 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Paneli</h1>
        <button 
            onClick={() => {
                setAuthed(false);
                localStorage.removeItem("adminToken");
                setToken("");
            }}
            className="text-sm text-subtle hover:text-white"
        >
            Çıkış Yap
        </button>
      </div>
      
      <div className="flex gap-4 mb-8 border-b border-white/15 pb-2">
        <button 
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              activeTab === "pricing"
                ? "bg-[var(--miron-gold)] text-black"
                : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
            }`}
        >
            Fiyatlandırma
        </button>
        <button 
            onClick={() => setActiveTab("demos")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              activeTab === "demos"
                ? "bg-[var(--miron-gold)] text-black"
                : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
            }`}
        >
            Demo Talepleri
        </button>
        <button 
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              activeTab === "users"
                ? "bg-[var(--miron-gold)] text-black"
                : "bg-black/40 text-white hover:bg-black/60 border border-white/10"
            }`}
        >
            Kullanıcılar
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-green-900/50 text-green-200 rounded border border-green-500/30">{msg}</div>}

      {activeTab === "pricing" && (
        <div className="max-w-xl glass p-6 rounded-xl border border-white/10">
            <h2 className="text-xl font-semibold mb-6 text-accent">Fiyatlandırma Ayarları</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-subtle mb-1">Birim Fiyat (TL)</label>
                    <input 
                        type="number" 
                        value={pricing.base_price}
                        onChange={e => setPricing({...pricing, base_price: Number(e.target.value)})}
                        className="w-full p-3 bg-black/40 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-subtle mb-1">Toplu İndirim Oranı (%)</label>
                    <input 
                        type="number" 
                        value={pricing.discount_rate}
                        onChange={e => setPricing({...pricing, discount_rate: Number(e.target.value)})}
                        className="w-full p-3 bg-black/40 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                    />
                </div>
                <div>
                    <label className="block text-sm text-subtle mb-1">İndirim İçin Min. Kişi Sayısı</label>
                    <input 
                        type="number" 
                        value={pricing.bulk_threshold}
                        onChange={e => setPricing({...pricing, bulk_threshold: Number(e.target.value)})}
                        className="w-full p-3 bg-black/40 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                    />
                </div>
                <button 
                    onClick={updatePricing}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:opacity-90 rounded-lg font-bold transition shadow-lg"
                >
                    Ayarları Kaydet
                </button>
            </div>
        </div>
      )}

      {activeTab === "demos" && (
        <div className="glass p-6 rounded-xl border border-white/10">
            <h2 className="text-xl font-semibold mb-6 text-accent">Demo Talepleri</h2>
            {demos.length === 0 ? (
                <p className="text-subtle">Henüz talep yok.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 text-subtle">
                                <th className="p-3">Tarih</th>
                                <th className="p-3">İsim</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Kurum</th>
                                <th className="p-3">Mesaj</th>
                                <th className="p-3">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demos.map((d, i) => (
                                <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                                    <td className="p-3 text-sm">{d.date || "-"}</td>
                                    <td className="p-3">{d.name}</td>
                                    <td className="p-3">{d.email}</td>
                                    <td className="p-3">{d.lawFirm || d.office || "-"}</td>
                                    <td className="p-3 text-sm text-subtle">{d.message || d.note || "-"}</td>
                                    <td className="p-3 flex gap-2">
                                        <button 
                                            onClick={() => handleApproveDemo(d.id, d.email)}
                                            className="px-2 py-1 bg-green-600/20 text-green-300 rounded hover:bg-green-600/40 text-xs"
                                        >
                                            Onayla
                                        </button>
                                        <button 
                                            onClick={() => handleRejectDemo(d.id, d.email)}
                                            className="px-2 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/40 text-xs"
                                        >
                                            Red
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="glass p-6 rounded-xl border border-white/10">
            <h2 className="text-xl font-semibold mb-6 text-accent">Kayıtlı Kullanıcılar</h2>
            {users.length === 0 ? (
                <p className="text-subtle">Kayıtlı kullanıcı yok.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 text-subtle">
                                <th className="p-3">Email</th>
                                <th className="p-3">İsim</th>
                                <th className="p-3">Soyisim</th>
                                <th className="p-3">Kayıt Tarihi</th>
                                <th className="p-3">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                                    <td className="p-3">{u.email}</td>
                                    <td className="p-3">{u.firstName}</td>
                                    <td className="p-3">{u.lastName}</td>
                                    <td className="p-3 text-sm">{u.created_at || "-"}</td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => handleDeleteUser(u.email)}
                                            className="px-2 py-1 bg-red-600/20 text-red-300 rounded hover:bg-red-600/40 text-xs"
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

    </div>
  );
}
