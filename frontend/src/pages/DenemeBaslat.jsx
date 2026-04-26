import React from "react";
import { Link } from "react-router-dom";

export default function DenemeBaslat() {
  return (
    <div className="premium-scope min-h-screen px-6 py-16 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Kayıt</h1>
      <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8">
        Miron AI için kısa uygunluk sorularını yanıtlayın, paketinizi seçin ve hesabınızı oluşturun.
      </p>
      <Link to="/kaydol" className="inline-flex px-8 py-4 rounded-full btn-primary font-bold">
        Kayıt akışına git
      </Link>
    </div>
  );
}
