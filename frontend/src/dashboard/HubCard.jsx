import React from "react";
import { Link } from "react-router-dom";

const HUB = {
  dava: {
    stripe: "#FFD700",
    pill: { bg: "#1a1200", color: "#6b5420", border: "#2a2000", text: "Dava Yönetimi" },
    dot: "#3a2f00",
    link: "#6b5420",
    linkHover: "#FFD700",
  },
  arastirma: {
    stripe: "#4c8cc9",
    pill: { bg: "#001220", color: "#20446b", border: "#002040", text: "Hukuki Araştırma" },
    dot: "#122340",
    link: "#20446b",
    linkHover: "#4c8cc9",
  },
  belge: {
    stripe: "#4cc98c",
    pill: { bg: "#001a0e", color: "#206b44", border: "#003020", text: "Belge & Üretim" },
    dot: "#123a24",
    link: "#206b44",
    linkHover: "#4cc98c",
  },
};

export default function HubCard({ color, title, description, tools = [], href }) {
  const def = HUB[color];
  return (
    <Link
      to={href}
      className="group relative flex flex-col p-5 bg-[#0a0a0a] dash-hair transition-colors hover:border-[#2e2e2e] no-underline"
      style={{ borderRadius: 14, textDecoration: "none", minHeight: 280 }}
    >
      <span className="dash-hub-stripe" style={{ background: def.stripe }} aria-hidden />

      <span
        className="self-start mb-3 inline-flex items-center px-2 py-[2px] dash-hair dash-font-sans"
        style={{
          background: def.pill.bg,
          color: def.pill.color,
          borderColor: def.pill.border,
          fontSize: 9,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          borderRadius: 9999,
        }}
      >
        {def.pill.text}
      </span>

      <h3
        className="dash-font-serif"
        style={{ fontWeight: 700, fontSize: 15, color: "#cccccc", lineHeight: 1.2, margin: 0 }}
      >
        {title}
      </h3>

      <p
        className="dash-font-sans"
        style={{ fontSize: 11, color: "#383838", lineHeight: 1.6, marginTop: 8, marginBottom: 16 }}
      >
        {description}
      </p>

      <ul className="flex flex-col gap-1.5 mb-3 list-none p-0 m-0">
        {tools.map((t) => (
          <li
            key={t.label}
            className="flex items-center justify-between px-2.5 py-[7px] bg-[#080808] dash-font-sans transition-colors group-hover:bg-[#0e0e0e]"
            style={{
              border: "0.5px solid #141414",
              borderRadius: 6,
              fontSize: 11,
              color: "#404040",
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <span
                aria-hidden
                className="inline-block"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: def.dot,
                }}
              />
              <span className="truncate">{t.label}</span>
            </span>
            {t.beta ? (
              <span
                className="ml-2"
                style={{
                  background: "#141414",
                  color: "#383838",
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  letterSpacing: "0.5px",
                }}
              >
                BETA
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div
        className="mt-auto flex items-center justify-between pt-3 dash-font-sans"
        style={{ borderTop: "0.5px solid #141414", fontSize: 11 }}
      >
        <span
          className="hub-gir"
          style={{ color: def.link, transition: "color 0.15s ease" }}
        >
          Gir →
        </span>
      </div>

      <style>{`
        .group:hover .hub-gir { color: ${def.linkHover} !important; }
      `}</style>
    </Link>
  );
}
