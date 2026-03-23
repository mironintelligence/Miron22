import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

function tl(n) {
  return n.toLocaleString("tr-TR") + " TL";
}

export default function Pricing() {
  const { state } = useLocation();

  const [pricingData, setPricingData] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);


  const count = state?.count || 1;
  const isMulti = state?.mode === "multi";
  const verificationNeeded = state?.verificationNeeded;
  const discountCode = state?.discount_code;

  useEffect(() => {
    async function fetchPrice() {
      setLoadingPrice(true);
      try {
        const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
        const payload = discountCode ? { count, discount_code: discountCode } : { count };
        const res = await fetch(`${base}/api/pricing/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setPricingData(data);
        }
      } catch (e) {
        console.error("Fiyat hesaplama hatası:", e);
      } finally {
        setLoadingPrice(false);
      }
    }
    fetchPrice();
  }, [count, discountCode]);

  const showCrossed = pricingData?.is_discounted;
  const rawTotal = pricingData?.raw_total || 0;
  const finalPrice = pricingData?.final_total || 0;
  
  const crossed = showCrossed ? rawTotal : null;

  return (
    <div className="min-h-screen mt-12 px-6 sm:px-10 md:px-16 pb-12 bg-black text-white">
      <section className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col">
          <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Profesyonel</div>
          <div className="text-3xl font-black text-white mb-1">
            8.000 TL<span className="text-lg font-semibold text-white/50"> + KDV</span>
          </div>
          <div className="text-sm text-subtle mb-4">/ ay • tek kullanıcı</div>
          <ul className="text-sm text-white/70 space-y-2 flex-1 mb-6">
            <li>✓ Tüm çekirdek modüller</li>
            <li>✓ E-posta destek</li>
          </ul>
          <a href="mailto:hello@mironintelligence.com?subject=Miron%20AI%20Abonelik" className="btn-primary text-center block">
            Satın Al
          </a>
        </div>
        <div className="glass p-6 rounded-2xl border-2 border-amber-500/50 relative flex flex-col scale-[1.02] shadow-xl shadow-amber-900/20">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-amber-500 text-black px-3 py-1 rounded-full">
            EN AVANTAJLI
          </span>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Yıllık</div>
          <div className="text-3xl font-black text-amber-300 mb-1">85.000 TL + KDV</div>
          <div className="text-sm text-subtle mb-4">/ yıl • tek kullanıcı</div>
          <ul className="text-sm text-white/80 space-y-2 flex-1 mb-6">
            <li>✓ Aylık plana göre önemli tasarruf</li>
            <li>✓ Öncelikli erişim</li>
          </ul>
          <a href="mailto:hello@mironintelligence.com?subject=Miron%20AI%20Yillik%20Lisans" className="btn-primary text-center block">
            Yıllık Teklif Al
          </a>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col">
          <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Enterprise</div>
          <div className="text-xl font-bold text-white mb-2">Özel entegrasyon</div>
          <div className="text-sm text-subtle mb-4">Çoklu kullanıcı, kurumsal iç güvenlik</div>
          <ul className="text-sm text-white/70 space-y-2 flex-1 mb-6">
            <li>✓ Özel SLA</li>
            <li>✓ Kurumsal faturalama</li>
          </ul>
          <a
            href="mailto:info@mironintelligence.com?subject=Miron%20AI%20Enterprise"
            className="w-full py-3 rounded-xl border border-white/20 text-white font-bold text-center hover:bg-white/5"
          >
            İletişim
          </a>
        </div>
      </section>

      <div className="glass p-6 sm:px-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">
            Miron AI – Hukuk Odaklı Yapay Zekâ Paketi
          </h2>
          <p className="text-sm text-subtle mt-1">
            Lisansınızı etkinleştirin ve tüm modüllere erişin.
          </p>

          {verificationNeeded && (
            <div className="mt-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm font-semibold max-w-2xl mx-auto">
              ✉️ Lütfen e-posta adresinizi doğrulayın! <br />
              <span className="font-normal opacity-80">
                Hesabınızı aktifleştirmek için size bir doğrulama bağlantısı gönderdik. Doğrulama yapmadan giriş yapamazsınız.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Özellikler */}
          <div className="lg:col-span-7 glass p-5 rounded-2xl">
            <h3 className="font-semibold text-accent mb-3">Paket Özellikleri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">📂 Evrak Analizi</div>
                <div className="text-subtle text-xs mt-1">Otomatik özet, alan çıkarımı</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">🧾 Dilekçe Oluşturucu</div>
                <div className="text-subtle text-xs mt-1">Şablonlar, dışa aktarma</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">💬 Miron Assistant</div>
                <div className="text-subtle text-xs mt-1">Dava bazlı soru-cevap</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">🔐 KVKK Maskeleme</div>
                <div className="text-subtle text-xs mt-1">Hassas veriler için güvenlik</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">🧠 Risk & Strateji</div>
                <div className="text-subtle text-xs mt-1">Kazanma olasılığı & riskler</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">📊 Raporlama</div>
                <div className="text-subtle text-xs mt-1">Dosya trafiği & metrikler</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-subtle">
              <div className="glass rounded-xl p-3">
                ⚖️ Yargıtay Karar Arama
              </div>
              <div className="glass rounded-xl p-3">
                📚 Mevzuat Analizi
              </div>
              <div className="glass rounded-xl p-3">
                🎯 Dava Simülasyonu
              </div>
            </div>
          </div>

          {/* Fiyat kutusu */}
          <div className="lg:col-span-5 glass p-5 rounded-2xl border border-white/10">
            <div className="text-sm text-subtle">
              {isMulti
                ? "Çok kişili lisans • " + count + " kullanıcı"
                : "Şahıs lisansı • 1 kullanıcı"}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-subtle">
              <div className="glass rounded-xl p-3 text-center">
                Sınırsız analiz
              </div>
              <div className="glass rounded-xl p-3 text-center">
                E-posta destek
              </div>
            </div>

            {/* Ödeme uyarısı */}
            <div className="mt-3 p-3 rounded-xl border border-red-400/40 bg-red-500/10 text-sm text-red-200">
              ⚠ Her hesap <strong>1 kişiliktir</strong>. Lütfen aynı hesabı birden
              fazla kişiyle paylaşmayın. Aksi halde aboneliğiniz iptal edilebilir.
            </div>

            {/* Eski fiyat ve indirimli fiyat */}
            <div className="mt-4">
              {showCrossed && crossed != null && (
                <div className="text-lg text-subtle line-through">
                  {tl(crossed)}
                </div>
              )}

              <div className="text-3xl font-extrabold text-fg">
                {tl(finalPrice)}
              </div>

              {/* İndirim alanı - OTOMATİK UYGULANIYOR */}
              <div className="mt-4 text-sm text-subtle">
                * Toplu alımlarda indirim otomatik uygulanır.
              </div>
            </div>

            <button
              onClick={() => {
                window.location.href = "mailto:hello@mironintelligence.com?subject=Miron%20AI%20Lisans%20Talebi";
              }}
              className="mt-5 w-full btn-primary"
            >
              Satın Al
            </button>
            
            <button
              onClick={() => {
                window.location.href = "mailto:info@mironintelligence.com?subject=Miron%20AI%20Enterprise%20Talebi";
              }}
              className="mt-3 w-full border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/5 transition-all"
            >
              Kurumsal İletişim
            </button>

            <div className="text-[11px] text-subtle mt-3">
              * Çoklu satın alımlarda 3+ kişide özel indirim uygulanır.
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 mb-6 text-center text-xs text-subtle">
        © 2025 Miron Intelligence — All Rights Reserved
      </footer>
    </div>
  );
}
