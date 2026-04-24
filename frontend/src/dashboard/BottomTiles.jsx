import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function Tile({ href, title, description, icon }) {
  return (
    <Link
      to={href}
      className="group flex items-center justify-between px-5 py-4 bg-[#0a0a0a] dash-hair transition-colors hover:border-[#2e2e2e] no-underline"
      style={{ borderRadius: 14, textDecoration: "none" }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center"
          style={{ width: 16, height: 16, color: "#2a2a2a" }}
        >
          {icon}
        </span>
        <div>
          <div
            className="dash-font-serif"
            style={{ fontWeight: 700, fontSize: 13, color: "#cccccc", lineHeight: 1.2 }}
          >
            {title}
          </div>
          <div className="dash-font-sans" style={{ fontSize: 11, color: "#3a3a3a", marginTop: 2 }}>
            {description}
          </div>
        </div>
      </div>
      <span
        aria-hidden
        style={{ color: "#2a2a2a", fontSize: 14, transition: "color 0.15s ease" }}
      >
        →
      </span>
    </Link>
  );
}

export default function BottomTiles() {
  const { user } = useAuth();
  const iconCalc = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="13" y1="10" x2="15" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="13" y1="14" x2="15" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="13" y1="18" x2="15" y2="18" />
    </svg>
  );
  const iconShield = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Tile
        href="/calculators"
        title="Hesaplamalar"
        description="Faiz · Harç · KDV · Vekalet · İcra"
        icon={iconCalc}
      />
      {isAdmin(user) && (
        <Tile
          href="/admin"
          title="Yönetim Paneli"
          description="Kullanıcılar · Demo talepler · Ayarlar"
          icon={iconShield}
        />
      )}
    </div>
  );
}
