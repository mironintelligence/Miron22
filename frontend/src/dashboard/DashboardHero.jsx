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
      style={{ borderRadius: 16, padding: "44px 52px" }}
    >
      <span className="dash-hero-line" aria-hidden />

      <div className="flex flex-col gap-10 md:flex-row md:gap-0 md:items-stretch">
        <div className="flex flex-col md:flex-1">
          <div
            className="inline-flex items-center gap-2 dash-font-sans"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFD700",
            }}
          >
            <span
              aria-hidden
              className="inline-block animate-pulseDot"
              style={{ width: 6, height: 6, background: "#FFD700", borderRadius: 999 }}
            />
            <span>Miron Assistant · Çevrimiçi</span>
          </div>

          <h1
            className="dash-font-display"
            style={{ fontSize: 40, color: "#ffffff", lineHeight: 1.1, marginTop: 24 }}
          >
            Hukuk, sizin için
          </h1>
          <h2
            className="dash-font-serif"
            style={{
              fontSize: 40,
              color: "#555555",
              lineHeight: 1.1,
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
              fontSize: 15,
              color: "#3a3a3a",
              lineHeight: 1.7,
              marginTop: 24,
              maxWidth: 440,
            }}
          >
            {fn ? `Av. ${fn}, ` : ""}dava analizi, emsal arama, belge üretimi ve risk
            değerlendirmesi için Miron Assistant&apos;a danışın ya da çalışma alanlarından birini açın.
          </p>
        </div>

        <div
          className="flex flex-col justify-between gap-6 md:ml-14 md:pl-14"
          style={{ borderLeft: "0.5px solid #1e1e1e" }}
        >
          <div className="flex items-start gap-10">
            <div className="flex flex-col">
              <span className="dash-font-display" style={{ fontSize: 44, lineHeight: 1, color: "#fff" }}>
                {activeCases}
              </span>
              <span className="dash-font-sans" style={{ fontSize: 12, color: "#333", marginTop: 6 }}>
                Aktif dava
              </span>
            </div>
            <div className="flex flex-col">
              <span className="dash-font-display" style={{ fontSize: 44, lineHeight: 1, color: "#FFD700" }}>
                {todayHearings}
              </span>
              <span className="dash-font-sans" style={{ fontSize: 12, color: "#333", marginTop: 6 }}>
                Bugün duruşma
              </span>
            </div>
          </div>

          <Link
            to="/dashboard/assistant"
            className="dash-font-sans inline-flex self-start items-center justify-center no-underline"
            style={{
              background: "#FFD700",
              color: "#000",
              fontWeight: 600,
              fontSize: 14,
              padding: "13px 24px",
              borderRadius: 10,
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
