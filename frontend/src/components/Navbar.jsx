import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { authFetch } from "../auth/api";
import { useVisiblePolling } from "../hooks/useVisiblePolling";

function BetaBadge() {
  return (
    <span className="ml-1.5 align-middle text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold tracking-wide">
      BETA
    </span>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, status, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const baseNavLinks = [
    { name: "Ana Sayfa", path: "/dashboard" },
    { name: "Analiz", path: "/analyze" },
    { name: "Yargıtay Karar Arama", path: "/yargitay", beta: true },
    { name: "Mevzuat Analizi", path: "/mevzuat", beta: true },
    { name: "Dava Simülasyonu", path: "/case-simulation" },
    { name: "Sözleşmeler", path: "/contracts/builder" },
  ];

  const navLinks = baseNavLinks;

  // 60s cadence is enough for a "you have unread" badge; the old 12s loop ran
  // ~5x/minute/user with no visibility gating.
  useVisiblePolling(
    async (signal) => {
      try {
        const res = await authFetch("/api/notifications/unread-count");
        const data = await res.json().catch(() => ({}));
        if (!signal.cancelled) setUnreadCount(Number(data?.count || 0));
      } catch {
        if (!signal.cancelled) setUnreadCount(0);
      }
    },
    {
      enabled: status === "authed",
      intervalMs: 60000,
      refetchOnEvents: ["notifications:changed"],
    },
    [status]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (status !== "authed") {
    return (
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/" className="text-xl font-bold tracking-tight text-white">
              Miron AI
            </Link>
            <Link
              to="/deneme-baslat"
              className="text-[11px] sm:text-xs font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap"
            >
              15 Günlük Deneme
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/about" className="text-sm font-medium text-white/70 hover:text-white transition">
              Biz Kimiz?
            </Link>
            <div className="relative group">
              <button
                type="button"
                className="text-sm font-medium text-white/70 hover:text-white transition flex items-center gap-1"
              >
                Kurumsal <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute left-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/privacy" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                  Gizlilik Politikası
                </Link>
                <Link to="/terms" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                  Kullanım Şartları
                </Link>
                <Link to="/user-agreement" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                  Kullanıcı Sözleşmesi
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/kaydol"
              className="hidden sm:inline px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-700 text-black hover:brightness-110 transition"
            >
              15 günlük ücretsiz deneme
            </Link>
            <Link to="/login" className="text-white/70 hover:text-white transition">
              Giriş Yap
            </Link>
            <Link to="/kaydol" className="px-5 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition">
              Kaydol
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold tracking-tight text-white">
          Miron AI
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                link.prominent
                  ? "px-3 py-2 rounded-xl bg-[var(--miron-gold)] text-black hover:brightness-110"
                  : location.pathname === link.path
                    ? "text-[var(--miron-gold)]"
                    : "text-white/60 hover:text-white"
              }`}
            >
              <span>{link.name}</span>
              {link.beta ? <BetaBadge /> : null}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/notifications" className="relative group p-1" aria-label="Bildirimler">
            <Bell
              className={`h-6 w-6 transition-colors ${unreadCount > 0 ? "text-amber-400" : "text-white/30"}`}
              strokeWidth={unreadCount > 0 ? 2.25 : 1.5}
            />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold border-2 border-[#050505]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative group">
            <button type="button" className="flex items-center gap-3 outline-none">
              <div className="text-right hidden lg:block">
                <div className="text-sm font-bold text-white">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-wider">
                  {user.role === "admin" ? "Yönetici" : "Avukat"}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/20 flex items-center justify-center text-white font-bold">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </div>
            </button>

            <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
              <Link to="/upgrade" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                Abonelik
              </Link>
              <div className="h-px bg-white/10 my-2" />
              <button type="button" onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-white/5">
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden text-white p-2 -mr-2 rounded hover:bg-white/10 transition"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

          {menuOpen && (
        <div className="md:hidden bg-[#050505] border-t border-white/10 p-6 absolute w-full left-0 top-20">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-medium ${
                  link.prominent
                    ? "text-black bg-[var(--miron-gold)] px-3 py-2 rounded-xl"
                    : location.pathname === link.path
                      ? "text-[var(--miron-gold)]"
                      : "text-white/70"
                }`}
              >
                <span>{link.name}</span>
                {link.beta ? <BetaBadge /> : null}
              </Link>
            ))}
            <div className="h-px bg-white/10 my-2" />
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="text-lg text-white/70">
              Bildirimler
            </Link>
            <Link to="/upgrade" onClick={() => setMenuOpen(false)} className="text-lg text-white/70">
              Abonelik
            </Link>
            <button type="button" onClick={handleLogout} className="text-left text-red-300">
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
