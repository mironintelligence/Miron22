import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [cred, setCred] = useState({ email: "", password: "", otp: "" });
  const [mfaSetup, setMfaSetup] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  // Data States
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({ search: "", role: "", active: "" });
  const [selectedEmails, setSelectedEmails] = useState({});
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user", is_active: true });
  const [bulk, setBulk] = useState({ action: "set_role", role: "user", password: "" });
  const [importText, setImportText] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditUserId, setAuditUserId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [demos, setDemos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  
  // Forms
  const [newDiscount, setNewDiscount] = useState({
    code: "", type: "percent", value: 0, max_usage: "", expires_at: "", description: ""
  });
  const [notif, setNotif] = useState({ title: "", message: "", type: "admin" });
  const [notifMode, setNotifMode] = useState("broadcast");
  const [notifUserId, setNotifUserId] = useState("");

  useEffect(() => {
    if (token) checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/health`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setAuthed(true);
        localStorage.setItem("adminToken", token);
        refreshAll();
      }
    } catch (e) { console.error(e); }
  };

  const refreshAll = () => {
    fetchStats();
    fetchConfig();
    fetchUsers();
    fetchDemos();
    fetchDiscounts();
  };

  const showMsg = (text, type = "info") => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(""), 4000);
  };

  const fetchWithAuth = async (url, options = {}) => {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(url, e);
      return null;
    }
  };

  const fetchStats = async () => setStats(await fetchWithAuth("/admin/stats"));
  const fetchConfig = async () => setConfig(await fetchWithAuth("/admin/config"));
  const fetchUsers = async () => {
    const qs = new URLSearchParams();
    if (userFilters.search) qs.set("search", userFilters.search);
    if (userFilters.role) qs.set("role", userFilters.role);
    if (userFilters.active !== "") qs.set("active", userFilters.active === "true" ? "true" : "false");
    const path = `/admin/users${qs.toString() ? `?${qs.toString()}` : ""}`;
    setUsers((await fetchWithAuth(path)) || []);
  };
  const fetchDemos = async () => setDemos(await fetchWithAuth("/admin/demo-requests") || []);
  const fetchDiscounts = async () => setDiscounts(await fetchWithAuth("/api/pricing/discount-codes") || []);
  const fetchLogs = async () => {
    const data = await fetchWithAuth("/admin/logs/system?lines=100");
    if (data?.logs) setLogs(data.logs);
  };

  const fetchAudit = async () => {
    const qs = new URLSearchParams();
    qs.set("limit", "200");
    if (auditUserId) qs.set("user_id", auditUserId);
    const data = await fetchWithAuth(`/admin/audit-logs?${qs.toString()}`);
    setAuditLogs(Array.isArray(data) ? data : []);
  };

  const fetchSessions = async () => {
    const data = await fetchWithAuth("/admin/sessions?limit=200");
    setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cred.email, password: cred.password, otp: cred.otp || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Giriş başarısız");
      if (data?.mfa_setup_required) {
        setMfaSetup({ secret: data.secret, otpauth_url: data.otpauth_url });
        showMsg("2FA kurulumu gerekli. Authenticator uygulamanıza ekleyip kodu girin.", "error");
        return;
      }
      setToken(data.token);
      localStorage.setItem("adminToken", data.token);
      setAuthed(true);
      setMfaSetup(null);
      showMsg("✅ Giriş başarılı", "success");
      refreshAll();
    } catch (e) {
      showMsg(e.message || "❌ Giriş hatası", "error");
    }
  };

  const confirmMfa = async () => {
    if (!mfaSetup?.secret) return;
    try {
      const res = await fetch(`${API_BASE}/admin/2fa/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cred.email, password: cred.password, secret: mfaSetup.secret, otp: cred.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "2FA doğrulanamadı");
      setToken(data.token);
      localStorage.setItem("adminToken", data.token);
      setAuthed(true);
      setMfaSetup(null);
      showMsg("✅ 2FA aktif edildi ve giriş tamamlandı", "success");
      refreshAll();
    } catch (e) {
      showMsg(e.message || "2FA doğrulanamadı", "error");
    }
  };

  const toggleEmergency = async (val) => {
    if (!window.confirm(`ACİL DURUM MODU: ${val ? "AÇILSIN MI? (Sistem Kapanır)" : "KAPATILSIN MI?"}`)) return;
    const res = await fetchWithAuth("/admin/emergency-switch", { method: "POST", body: JSON.stringify({ enable: val }) });
    if (res?.ok) {
      setConfig(prev => ({ ...prev, maintenance_mode: res.maintenance_mode }));
      showMsg(`Acil durum modu ${val ? "AKTİF" : "PASİF"}`, val ? "error" : "success");
    }
  };

  const toggleUserSuspend = async (email, active) => {
    const res = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/suspend`, { method: "PUT", body: JSON.stringify({ active }) });
    if (res?.ok) {
      showMsg(`Kullanıcı ${active ? "aktif edildi" : "askıya alındı"}`, "success");
      fetchUsers();
    }
  };

  const updateUserRole = async (email, newRole) => {
    const res = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/role`, { method: "PUT", body: JSON.stringify({ role: newRole }) });
    if (res?.ok) {
      showMsg(`Rol güncellendi: ${newRole}`, "success");
      fetchUsers();
    }
  };

  const createDiscount = async () => {
    const payload = {
      code: newDiscount.code.toUpperCase(),
      type: newDiscount.type,
      value: Number(newDiscount.value),
      max_usage: newDiscount.max_usage ? Number(newDiscount.max_usage) : null,
      expires_at: newDiscount.expires_at || null,
      description: newDiscount.description || null
    };
    const res = await fetchWithAuth("/api/pricing/discount-codes", { method: "POST", body: JSON.stringify(payload) });
    if (res?.status === "ok" || res?.code) {
      showMsg("✅ İndirim kodu oluşturuldu", "success");
      fetchDiscounts();
      setNewDiscount({ code: "", type: "percent", value: 0, max_usage: "", expires_at: "", description: "" });
    } else showMsg("❌ Kod oluşturulamadı", "error");
  };

  const sendNotification = async () => {
    if (!notif.title || !notif.message) return showMsg("Başlık ve mesaj gerekli", "error");
    if (notifMode === "user") {
      if (!notifUserId) return showMsg("Kullanıcı seçiniz", "error");
      const res = await fetchWithAuth("/api/notifications/send", {
        method: "POST",
        body: JSON.stringify({ ...notif, user_id: notifUserId })
      });
      if (res?.status === "ok") {
        showMsg("✅ Duyuru gönderildi", "success");
        setNotif({ title: "", message: "", type: "admin" });
        return;
      }
      return showMsg("❌ Gönderim hatası", "error");
    }
    const res = await fetchWithAuth("/api/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(notif)
    });
    if (res?.status === "ok") {
      showMsg(`✅ Duyuru gönderildi: ${res.count} kişi`, "success");
      setNotif({ title: "", message: "", type: "admin" });
    } else {
      showMsg("❌ Gönderim hatası", "error");
    }
  };

  const approveDemo = async (idOrEmail) => {
    const res = await fetchWithAuth(`/admin/demo-requests/${encodeURIComponent(idOrEmail)}/approve`, { method: "POST" });
    if (res?.ok) {
      showMsg("Demo talebi onaylandı", "success");
      fetchDemos();
    } else {
      showMsg("Demo talebi onaylanamadı", "error");
    }
  };

  const rejectDemo = async (idOrEmail) => {
    const res = await fetchWithAuth(`/admin/demo-requests/${encodeURIComponent(idOrEmail)}/reject`, { method: "POST" });
    if (res?.ok) {
      showMsg("Demo talebi reddedildi", "success");
      fetchDemos();
    } else {
      showMsg("Demo talebi reddedilemedi", "error");
    }
  };

  const logoutAdmin = async () => {
    try {
      await fetchWithAuth("/admin/logout", { method: "POST", body: JSON.stringify({}) });
    } catch (e) {
      return;
    } finally {
      setAuthed(false);
      setToken("");
      localStorage.removeItem("adminToken");
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) return showMsg("E-posta ve şifre gerekli", "error");
    const res = await fetchWithAuth("/admin/users", { method: "POST", body: JSON.stringify(newUser) });
    if (res?.ok) {
      showMsg("✅ Kullanıcı oluşturuldu", "success");
      setNewUser({ username: "", email: "", password: "", role: "user", is_active: true });
      fetchUsers();
    } else {
      showMsg("❌ Kullanıcı oluşturulamadı", "error");
    }
  };

  const deleteUserByEmail = async (email) => {
    if (!window.confirm(`${email} silinsin mi?`)) return;
    const res = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" });
    if (res?.ok) {
      showMsg("✅ Kullanıcı silindi", "success");
      fetchUsers();
    } else {
      showMsg("❌ Silme hatası", "error");
    }
  };

  const setPassword = async (email) => {
    const pw = window.prompt("Yeni şifre:");
    if (!pw) return;
    const res = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password: pw }),
    });
    if (res?.ok) showMsg("✅ Şifre güncellendi", "success");
    else showMsg("❌ Şifre güncellenemedi", "error");
  };

  const applyBulk = async () => {
    const emails = Object.keys(selectedEmails).filter((k) => selectedEmails[k]);
    if (!emails.length) return showMsg("Seçili kullanıcı yok", "error");
    const payload = { action: bulk.action, emails };
    if (bulk.action === "set_role") payload.role = bulk.role;
    if (bulk.action === "set_password") payload.password = bulk.password;
    const res = await fetchWithAuth("/admin/users/bulk", { method: "POST", body: JSON.stringify(payload) });
    if (res?.ok) {
      showMsg(`✅ Toplu işlem tamam: ${res.updated} güncellendi, ${res.deleted} silindi`, "success");
      setSelectedEmails({});
      fetchUsers();
    } else {
      showMsg("❌ Toplu işlem hatası", "error");
    }
  };

  const exportUsers = async (format) => {
    try {
      const qs = new URLSearchParams();
      qs.set("format", format);
      const res = await fetch(`${API_BASE}/admin/users/export?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export başarısız");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "users.json" : "users.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showMsg("❌ Export başarısız", "error");
    }
  };

  const importUsers = async () => {
    try {
      const parsed = JSON.parse(importText || "[]");
      if (!Array.isArray(parsed) || parsed.length === 0) return showMsg("Import için JSON array gerekli", "error");
      const res = await fetchWithAuth("/admin/users/import", {
        method: "POST",
        body: JSON.stringify({ mode: "upsert", users: parsed }),
      });
      if (res?.ok) {
        showMsg(`✅ Import: ${res.created} oluşturuldu, ${res.updated} güncellendi`, "success");
        setImportText("");
        fetchUsers();
      } else {
        showMsg("❌ Import başarısız", "error");
      }
    } catch (e) {
      showMsg("❌ Geçersiz JSON", "error");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-amber-500 font-mono">
        <div className="p-10 border border-amber-900/30 bg-black rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center tracking-widest">MIRON YÖNETİM PANELİ</h1>
          {msg && <div className="mb-4 text-sm text-red-500 text-center">{msg}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-posta"
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white focus:border-amber-600 outline-none"
              value={cred.email}
              onChange={(e) => setCred({ ...cred, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Şifre"
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white focus:border-amber-600 outline-none"
              value={cred.password}
              onChange={(e) => setCred({ ...cred, password: e.target.value })}
            />

            {mfaSetup?.secret && (
              <div className="border border-amber-900/30 rounded-xl p-4 bg-amber-900/5 text-xs text-amber-200/80 space-y-2">
                <div className="font-bold text-amber-400">2FA Kurulumu</div>
                <div>Authenticator uygulamanıza ekleyin:</div>
                <div className="font-mono break-all">{mfaSetup.otpauth_url}</div>
                <div className="font-mono">Secret: {mfaSetup.secret}</div>
              </div>
            )}

            <input
              type="text"
              placeholder="2FA Kodu (6 hane)"
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white focus:border-amber-600 outline-none"
              value={cred.otp}
              onChange={(e) => setCred({ ...cred, otp: e.target.value })}
            />

            {mfaSetup?.secret ? (
              <button
                type="button"
                onClick={confirmMfa}
                className="w-full bg-amber-700 text-black font-bold py-3 hover:bg-amber-600 transition"
              >
                2FA Doğrula ve Giriş
              </button>
            ) : (
              <button className="w-full bg-amber-700 text-black font-bold py-3 hover:bg-amber-600 transition">
                Giriş Yap
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-amber-900 selection:text-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur border-b border-amber-900/20 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="text-amber-500 font-bold tracking-widest text-lg">MIRON <span className="text-white opacity-50">ADMIN</span></div>
          {config?.maintenance_mode && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">BAKIM MODU AKTİF</span>}
        </div>
        <div className="flex gap-4">
          <button onClick={logoutAdmin} className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wide">Çıkış</button>
        </div>
      </div>

      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-800 pb-1">
          {["stats", "users", "demos", "notifications", "audit", "sessions", "master", "logs", "discounts"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "logs") fetchLogs();
                if (tab === "audit") fetchAudit();
                if (tab === "sessions") fetchSessions();
                if (tab === "users") fetchUsers();
              }}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === tab ? "text-amber-500 border-b-2 border-amber-500" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {tab === "stats"
                ? "İstatistik"
                : tab === "users"
                ? "Kullanıcılar"
                : tab === "demos"
                ? "Demo Talepleri"
                : tab === "notifications"
                ? "Duyurular"
                : tab === "audit"
                ? "Aktivite"
                : tab === "sessions"
                ? "Oturumlar"
                : tab === "master"
                ? "Sistem"
                : tab === "discounts"
                ? "İndirim Kodları"
                : "Loglar"}
            </button>
          ))}
        </div>

        {/* Messages */}
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
            className={`mb-6 p-4 rounded border ${msgType === "error" ? "border-red-900 bg-red-900/10 text-red-400" : "border-green-900 bg-green-900/10 text-green-400"}`}>
            {msg}
          </motion.div>
        )}

        {/* STATS DASHBOARD */}
        {activeTab === "stats" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Total Users" value={stats.total_users} />
            <StatCard label="Active Users" value={stats.active_users} color="text-green-400" />
            <StatCard label="Demo Users" value={stats.demo_users} color="text-blue-400" />
            <StatCard label="Pending Demos" value={stats.pending_requests} color="text-amber-400" />
            <div className="md:col-span-4 bg-zinc-900/30 p-6 rounded border border-zinc-800">
              <div className="text-xs text-zinc-500 uppercase mb-2">Sistem Durumu</div>
              <div className="text-xl text-white font-mono">{stats.system_status}</div>
              <div className="text-xs text-zinc-600 mt-1">Last Restart: {stats.last_restart}</div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-amber-500 font-bold mb-6">DUYURU GÖNDER</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">HEDEF</label>
                  <select
                    value={notifMode}
                    onChange={(e) => setNotifMode(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-3 text-white rounded focus:border-amber-500 outline-none"
                  >
                    <option value="broadcast">Tüm kullanıcılar</option>
                    <option value="user">Tek kullanıcı</option>
                  </select>
                </div>
                {notifMode === "user" && (
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">KULLANICI</label>
                    <select
                      value={notifUserId}
                      onChange={(e) => setNotifUserId(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-3 text-white rounded focus:border-amber-500 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      {users.map((u) => (
                        <option key={u.id || u.email} value={u.id}>
                          {u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">BAŞLIK</label>
                  <input className="w-full bg-black border border-zinc-700 p-3 text-white rounded focus:border-amber-500 outline-none" 
                    value={notif.title} onChange={e => setNotif({...notif, title: e.target.value})} placeholder="Örn: Sistem Bakımı" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">MESAJ</label>
                  <textarea className="w-full bg-black border border-zinc-700 p-3 text-white rounded h-32 focus:border-amber-500 outline-none resize-none" 
                    value={notif.message} onChange={e => setNotif({...notif, message: e.target.value})} placeholder="Duyuru içeriği..." />
                </div>
                <button onClick={sendNotification} className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-500 transition">
                  {notifMode === "broadcast" ? "TÜM KULLANICILARA GÖNDER" : "KULLANICIYA GÖNDER"}
                </button>
              </div>
            </div>
            
            <div className="bg-zinc-900/10 p-6 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-600 text-sm">
              Burada geçmiş bildirimlerin logları listelenebilir.
            </div>
          </div>
        )}

        {/* MASTER CONTROL */}
        {activeTab === "master" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-900/5 border border-red-900/30 p-6 rounded-xl">
              <h3 className="text-red-500 font-bold mb-4 tracking-widest">SİSTEM KONTROLLERİ</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Bakım Modu</div>
                  <div className="text-xs text-red-400">Kullanıcı erişimini geçici olarak kapatır.</div>
                </div>
                <button 
                  onClick={() => toggleEmergency(!config?.maintenance_mode)}
                  className={`px-4 py-2 rounded font-bold text-sm ${config?.maintenance_mode ? "bg-green-600 text-white" : "bg-red-600 text-black"}`}
                >
                  {config?.maintenance_mode ? "SİSTEMİ AÇ" : "SİSTEMİ KAPAT"}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-xl">
              <h3 className="text-amber-500 font-bold mb-4 tracking-widest">SYSTEM CONFIG</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Kayıt Olma</span>
                  <span className="text-green-500 font-mono">AÇIK</span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Kullanıcı Token Limiti</span>
                  <span className="text-amber-500 font-mono">1000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-xl">
                <div className="text-amber-500 font-bold mb-4 tracking-widest">KULLANICI OLUŞTUR</div>
                <div className="space-y-3">
                  <input
                    className="w-full bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                    placeholder="Kullanıcı Adı (Ad Soyad)"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                  <input
                    className="w-full bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                    placeholder="E-posta"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <input
                    className="w-full bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                    placeholder="Şifre"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="user">Normal User</option>
                      <option value="demo">Demo User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      className="bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                      value={newUser.is_active ? "true" : "false"}
                      onChange={(e) => setNewUser({ ...newUser, is_active: e.target.value === "true" })}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </div>
                  <button onClick={createUser} className="w-full bg-amber-600 text-black font-bold py-3 rounded hover:bg-amber-500 transition">
                    Oluştur
                  </button>
                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-2">IMPORT (JSON)</div>
                    <textarea
                      className="w-full bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500 h-28 resize-none text-xs font-mono"
                      placeholder='[{"email":"a@b.com","password":"...","role":"user","is_active":true,"username":"Ad Soyad"}]'
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <button onClick={importUsers} className="w-full mt-2 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500 transition text-sm">
                      Import Et
                    </button>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      className="flex-1 bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                      placeholder="Ara (email / ad / soyad)"
                      value={userFilters.search}
                      onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                    />
                    <select
                      className="bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                      value={userFilters.role}
                      onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                    >
                      <option value="">Tüm Roller</option>
                      <option value="user">User</option>
                      <option value="demo">Demo</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      className="bg-black border border-zinc-700 p-3 text-white rounded outline-none focus:border-amber-500"
                      value={userFilters.active}
                      onChange={(e) => setUserFilters({ ...userFilters, active: e.target.value })}
                    >
                      <option value="">Tümü</option>
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={fetchUsers} className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5">
                      Yenile
                    </button>
                    <button onClick={() => exportUsers("csv")} className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5">
                      CSV Export
                    </button>
                    <button onClick={() => exportUsers("json")} className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5">
                      JSON Export
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="text-xs text-zinc-500">
                    Seçili: <span className="text-white font-bold">{Object.keys(selectedEmails).filter((k) => selectedEmails[k]).length}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <select
                      className="bg-black border border-zinc-700 p-2 text-white rounded outline-none focus:border-amber-500 text-sm"
                      value={bulk.action}
                      onChange={(e) => setBulk({ ...bulk, action: e.target.value })}
                    >
                      <option value="activate">Toplu Aktifleştir</option>
                      <option value="suspend">Toplu Pasifleştir</option>
                      <option value="set_role">Toplu Rol Ata</option>
                      <option value="set_password">Toplu Şifre Ata</option>
                      <option value="delete">Toplu Sil</option>
                    </select>
                    {bulk.action === "set_role" && (
                      <select
                        className="bg-black border border-zinc-700 p-2 text-white rounded outline-none focus:border-amber-500 text-sm"
                        value={bulk.role}
                        onChange={(e) => setBulk({ ...bulk, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="demo">Demo</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {bulk.action === "set_password" && (
                      <input
                        className="bg-black border border-zinc-700 p-2 text-white rounded outline-none focus:border-amber-500 text-sm"
                        placeholder="Yeni şifre"
                        value={bulk.password}
                        onChange={(e) => setBulk({ ...bulk, password: e.target.value })}
                      />
                    )}
                    <button onClick={applyBulk} className="bg-blue-600 text-white font-bold px-4 py-2 rounded hover:bg-blue-500 transition text-sm">
                      Uygula
                    </button>
                  </div>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 text-xs uppercase text-zinc-500 border-b border-zinc-800">
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={users.length > 0 && users.every((u) => selectedEmails[u.email])}
                          onChange={(e) => {
                            const next = {};
                            if (e.target.checked) users.forEach((u) => (next[u.email] = true));
                            setSelectedEmails(next);
                          }}
                        />
                      </th>
                      <th className="p-4">Kullanıcı</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4">Durum</th>
                      <th className="p-4">Kayıt</th>
                      <th className="p-4">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {users.map((u) => (
                      <tr key={u.email} className="hover:bg-zinc-900/30 transition">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={!!selectedEmails[u.email]}
                            onChange={(e) => setSelectedEmails((p) => ({ ...p, [u.email]: e.target.checked }))}
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white">
                            {(u.first_name || "-") + " " + (u.last_name || "")}
                          </div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.role || "user"}
                            onChange={(e) => updateUserRole(u.email, e.target.value)}
                            className="bg-black border border-zinc-700 text-xs rounded p-2 text-zinc-300 outline-none focus:border-amber-500"
                          >
                            <option value="user">User</option>
                            <option value="demo">Demo</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              u.is_active !== false ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                            }`}
                          >
                            {u.is_active !== false ? "AKTİF" : "PASİF"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-zinc-500">{u.created_at?.split("T")[0]}</td>
                        <td className="p-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleUserSuspend(u.email, !(u.is_active !== false))}
                            className="text-xs border border-zinc-700 px-2 py-1 rounded hover:bg-white/5"
                          >
                            {u.is_active !== false ? "Pasifleştir" : "Aktifleştir"}
                          </button>
                          <button
                            onClick={() => setPassword(u.email)}
                            className="text-xs border border-zinc-700 px-2 py-1 rounded hover:bg-white/5"
                          >
                            Şifre
                          </button>
                          <button
                            onClick={() => deleteUserByEmail(u.email)}
                            className="text-xs border border-red-900/40 px-2 py-1 rounded hover:bg-red-900/20 text-red-400"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 ? <div className="p-6 text-sm text-zinc-600">Kullanıcı bulunamadı.</div> : null}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center gap-3">
              <div className="text-amber-500 font-bold tracking-widest">AKTİVİTE LOGLARI</div>
              <div className="flex-1" />
              <select
                value={auditUserId}
                onChange={(e) => setAuditUserId(e.target.value)}
                className="bg-black border border-zinc-700 p-2 text-white rounded outline-none focus:border-amber-500 text-sm"
              >
                <option value="">Tüm kullanıcılar</option>
                {users.map((u) => (
                  <option key={u.id || u.email} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
              <button onClick={fetchAudit} className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5">
                Yenile
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-zinc-500 uppercase text-xs">
                  <tr>
                    <th className="p-3">Zaman</th>
                    <th className="p-3">Kullanıcı</th>
                    <th className="p-3">Aksiyon</th>
                    <th className="p-3">Kaynak</th>
                    <th className="p-3">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {auditLogs.map((l, idx) => (
                    <tr key={l.id || idx} className="hover:bg-zinc-900/30">
                      <td className="p-3 text-xs text-zinc-500">{String(l.created_at || "").replace("T", " ").slice(0, 19)}</td>
                      <td className="p-3 text-xs text-zinc-400 font-mono">{l.user_id || "-"}</td>
                      <td className="p-3 text-white">{l.action || "-"}</td>
                      <td className="p-3 text-zinc-400">{l.resource || "-"}</td>
                      <td className="p-3 text-xs text-zinc-500">
                        <span className="font-mono break-all">{l.details ? JSON.stringify(l.details) : "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 ? <div className="p-6 text-sm text-zinc-600">Log bulunamadı.</div> : null}
            </div>
          </div>
        )}

        {/* SESSIONS */}
        {activeTab === "sessions" && (
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="text-amber-500 font-bold tracking-widest">ADMIN OTURUMLARI</div>
              <button onClick={fetchSessions} className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5">
                Yenile
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-zinc-500 uppercase text-xs">
                  <tr>
                    <th className="p-3">Oluşturma</th>
                    <th className="p-3">Son Görülme</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">IP</th>
                    <th className="p-3">Durum</th>
                    <th className="p-3">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {sessions.map((s, idx) => (
                    <tr key={s.jti || idx} className="hover:bg-zinc-900/30">
                      <td className="p-3 text-xs text-zinc-500">{String(s.created_at || "").replace("T", " ").slice(0, 19)}</td>
                      <td className="p-3 text-xs text-zinc-500">{String(s.last_seen_at || "").replace("T", " ").slice(0, 19)}</td>
                      <td className="p-3 text-xs text-zinc-400 font-mono">{s.admin_id}</td>
                      <td className="p-3 text-xs text-zinc-400 font-mono">{s.ip || "-"}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded ${s.revoked ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
                          {s.revoked ? "REVOKE" : "AKTİF"}
                        </span>
                      </td>
                      <td className="p-3">
                        {!s.revoked ? (
                          <button
                            onClick={async () => {
                              const r = await fetchWithAuth(`/admin/sessions/${encodeURIComponent(s.jti)}/revoke`, { method: "POST", body: JSON.stringify({}) });
                              if (r?.ok) {
                                showMsg("✅ Oturum iptal edildi", "success");
                                fetchSessions();
                              } else {
                                showMsg("❌ Oturum iptal edilemedi", "error");
                              }
                            }}
                            className="text-xs border border-red-900/40 px-2 py-1 rounded hover:bg-red-900/20 text-red-400"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessions.length === 0 ? <div className="p-6 text-sm text-zinc-600">Oturum yok.</div> : null}
            </div>
          </div>
        )}

        {/* LOGS VIEWER */}
        {activeTab === "logs" && (
          <div className="bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs h-[600px] overflow-auto">
            {logs.length === 0 ? <div className="text-zinc-600">Log bulunamadı.</div> : 
              logs.map((line, i) => (
                <div key={i} className="mb-1 border-b border-zinc-900 pb-1 text-zinc-400 hover:text-white transition-colors">
                  {line}
                </div>
              ))
            }
          </div>
        )}

        {/* DISCOUNT CODES */}
        {activeTab === "discounts" && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-zinc-900/30 p-4 rounded border border-zinc-800">
                <h3 className="text-amber-500 font-bold mb-4">İNDİRİM KODU OLUŞTUR</h3>
                <input className="w-full bg-black border border-zinc-700 p-2 mb-2 text-white rounded" placeholder="KOD (örn: BAHAR25)" 
                  value={newDiscount.code} onChange={e => setNewDiscount({...newDiscount, code: e.target.value})} />
                <div className="flex gap-2 mb-2">
                  <select className="bg-black border border-zinc-700 p-2 text-white rounded flex-1"
                    value={newDiscount.type} onChange={e => setNewDiscount({...newDiscount, type: e.target.value})}>
                    <option value="percent">% Yüzde</option>
                    <option value="fixed">Sabit Tutar</option>
                  </select>
                  <input type="number" className="bg-black border border-zinc-700 p-2 text-white rounded w-24" placeholder="Değer"
                    value={newDiscount.value} onChange={e => setNewDiscount({...newDiscount, value: e.target.value})} />
                </div>
                <button onClick={createDiscount} className="w-full bg-amber-600 text-black font-bold py-2 rounded hover:bg-amber-500">Oluştur</button>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-zinc-900/20 border border-zinc-800 rounded overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/50 text-zinc-500 uppercase text-xs">
                    <tr><th className="p-3">Kod</th><th className="p-3">Değer</th><th className="p-3">Durum</th></tr>
                  </thead>
                  <tbody>
                    {discounts.map(d => (
                      <tr key={d.code} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                        <td className="p-3 font-mono text-white">{d.code}</td>
                        <td className="p-3 text-amber-500">{d.value} {d.type === 'percent' ? '%' : 'TL'}</td>
                        <td className="p-3"><span className={d.active ? "text-green-500" : "text-red-500"}>{d.active ? "AKTİF" : "PASİF"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DEMO REQUESTS */}
        {activeTab === "demos" && (
          <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
              <div className="text-zinc-400 text-sm">
                Toplam: <span className="text-white font-bold">{demos.length}</span>
              </div>
              <button
                onClick={fetchDemos}
                className="text-xs border border-zinc-700 px-3 py-2 rounded hover:bg-white/5"
              >
                Yenile
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="p-3">Kişi</th>
                  <th className="p-3">E-posta</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Süre</th>
                  <th className="p-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {demos.map((d) => (
                  <tr key={d.id || d.email} className="hover:bg-zinc-900/30 transition">
                    <td className="p-3 text-white">
                      {(d.first_name || "-") + " " + (d.last_name || "")}
                    </td>
                    <td className="p-3 text-zinc-300 font-mono">{d.email}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${d.status === "approved" ? "bg-green-900/30 text-green-400" : d.status === "rejected" ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"}`}>
                        {d.status === "approved" ? "ONAYLANDI" : d.status === "rejected" ? "RED" : "BEKLİYOR"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      {d.approved_until ? String(d.approved_until).split("T")[0] : "—"}
                    </td>
                    <td className="p-3">
                      {d.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveDemo(d.id || d.email)}
                            className="text-xs border border-green-900/40 px-2 py-1 rounded hover:bg-green-900/20 text-green-400"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => rejectDemo(d.id || d.email)}
                            className="text-xs border border-red-900/40 px-2 py-1 rounded hover:bg-red-900/20 text-red-400"
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {demos.length === 0 ? <div className="p-6 text-sm text-zinc-600">Demo talebi yok.</div> : null}
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between">
      <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
