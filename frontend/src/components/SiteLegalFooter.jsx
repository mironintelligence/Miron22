import React from "react";
import { Link } from "react-router-dom";
import { LEGAL_PUBLIC_LINKS } from "../legalPublicLinks.js";

/** Tüm hukuki belge linkleri (Kullanım Şartları, Gizlilik, DPA, çerez, AI şartları, disclaimer, KVKK). */
export function SiteLegalFooterLinks({ className = "", linkClassName }) {
  const linkCls =
    linkClassName ||
    "text-[11px] text-white/65 hover:text-[var(--miron-gold)] transition-colors whitespace-nowrap";
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 ${className}`}
      aria-label="Hukuki belgeler ve şartlar"
    >
      {LEGAL_PUBLIC_LINKS.map(([slug, label]) => (
        <Link key={slug} to={`/legal/${slug}`} className={linkCls}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteLegalCompanyLine({ className = "" }) {
  const y = new Date().getFullYear();
  return (
    <p className={`text-[11px] text-white/45 text-center ${className}`}>
      <span className="text-white/80 font-medium">Miron Intelligence Ltd</span>
      <span className="mx-1.5 text-white/25">·</span>
      <span>© {y}</span>
    </p>
  );
}
