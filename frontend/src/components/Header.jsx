import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Header({ darkMode, setDarkMode, onOpenLogin }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status, user, logout } = useAuth();
  const authed = status === "authed";
  const loading = status === "loading";

  const links = useMemo(() => {
    if (authed) {
      return [
        { to: "/home", label: "Ana Menü" },
        { to: "/dashboard", label: "Dashboard" },
        { to: "/analyze", label: "Analiz" },
        { to: "/assistant", label: "Asistan" },
        { to: "/pleadings", label: "Dilekçeler" },
        { to: "/risk", label: "Risk" },
      ];
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

            <Link to={authed ? "/home" : "/"} className="flex flex-col leading-tight">
              <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                miron ai
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest -mt-1">
                by Miron Intelligence
              </span>
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
                      isActive ? "text-white" : "text-gray-300 hover:text-white",
                    ].join(" ")
                  }
                >
                  {l.label}
                </NavLink>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Tema"
              title="Tema"
            >
              {darkMode ? "🌙" : "☀️"}
            </button>

            {loading ? null : authed ? (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <div className="text-xs text-gray-300">
                    {(user?.firstName || user?.lastName)
                      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                      : user?.email || ""}
                  </div>
                  <div className="text-[10px] text-gray-500">Oturum açık</div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Giriş Yap
                </button>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:opacity-95 transition"
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
                      ? "bg-white/10 border-white/15 text-white"
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10",
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
                className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-gray-200"
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
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-gray-200"
                >
                  Giriş Yap
                </button>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-gray-200"
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
