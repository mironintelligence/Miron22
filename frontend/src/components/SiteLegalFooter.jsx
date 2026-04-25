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

/** Sayfa sonunda (sabit değil): hukuki linkler, şirket satırı, yapay zekâ uyarısı — geniş aralıklı. */
export function SitePageFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-gradient-to-b from-black via-zinc-950/40 to-black">
      <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12 pb-14 md:pt-16 md:pb-20">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/35 mb-8">
          Hukuki belgeler ve şartlar
        </p>
        <SiteLegalFooterLinks
          className="justify-center gap-x-5 gap-y-3 max-w-4xl mx-auto mb-10"
          linkClassName="text-sm md:text-[15px] text-white/55 hover:text-[var(--miron-gold)] transition-colors px-1 py-0.5"
        />
        <div className="flex justify-center mb-10">
          <SiteLegalCompanyLine className="text-sm !text-white/50" />
        </div>
        <p className="text-center text-sm md:text-[15px] text-amber-200/55 max-w-2xl mx-auto leading-relaxed px-2">
          Yapay zekâ çıktıları hatalı veya eksik olabilir. Önemli hukuki kararlardan önce bilgiyi mutlaka doğrulayın.
        </p>
      </div>
    </footer>
  );
}
