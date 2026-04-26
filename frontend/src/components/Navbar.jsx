import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { authFetch } from "../auth/api";
import { useVisiblePolling } from "../hooks/useVisiblePolling";
import { LEGAL_PUBLIC_LINKS } from "../legalPublicLinks.js";

function BetaBadge() {
  return (
    <span
      className="ml-1.5 align-middle dash-font-sans"
      style={{
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 3,
        background: "#141414",
        color: "#b8960a",
        border: "0.5px solid #2a2000",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
      }}
    >
      BETA
    </span>
  );
}

function BrandMark() {
  return (
    <span className="dash-font-display inline-flex items-baseline gap-1" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.01em" }}>
      <span style={{ color: "#ffffff" }}>Miron</span>
      <span style={{ color: "#FFD700" }}>AI</span>
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
    { name: "Dava Merkezi", path: "/dashboard/dava-merkezi" },
    { name: "Araştırma", path: "/dashboard/arastirma" },
    { name: "Belge Stüdyosu", path: "/dashboard/belge-studyosu" },
    { name: "Hesaplamalar", path: "/calculators" },
  ];
  const navLinks = baseNavLinks;

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

  const isActive = (p) => {
    if (p === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(p);
  };

  // ---------------- GUEST NAVBAR ----------------
  if (status !== "authed") {
    return (
      <nav
        className="fixed top-0 left-0 w-full z-50"
        style={{
          background: "#0a0a0a",
          borderBottom: "0.5px solid #1e1e1e",
          backdropFilter: "saturate(120%)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{ maxWidth: 1200, padding: "0 40px", height: 64 }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/" className="no-underline" style={{ textDecoration: "none" }}>
              <BrandMark />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/about"
              className="dash-font-sans no-underline transition-colors"
              style={{ fontSize: 12, color: "#555", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Biz Kimiz?
            </Link>
            <div className="relative group">
              <button
                type="button"
                className="dash-font-sans flex items-center gap-1 transition-colors outline-none"
                style={{ fontSize: 12, color: "#555", background: "transparent", border: "none" }}
              >
                Kurumsal
                <span style={{ fontSize: 9 }}>▼</span>
              </button>
              <div
                className="absolute left-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                style={{
                  width: 192,
                  background: "#0a0a0a",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 14,
                  padding: "6px 0",
                }}
              >
                {LEGAL_PUBLIC_LINKS.map(([slug, label]) => (
                  <Link
                    key={slug}
                    to={`/legal/${slug}`}
                    className="dash-font-sans block no-underline transition-colors"
                    style={{
                      padding: "8px 14px",
                      fontSize: 11,
                      color: "#888",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.background = "#111";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#888";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/kaydol"
              className="hidden sm:inline-flex dash-font-sans items-center justify-center no-underline transition-opacity"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "7px 14px",
                borderRadius: 999,
                background: "#FFD700",
                color: "#000",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Kayıt ol
            </Link>
            <Link
              to="/login"
              className="dash-font-sans no-underline transition-colors"
              style={{ fontSize: 12, color: "#888", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
            >
              Giriş Yap
            </Link>
            <Link
              to="/kaydol"
              className="dash-font-sans inline-flex items-center justify-center no-underline transition-opacity"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 8,
                background: "#ffffff",
                color: "#000",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Kaydol
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // ---------------- AUTHED NAVBAR ----------------
  return (
    <nav
      className="fixed top-0 left-0 w-full z-50"
      style={{
        background: "#0a0a0a",
        borderBottom: "0.5px solid #1e1e1e",
      }}
    >
      <div
        className="mx-auto flex items-center justify-between"
        style={{ maxWidth: 1200, padding: "0 40px", height: 68 }}
      >
        <Link to="/dashboard" className="no-underline" style={{ textDecoration: "none" }}>
          <BrandMark />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className="dash-font-sans no-underline transition-colors"
                style={{
                  fontSize: 14,
                  color: active ? "#FFD700" : "#555",
                  textDecoration: "none",
                  letterSpacing: "0.1px",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "#aaa";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "#555";
                }}
              >
                <span>{link.name}</span>
                {link.beta ? <BetaBadge /> : null}
              </Link>
            );
          })}
        </div>

        {/* SAĞ KISIM - İSİM/AVATAR/ABONELİK/ÇIKIŞ — fonksiyonellik aynen korunuyor */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            to="/notifications"
            className="relative p-1 no-underline"
            aria-label="Bildirimler"
            style={{ textDecoration: "none" }}
          >
            <Bell
              className="transition-colors"
              style={{
                width: 20,
                height: 20,
                color: unreadCount > 0 ? "#FFD700" : "#555",
              }}
              strokeWidth={1.5}
            />
            {unreadCount > 0 ? (
              <span
                className="absolute dash-font-sans"
                style={{
                  top: -2,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: "#FFD700",
                  color: "#000",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid #0a0a0a",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-3 outline-none"
              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            >
              <div className="text-right hidden lg:block">
                <div
                  className="dash-font-sans"
                  style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", lineHeight: 1.2 }}
                >
                  {user.firstName} {user.lastName}
                </div>
                <div
                  className="dash-font-sans"
                  style={{
                    fontSize: 10,
                    color: "#555",
                    marginTop: 2,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  {user.role === "admin" ? "Yönetici" : "Avukat"}
                </div>
              </div>
              <div
                className="dash-font-sans"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#FFD700",
                  color: "#000",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.2px",
                }}
              >
                {(user.firstName?.[0] || "")}{(user.lastName?.[0] || "")}
              </div>
            </button>

            <div
              className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right"
              style={{
                width: 192,
                background: "#0a0a0a",
                border: "0.5px solid #1e1e1e",
                borderRadius: 14,
                padding: "6px 0",
              }}
            >
              <Link
                to="/upgrade"
                className="dash-font-sans block no-underline transition-colors"
                style={{
                  padding: "8px 14px",
                  fontSize: 11,
                  color: "#888",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.background = "#111";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#888";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Abonelik
              </Link>
              <div style={{ height: "0.5px", background: "#1e1e1e", margin: "4px 0" }} />
              <button
                type="button"
                onClick={handleLogout}
                className="dash-font-sans w-full text-left transition-colors"
                style={{
                  padding: "8px 14px",
                  fontSize: 11,
                  color: "#c88",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ff6464";
                  e.currentTarget.style.background = "#111";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#c88";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden transition-colors"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuOpen}
          style={{
            background: "transparent",
            color: "#fff",
            border: "none",
            padding: 8,
            marginRight: -8,
            cursor: "pointer",
          }}
        >
          {menuOpen ? <X style={{ width: 20, height: 20 }} strokeWidth={1.5} /> : <Menu style={{ width: 20, height: 20 }} strokeWidth={1.5} />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="md:hidden absolute w-full left-0"
          style={{
            top: 68,
            background: "#0a0a0a",
            borderTop: "0.5px solid #1e1e1e",
            padding: 24,
          }}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className="dash-font-sans no-underline"
                  style={{
                    fontSize: 14,
                    color: active ? "#FFD700" : "#888",
                    textDecoration: "none",
                  }}
                >
                  <span>{link.name}</span>
                  {link.beta ? <BetaBadge /> : null}
                </Link>
              );
            })}
            <div style={{ height: "0.5px", background: "#1e1e1e", margin: "4px 0" }} />
            <Link
              to="/notifications"
              onClick={() => setMenuOpen(false)}
              className="dash-font-sans no-underline"
              style={{ fontSize: 14, color: "#888", textDecoration: "none" }}
            >
              Bildirimler
            </Link>
            <Link
              to="/upgrade"
              onClick={() => setMenuOpen(false)}
              className="dash-font-sans no-underline"
              style={{ fontSize: 14, color: "#888", textDecoration: "none" }}
            >
              Abonelik
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="dash-font-sans text-left"
              style={{
                fontSize: 14,
                color: "#c88",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
