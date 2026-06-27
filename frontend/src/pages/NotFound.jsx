import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../components/SEOHead.jsx";

export default function NotFound() {
  return (
    <>
      <SEOHead
        title="Sayfa Bulunamadı"
        description="Aradığınız sayfa bulunamadı. Miron AI ana sayfasına dönün."
        noIndex={true}
      />
      <div className="premium-scope min-h-screen bg-black text-white pt-24 px-6 pb-24 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <p className="text-[var(--miron-gold)] font-mono text-6xl font-bold mb-6">404</p>
          <h1 className="text-3xl font-bold mb-4">Sayfa bulunamadı</h1>
          <p className="text-white/45 mb-10 leading-relaxed">
            Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/"
              className="inline-block px-8 py-3 text-sm font-medium border border-[var(--miron-gold)] text-[var(--miron-gold)] hover:bg-[var(--miron-gold)]/8 transition-colors"
            >
              Ana sayfa
            </Link>
            <Link
              to="/blog"
              className="inline-block px-8 py-3 text-sm text-white/50 border border-white/15 hover:border-white/30 transition-colors"
            >
              Blog
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
