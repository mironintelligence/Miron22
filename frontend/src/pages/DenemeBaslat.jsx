import React from "react";
import { Link } from "react-router-dom";

export default function DenemeBaslat() {
  return (
    <div className="min-h-screen px-6 py-16 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Deneme süreci</h1>
      <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8">
        Kurumsal veya onaylı demo için talep oluşturun. Bireysel hesap için doğrudan kayıt adımlarını tamamlayın; kart
        bilgisi istenmez.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/demo-request"
          className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 transition"
        >
          Demo talebi gönder
        </Link>
        <Link to="/kaydol" className="px-6 py-3 rounded-full btn-primary text-center font-bold">
          15 günlük ücretsiz deneme
        </Link>
        <Link to="/kaydol" className="px-6 py-3 rounded-full border border-amber-500/50 text-amber-200 font-semibold hover:bg-amber-500/10 transition text-center">
          Kaydol
        </Link>
      </div>
    </div>
  );
}
