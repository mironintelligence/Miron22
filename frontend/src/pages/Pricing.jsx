import React, { useEffect, useMemo, useState } from "react";

function tl(n) {
  return n.toLocaleString("tr-TR") + " TL";
}

export default function Pricing() {
  const [people, setPeople] = useState(3);
  const [pricingData, setPricingData] = useState(null);
  const [settings, setSettings] = useState({
    base_price: 6999,
    bulk_discount_rate: 12.5,
    bulk_threshold: 3,
    legal_list_price: 24000,
    legal_sale_price: 12000,
  });
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    async function fetchPrice() {
      setLoadingPrice(true);
      try {
        const payload = { count: people };
        const res = await fetch(`/api/pricing/calculate`, {
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
  }, [people]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/pricing/public-settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            base_price: Number(data.base_price || 6999),
            bulk_discount_rate: Number(data.bulk_discount_rate || 12.5),
            bulk_threshold: Number(data.bulk_threshold || 3),
            legal_list_price: Number(data.legal_list_price || 24000),
            legal_sale_price: Number(data.legal_sale_price || 12000),
          });
        }
      } catch {
        // public fallback defaults
      }
    }
    fetchSettings();
  }, []);

  const showCrossed = pricingData?.is_discounted;
  const rawTotal = pricingData?.raw_total || 0;
  const finalPrice = pricingData?.final_total || 0;
  const crossed = showCrossed ? rawTotal : null;
  const bulkUnit = useMemo(() => {
    return Number(settings.base_price) * (1 - Number(settings.bulk_discount_rate) / 100);
  }, [settings]);

  return (
    <div className="premium-scope min-h-screen px-6 sm:px-10 md:px-16 pb-12 bg-black text-white">
      <section className="max-w-6xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col">
          <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Aylık</div>
          <div className="text-3xl font-black text-white mb-1">
            {tl(Number(settings.base_price || 6999))}
            <span className="text-lg font-semibold text-white/50"> + KDV</span>
          </div>
          <div className="text-sm text-subtle mb-4">/ ay • tek kullanıcı</div>
          <ul className="text-sm text-white/70 space-y-2 flex-1 mb-6">
            <li> Tüm çekirdek modüller</li>
            <li> E-posta destek</li>
          </ul>
          <a href="/kaydol" className="btn-primary text-center block">
            Kayıt ol
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
            <li> Aylık plana göre önemli tasarruf</li>
            <li> Öncelikli erişim</li>
          </ul>
          <a href="/kaydol" className="btn-primary text-center block">
            Kayıt ol
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto mb-10 glass p-6 rounded-2xl border border-[var(--miron-gold)]/35">
        <div className="text-xs font-bold text-[var(--miron-gold)] uppercase tracking-widest mb-2">Miron AI Legal</div>
        <div className="flex flex-wrap items-baseline gap-3 mb-2">
          <span className="text-lg text-white/40 line-through">{tl(Number(settings.legal_list_price))}</span>
          <span className="text-3xl font-black text-white">{tl(Number(settings.legal_sale_price))}</span>
          <span className="text-sm text-subtle">+ KDV · tek kullanıcı (yönetici panelinden güncellenir)</span>
        </div>
        <a href="/kaydol" className="inline-block mt-2 btn-primary text-center px-6 py-3 rounded-xl">
          Uygunluk testi ve kayıt
        </a>
      </section>

      <div className="glass p-6 sm:px-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">
            Miron AI – Hukuk Odaklı Yapay Zekâ Paketi
          </h2>
          <p className="text-sm text-subtle mt-1">
            Lisansınızı etkinleştirin ve tüm modüllere erişin.
          </p>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Özellikler */}
          <div className="lg:col-span-7 glass p-5 rounded-2xl">
            <h3 className="font-semibold text-accent mb-3">Paket Özellikleri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">Evrak Analizi</div>
                <div className="text-subtle text-xs mt-1">Otomatik özet, alan çıkarımı</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">Dilekçe Oluşturucu</div>
                <div className="text-subtle text-xs mt-1">Şablonlar, dışa aktarma</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">Miron Assistant</div>
                <div className="text-subtle text-xs mt-1">Dava bazlı soru-cevap</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">KVKK Maskeleme</div>
                <div className="text-subtle text-xs mt-1">Hassas veriler için güvenlik</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">Risk & Strateji</div>
                <div className="text-subtle text-xs mt-1">Kazanma olasılığı & riskler</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-accent font-semibold">Raporlama</div>
                <div className="text-subtle text-xs mt-1">Dosya trafiği & metrikler</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-subtle">
              <div className="glass rounded-xl p-3">
                Yargıtay Karar Arama
              </div>
              <div className="glass rounded-xl p-3">
                Mevzuat Analizi
              </div>
              <div className="glass rounded-xl p-3">
                Dava Simülasyonu
              </div>
            </div>
          </div>

          {/* Fiyat kutusu + toplu satın alım */}
          <div className="lg:col-span-5 glass p-5 rounded-2xl border border-white/10">
            <div className="text-sm text-subtle">
              Toplu Satın Alım (Ekip)
            </div>
            <div className="mt-3">
              <label className="text-xs text-white/50">Kullanıcı sayısı: {people}</label>
              <input
                type="range"
                min={3}
                max={200}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
            <div className="mt-3 text-xs text-white/60">
              {settings.bulk_threshold}+ kullanıcıda %{settings.bulk_discount_rate} indirim · Kişi başı {tl(Math.round(bulkUnit))} · Toplam {people} kişi
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-subtle">
              <div className="glass rounded-xl p-3 text-center">
                Sınırsız analiz
              </div>
              <div className="glass rounded-xl p-3 text-center">
                E-posta destek
              </div>
            </div>

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
                * Toplu alımlarda backend fiyat ayarı uygulanır.
              </div>
            </div>

            <a href="/kaydol" className="mt-5 w-full btn-primary block text-center">
              Kayıt ol
            </a>

            <div className="text-[11px] text-subtle mt-3">
              {loadingPrice ? "Hesaplama yapılıyor..." : "Toplam tutar canlı güncellenir."}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 mb-6 text-center text-xs text-subtle">
        © 2026 Miron Intelligence Ltd — All rights reserved
      </footer>
    </div>
  );
}
