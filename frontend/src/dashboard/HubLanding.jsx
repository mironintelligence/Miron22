import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";

const ACCENT = {
  dava: "#FFD700",
  arastirma: "#4c8cc9",
  belge: "#4cc98c",
};

function greet() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function firstNameOf(user) {
  const full =
    (user && (user.firstName || user.first_name)) ||
    (user && user.email ? user.email.split("@")[0] : "") ||
    "";
  return String(full).trim().split(/\s+/)[0] || "";
}

export default function HubLanding({ color = "dava", question = "Bugün ne yapmak istersiniz?", tools = [] }) {
  const { user } = useAuth();
  const fn = firstNameOf(user);
  const hoverColor = ACCENT[color] || "#FFD700";

  return (
    <div className="dash-root min-h-screen bg-black" style={{ marginTop: -80 }}>
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-6 pb-4 flex items-center gap-6">
        <Link
          to="/dashboard"
          className="dash-font-sans inline-flex items-center gap-1.5 no-underline"
          style={{ fontSize: 11, color: "#333", textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#777")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
        >
          ← Geri
        </Link>
        <Link
          to="/dashboard"
          className="dash-font-display inline-flex items-baseline gap-1 no-underline"
          style={{ fontSize: 13, letterSpacing: "-0.01em", textDecoration: "none" }}
        >
          <span style={{ color: "#fff" }}>Miron</span>
          <span style={{ color: "#FFD700" }}>AI</span>
        </Link>
      </div>

      <div className="mx-auto px-5" style={{ maxWidth: 520, minHeight: "calc(100vh - 160px)", display: "flex", alignItems: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <p
            className="dash-font-serif"
            style={{
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: 14,
              color: "#444",
              lineHeight: 1.2,
            }}
          >
            {greet()}, {fn ? `Av. ${fn}` : "Av."}.
          </p>

          <h1
            className="dash-font-display"
            style={{
              fontSize: 32,
              color: "#fff",
              letterSpacing: "-0.5px",
              marginTop: 8,
              lineHeight: 1.15,
            }}
          >
            {question}
          </h1>

          <div className="flex flex-col gap-2.5" style={{ marginTop: 40 }}>
            {tools.map((t) => (
              <Link
                key={t.href}
                to={t.href}
                className="group relative flex items-center justify-between bg-[#0a0a0a] dash-hair transition-colors no-underline"
                style={{
                  borderRadius: 12,
                  padding: "18px 22px",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#2e2e2e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e1e";
                }}
              >
                {t.beta ? (
                  <span
                    className="absolute dash-font-sans"
                    style={{
                      right: 14,
                      top: 10,
                      background: "#1a1a1a",
                      color: "#444",
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      letterSpacing: "0.5px",
                    }}
                  >
                    BETA
                  </span>
                ) : null}

                <div className="min-w-0 flex-1 pr-4">
                  <div
                    className="dash-font-serif tool-title transition-colors"
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#cccccc",
                      lineHeight: 1.2,
                      "--hv": hoverColor,
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    className="dash-font-sans"
                    style={{ fontSize: 11, color: "#3a3a3a", marginTop: 4 }}
                  >
                    {t.description}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="tool-arrow transition-colors"
                  style={{ color: "#2a2a2a", fontSize: 16 }}
                >
                  →
                </span>

                <style>{`
                  .group:hover .tool-title { color: ${hoverColor} !important; }
                  .group:hover .tool-arrow { color: ${hoverColor} !important; }
                `}</style>
              </Link>
            ))}
          </div>

          <div className="text-center" style={{ marginTop: 48 }}>
            <Link
              to="/dashboard/assistant"
              className="dash-font-sans no-underline"
              style={{ fontSize: 11, color: "#2a2a2a", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFD700")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2a2a2a")}
            >
              veya Miron Assistant&apos;a danışabilirsiniz →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
