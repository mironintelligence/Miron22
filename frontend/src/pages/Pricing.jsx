import React from "react";
import { Link } from "react-router-dom";
import SEOHead from "../components/SEOHead.jsx";

const FEATURES = [
  ["İçtihat Araştırması", "700K+ Yargıtay & Danıştay kararı, semantik arama"],
  ["Miron Assistant", "Dava bazlı soru-cevap, kaynaklı AI yanıtları"],
  ["Dilekçe Oluşturucu", "Davaya özel taslak, düzenleme ve dışa aktarma"],
  ["Sözleşme Analizi", "Risk tespiti, kritik madde çıkarımı, özet"],
  ["Risk & Strateji", "Benzer davalara göre kazanma/kaybetme olasılığı"],
  ["Hesaplama Motoru", "11 modül: kıdem, ihbar, faiz, harç, icra..."],
  ["Mevzuat Analizi", "Güncel mevzuat ve yönetmelik araştırması"],
  ["KVKK Uyumu", "Müvekkil verisi kalıcı kaydedilmez, tam uyumlu"],
];

export default function Pricing() {
  return (
    <>
      <SEOHead
        title="Fiyatlandırma — Miron AI Hukuk Yapay Zekâ Aboneliği"
        description="Miron AI fiyatlandırma: 12.000 TL + KDV/ay, tek kullanıcı lisansı. Tüm modüller dahil — içtihat araması, dilekçe, sözleşme analizi ve daha fazlası."
        canonical="/pricing"
      />
      <div className="premium-scope min-h-screen bg-black text-white px-6 sm:px-10 pb-20">
        <div className="max-w-2xl mx-auto pt-12">

          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-2">Fiyatlandırma</h1>
          <p className="text-center text-white/40 text-sm mb-12">Tek fiyat · Tüm özellikler dahil · Taahhütsüz</p>

          {/* Fiyat Kartı */}
          <div className="glass rounded-2xl border border-yellow-500/30 shadow-lg shadow-amber-900/10 p-8 sm:p-10 mb-6">
            <div className="text-xs font-bold text-yellow-400/80 uppercase tracking-widest mb-4">Bireysel Lisans</div>

            <div className="flex items-end gap-2 mb-1">
              <span className="text-[72px] font-black text-white leading-none">12.000</span>
              <span className="text-2xl text-white/40 font-semibold mb-2">₺</span>
            </div>
            <p className="text-white/40 text-sm mb-8">/ ay + KDV · tek kullanıcı</p>

            <Link
              to="/kaydol"
              className="block w-full text-center bg-yellow-500 hover:bg-yellow-400 text-black font-black text-base py-4 rounded-xl transition-colors"
            >
              Kayıt Ol
            </Link>
          </div>

          {/* Özellikler */}
          <div className="glass rounded-2xl p-6 sm:p-8 mb-6">
            <h2 className="font-bold text-white mb-5">Pakete Dahil</h2>
            <ul className="space-y-3">
              {FEATURES.map(([title, desc]) => (
                <li key={title} className="flex gap-3 text-sm">
                  <span className="text-yellow-400 mt-0.5 shrink-0">✓</span>
                  <span>
                    <strong className="text-white">{title}</strong>
                    <span className="text-white/50"> — {desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Toplu Kullanım */}
          <div className="glass rounded-2xl p-6 border border-white/10 mb-8">
            <h2 className="font-bold text-white mb-1">Büro veya Toplu Kullanım</h2>
            <p className="text-sm text-white/50 mb-4">
              Birden fazla kullanıcı için özel fiyatlandırma. Teklif almak üzere bizimle iletişime geçin.
            </p>
            <a
              href="mailto:mironintelligence@gmail.com"
              className="inline-block text-sm font-semibold text-yellow-400 border border-yellow-500/30 px-5 py-2.5 rounded-lg hover:bg-yellow-500/10 transition-colors"
            >
              mironintelligence@gmail.com
            </a>
          </div>

        </div>

        <p className="text-center text-xs text-white/20 mt-4">© 2026 Miron GROUP LLC</p>
      </div>
    </>
  );
}
