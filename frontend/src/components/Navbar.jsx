import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, status } = useAuth();

  const baseNavLinks = [
    { name: "Ana Sayfa", path: "/home" },
    { name: "Analiz", path: "/analyze" },
    { name: "Yargıtay", path: "/yargitay" },
    { name: "Mevzuat", path: "/mevzuat" },
    { name: "Dava Simülasyonu", path: "/case-simulation" },
    { name: "Sözleşmeler", path: "/contracts" },
  ];

  const navLinks =
    user?.role === "admin"
      ? [
          baseNavLinks[0],
          { name: "🛡️ Admin Paneli", path: "/admin", prominent: true },
          ...baseNavLinks.slice(1),
        ]
      : baseNavLinks;

  if (status !== "authed") {
    return (
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-white">
            Miron<span className="text-[var(--miron-gold)]">.AI</span>
          </Link>

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
              to="/pricing"
              className="hidden sm:inline px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-700 text-black hover:brightness-110 transition"
            >
              Premium
            </Link>
            <Link to="/login" className="text-white/70 hover:text-white transition">
              Giriş Yap
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition"
            >
              15 Gün Ücretsiz
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--miron-gold)] rounded-lg flex items-center justify-center font-bold text-black text-xl">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Miron AI</span>
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
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/upgrade"
            className="text-sm font-bold px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-black hover:brightness-110 transition shadow-lg shadow-amber-900/30"
          >
            Premium
          </Link>
          <Link to="/notifications" className="relative group">
            <span className="text-xl">🔔</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
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
              {user?.role === "admin" && (
                <Link to="/admin" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                  🛡️ Admin Paneli
                </Link>
              )}
              <Link to="/settings" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                Ayarlar
              </Link>
              <Link to="/feedback" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
                Geri Bildirim
              </Link>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-2xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#050505] border-t border-white/10 p-6 absolute w-full left-0 top-20">
          <div className="flex flex-col gap-4">
            <Link
              to="/upgrade"
              onClick={() => setMenuOpen(false)}
              className="text-lg font-bold text-center py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 text-black"
            >
              Premium
            </Link>
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
                {link.name}
              </Link>
            ))}
            <div className="h-px bg-white/10 my-2" />
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="text-lg text-white/70">
              Bildirimler
            </Link>
            <Link to="/settings" onClick={() => setMenuOpen(false)} className="text-lg text-white/70">
              Ayarlar
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
