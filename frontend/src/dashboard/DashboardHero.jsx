import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function firstNameOf(user) {
  const full =
    (user && (user.firstName || user.first_name)) ||
    (user && user.email ? user.email.split("@")[0] : "") ||
    "";
  return String(full).trim().split(/\s+/)[0] || "";
}

export default function DashboardHero({ activeCases = 0, todayHearings = 0 }) {
  const { user } = useAuth();
  const fn = firstNameOf(user);

  return (
    <section
      className="relative overflow-hidden bg-[#0a0a0a] dash-hair"
      style={{ borderRadius: 14, padding: "32px 36px" }}
    >
      <span className="dash-hero-line" aria-hidden />

      <div className="flex flex-col gap-8 md:flex-row md:gap-0 md:items-stretch">
        <div className="flex flex-col md:flex-1">
          <div
            className="inline-flex items-center gap-1.5 dash-font-sans"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFD700",
            }}
          >
            <span
              aria-hidden
              className="inline-block animate-pulseDot"
              style={{ width: 5, height: 5, background: "#FFD700", borderRadius: 999 }}
            />
            <span>Miron Assistant · Çevrimiçi</span>
          </div>

          <h1
            className="dash-font-display"
            style={{ fontSize: 28, color: "#ffffff", lineHeight: 1.15, marginTop: 20 }}
          >
            Hukuk, sizin için
          </h1>
          <h2
            className="dash-font-serif"
            style={{
              fontSize: 28,
              color: "#555555",
              lineHeight: 1.15,
              fontStyle: "italic",
              fontWeight: 400,
              margin: 0,
            }}
          >
            her an hazır.
          </h2>

          <p
            className="dash-font-sans"
            style={{
              fontSize: 13,
              color: "#3a3a3a",
              lineHeight: 1.7,
              marginTop: 20,
              maxWidth: 420,
            }}
          >
            {fn ? `Av. ${fn}, ` : ""}dava analizi, emsal arama, belge üretimi ve risk
            değerlendirmesi için Miron Assistant&apos;a danışın ya da çalışma alanlarından birini açın.
          </p>
        </div>

        <div
          className="flex flex-col justify-between gap-5 md:ml-12 md:pl-12"
          style={{ borderLeft: "0.5px solid #1e1e1e" }}
        >
          <div className="flex items-start gap-8">
            <div className="flex flex-col">
              <span className="dash-font-display" style={{ fontSize: 28, lineHeight: 1, color: "#fff" }}>
                {activeCases}
              </span>
              <span className="dash-font-sans" style={{ fontSize: 10, color: "#333", marginTop: 4 }}>
                Aktif dava
              </span>
            </div>
            <div className="flex flex-col">
              <span className="dash-font-display" style={{ fontSize: 28, lineHeight: 1, color: "#FFD700" }}>
                {todayHearings}
              </span>
              <span className="dash-font-sans" style={{ fontSize: 10, color: "#333", marginTop: 4 }}>
                Bugün duruşma
              </span>
            </div>
          </div>

          <Link
            to="/assistant"
            className="dash-font-sans inline-flex self-start items-center justify-center no-underline"
            style={{
              background: "#FFD700",
              color: "#000",
              fontWeight: 600,
              fontSize: 12,
              padding: "11px 20px",
              borderRadius: 8,
              border: "none",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Assistant&apos;a Sor
          </Link>
        </div>
      </div>
    </section>
  );
}
