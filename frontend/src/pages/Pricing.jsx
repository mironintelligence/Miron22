import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function tl(n) {
  return n.toLocaleString("tr-TR") + " TL";
}

export default function Pricing() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [pricingData, setPricingData] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    if (!state) navigate("/register");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const count = state?.count || 1;
  const isMulti = state?.mode === "multi";
  const verificationNeeded = state?.verificationNeeded;

  useEffect(() => {
    async function fetchPrice() {
      setLoadingPrice(true);
      try {
        const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
        const res = await fetch(`${base}/api/pricing/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count }),
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
  }, [count]);

  const showCrossed = pricingData?.is_discounted;
  const rawTotal = pricingData?.raw_total || 0;
  const finalPrice = pricingData?.final_total || 0;
  
  const crossed = showCrossed ? rawTotal : null;

  return (
    <div className="min-h-screen mt-12 px-6 sm:px-10 md:px-16 pb-12 bg-black text-white">
      <div className="glass p-6 sm:px-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">
            Libra AI – Legal Intelligence Suite
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
            <ul className="text-sm space-y-2 text-muted">
              <li>📂 Evrak Analizi</li>
              <li>🧾 Dilekçe Oluşturucu</li>
              <li>💬 Miron Assistant</li>
              <li>🔐 KVKK Maskeleme</li>
              <li>⚖️ Yargıtay Karar Arama (Yakında)</li>
              <li>📚 Mevzuat Analizi (Yakında)</li>
              <li>🎯 Dava Simülasyonu (Yakında)</li>
              <li>🧠Risk & Strateji Analizi</li>
            </ul>
          </div>

          {/* Fiyat kutusu */}
          <div className="lg:col-span-5 glass p-5 rounded-2xl border border-white/10">
            <div className="text-sm text-subtle">
              {isMulti
                ? "Çok kişili lisans • " + count + " kullanıcı"
                : "Şahıs lisansı • 1 kullanıcı"}
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

              <div className="text-3xl font-extrabold text-white">
                {tl(finalPrice)}
              </div>

              {/* İndirim alanı - OTOMATİK UYGULANIYOR */}
              <div className="mt-4 text-sm text-subtle">
                * Toplu alımlarda indirim otomatik uygulanır.
              </div>
            </div>

            <button
              onClick={() =>
                alert("Ödeme entegrasyonu daha sonra bağlanacak.")
              }
              className="mt-5 w-full btn-primary"
            >
              Satın Al
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
