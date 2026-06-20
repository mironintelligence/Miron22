// src/pages/Intro.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Intro() {
  return (
    <div className="premium-scope min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-4xl w-full glass p-10">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-3 text-yellow-400">
              Miron AI — Kişisel avukatlar için stratejik zekâ
            </h1>
            <p className="text-sm text-white/80 mb-6">
              Evrak analizi, dilekçe yardımı, risk ve strateji; tekrarlayan işleri hızlandıran tek akış. Kayıtta kısa
              uygunluk soruları; ardından hesabınızı oluşturup panele geçersiniz. Tek paket, taahhütsüz yapı — ek
              “kurumsal katman” satışı yoktur.
            </p>

            <ul className="space-y-2 text-white/80 mb-6">
              <li>• Evrak analizi (PDF, DOCX, TXT)</li>
              <li>• Belge stüdyosu ve dilekçe yardımı</li>
              <li>• Risk, strateji ve dava simülasyonu</li>
              <li>• KVKK odaklı süreç; veriler model eğitiminde kullanılmaz</li>
            </ul>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/kaydol"
                className="px-4 py-2 rounded bg-yellow-400 text-black hover:bg-yellow-500 transition font-semibold"
              >
                Hesap oluştur
              </Link>
              <Link to="/login" className="px-4 py-2 rounded border border-white/20 text-white hover:bg-white/5 transition">
                Giriş yap
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[360px] text-center md:text-left">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-2 text-white">Nasıl devam ederim?</h3>
              <p className="text-sm text-white/60 mb-4">
                Birkaç soruyla uygunluk kontrolü yapılır; uygun görülen başvurularda paket ve ödeme adımları açılır.
              </p>
              <Link
                to="/kaydol"
                className="inline-block px-5 py-2.5 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500 transition"
              >
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
