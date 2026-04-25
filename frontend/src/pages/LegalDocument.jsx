import React, { useEffect, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getApiBase } from "../lib/apiBase.js";
import { LEGAL_PUBLIC_LINKS } from "../legalPublicLinks.js";
import { SiteLegalCompanyLine } from "../components/SiteLegalFooter.jsx";

function apiOrigin() {
  const b = getApiBase();
  if (b) return b;
  if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
  return "";
}

function NavItem({ slug, label }) {
  return (
    <NavLink
      to={`/legal/${slug}`}
      className={({ isActive }) =>
        [
          "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border",
          isActive
            ? "border-[var(--miron-gold)]/40 bg-[var(--miron-gold)]/10 text-[var(--miron-gold)]"
            : "border-transparent text-white/65 hover:text-white hover:bg-white/5 hover:border-white/10",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function LegalDocument() {
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setNotFound(false);
    setLoading(true);
    const base = apiOrigin();
    fetch(`${base}/api/legal/documents/${encodeURIComponent(slug || "")}`)
      .then((r) => {
        if (r.status === 404) throw new Error("nf");
        if (!r.ok) throw new Error("err");
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setDoc(j.document || null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[var(--miron-gold)] selection:text-black pb-16 md:pb-20">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.06),transparent_55%)]" />
      <div className="relative max-w-7xl mx-auto px-5 md:px-10 pt-8 md:pt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-colors no-underline w-fit"
          >
            <span aria-hidden>←</span> Ana sayfa
          </Link>
          <span className="inline-flex self-start py-1 px-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.2em] text-[var(--miron-gold)] uppercase">
            Hukuki belgeler
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-3 px-1">
                Şartlar ve politikalar
              </div>
              <nav className="flex flex-col gap-1" aria-label="Hukuki belge türleri">
                {LEGAL_PUBLIC_LINKS.map(([s, label]) => (
                  <NavItem key={s} slug={s} label={label} />
                ))}
              </nav>
              <div className="mt-6 pt-4 border-t border-white/10">
                <SiteLegalCompanyLine />
              </div>
            </div>
          </aside>

          <main className="lg:col-span-9">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-10 min-h-[240px] flex items-center justify-center text-white/40 text-sm">
                Yükleniyor…
              </div>
            ) : notFound || !doc ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-10 text-center">
                <p className="text-white/60 mb-6">{notFound ? "Belge bulunamadı." : "İçerik yüklenemedi."}</p>
                <Link to="/" className="text-[var(--miron-gold)] hover:underline font-medium">
                  Ana sayfaya dön
                </Link>
              </div>
            ) : (
              <article className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] overflow-hidden">
                <header className="px-6 sm:px-10 pt-8 sm:pt-10 pb-6 border-b border-white/10">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{doc.title}</h1>
                  <p className="text-sm text-white/45 mt-3">
                    Sürüm <span className="text-white/70 font-mono">{doc.version}</span>
                    <span className="mx-2 text-white/20">·</span>
                    Son güncelleme:{" "}
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("tr-TR") : "—"}
                  </p>
                </header>
                <div className="px-6 sm:px-10 py-8 sm:py-10 pb-10 sm:pb-12 prose prose-invert prose-headings:text-[var(--miron-gold)] prose-headings:font-bold prose-p:text-white/80 prose-li:text-white/80 prose-strong:text-white max-w-none prose-a:text-[var(--miron-gold)]">
                  <ReactMarkdown>{doc.content || ""}</ReactMarkdown>
                </div>
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
