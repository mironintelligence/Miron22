import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Header({ onOpenLogin }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const authed = status === "authed";
  const loading = status === "loading";

  const links = useMemo(() => {
    if (authed) {
      const list = [
        { to: "/home", label: "Ana Menü" },
        { to: "/case-simulation", label: "Dava Simülasyonu" },
        { to: "/yargitay", label: "Yargıtay Kararları" },
        { to: "/pleadings", label: "Dilekçe Oluşturucu" },
        { to: "/assistant", label: "Asistan" },
        { to: "/calculators", label: "Hesaplama Araçları" },
      ];
      if (user?.role === "admin") {
        list.push({ to: "/admin", label: "Admin Paneli" });
      }
      return list;
    }
    return [
      { to: "/", label: "Tanıtım" },
      { to: "/terms", label: "Kullanım Şartları" },
      { to: "/privacy", label: "Gizlilik" },
      { to: "/user-agreement", label: "Kullanıcı Sözleşmesi" },
    ];
  }, [authed]);

  const onLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="w-full bg-black/40 border-b border-white/10 text-white backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Menü"
            >
              <span className="text-xl leading-none">☰</span>
            </button>

            <Link to={authed ? "/home" : "/"} className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Miron AI" className="h-8 w-auto rounded-md object-contain" onError={(e) => e.target.style.display = 'none'} />
              <div className="flex flex-col leading-tight">
                <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Miron AI
                </span>
                {!authed && (
                  <span className="text-[10px] text-white/60 uppercase tracking-widest -mt-1">
                    by Miron Intelligence
                  </span>
                )}
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {!loading &&
              links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    [
                      "text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-white/80 hover:text-white",
                    ].join(" ")
                  }
                >
                  {l.label}
                </NavLink>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            {loading ? null : authed ? (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <div className="text-xs text-white/80">
                    {(user?.firstName || user?.lastName)
                      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                      : user?.email || ""}
                  </div>
                  <div className="text-[10px] text-white/60">Oturum açık</div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--miron-panel)] border border-accent hover:bg-[var(--miron-panel-2)] text-white transition"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--miron-gold)] text-black hover:brightness-105 transition"
                >
                  Giriş Yap
                </button>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-accent text-[var(--miron-gold)] hover:bg-[rgba(255,215,0,0.12)] transition"
                >
                  Kaydol
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {!loading && menuOpen ? (
        <div className="md:hidden border-t border-white/10 bg-black/35 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  [
                    "block px-4 py-3 rounded-xl border transition",
                    isActive
                      ? "bg-yellow-500/20 border-yellow-500/40 text-white"
                      : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10",
                  ].join(" ")
                }
              >
                {l.label}
              </NavLink>
            ))}

            {authed ? (
              <button
                type="button"
                onClick={onLogout}
                className="w-full text-left px-4 py-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 transition text-white"
              >
                Çıkış
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLogin?.();
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-white/80"
                >
                  Giriş Yap
                </button>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-white/80"
                >
                  Kaydol
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
