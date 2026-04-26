// src/pages/Intro.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Intro() {
  return (
    <div className="premium-scope min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-4xl w-full glass p-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3 text-yellow-400">Miron AI — Avukatlar için stratejik zekâ</h1>
            <p className="text-sm text-white/80 mb-6">
              Kişisel ve bağımsız avukatlar için evrak analizi, dilekçe yardımı, risk değerlendirmesi ve asistan.
              Kayıt akışında kısa uygunluk soruları; ardından hesabınızı oluşturabilirsiniz.
            </p>

            <ul className="space-y-2 text-white/80 mb-6">
              <li>• Evrak analizi (PDF, DOCX, TXT)</li>
              <li>• Belge stüdyosu ve dilekçe yardımı</li>
              <li>• Risk ve strateji analizi</li>
              <li>• Güvenli dosya işleme</li>
            </ul>

            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="px-4 py-2 rounded bg-yellow-400 text-black hover:bg-yellow-500 transition">
                Giriş Yap
              </Link>
              <Link to="/kaydol" className="px-4 py-2 rounded border border-white/20 text-white hover:bg-white/5 transition">
                Kayıt ol
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[360px] text-center md:text-left">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-2 text-white">Nasıl devam ederim?</h3>
              <p className="text-sm text-white/60 mb-4">
                Önce birkaç kısa soruyla uygunluk kontrolü yapılır; ardından Miron AI Legal veya Enterprise seçenekleri
                gösterilir.
              </p>
              <Link to="/kaydol" className="inline-block px-5 py-2.5 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500 transition">
                Kayıt akışına git
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-subtle">
          <strong>İletişim:</strong> mironai@mironintelligence.com
        </div>
      </div>
    </div>
  );
}
