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

export default function DashboardHero() {
  const { user } = useAuth();
  const fn = firstNameOf(user);

  return (
    <section
      className="relative overflow-hidden bg-[#0a0a0a] dash-hair"
      style={{ borderRadius: 16, padding: "44px 52px" }}
    >
      <span className="dash-hero-line" aria-hidden />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col">
          <div
            className="inline-flex items-center gap-2 dash-font-sans"
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#ebac00",
            }}
          >
            <span
              aria-hidden
              className="inline-block animate-pulseDot"
              style={{ width: 6, height: 6, background: "#ebac00", borderRadius: 999 }}
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

        <div className="flex w-full justify-center">
          <Link
            to="/dashboard/assistant"
            className="dash-font-sans inline-flex items-center justify-center no-underline"
            style={{
              background: "#ebac00",
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
