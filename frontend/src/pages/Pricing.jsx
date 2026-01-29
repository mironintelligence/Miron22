import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function tl(n) {
  return n.toLocaleString("tr-TR") + " TL";
}

function calcRealPrice(count) {
  if (count <= 1) return 6000;
  if (count === 2) return 6000 + 4000;
  return 6000 + 4000 + 2000 * (count - 2);
}

function calcCrossedPrice(count) {
  return 6000 + 4000 * (count - 1);
}

export default function Pricing() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // 🔹 İndirim kodu state'leri
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountMsg, setDiscountMsg] = useState("");

  useEffect(() => {
    if (!state) navigate("/register");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const count = state?.count || 1;
  const isMulti = state?.mode === "multi";
  const showCrossed = isMulti && count >= 3;

  const real = useMemo(() => calcRealPrice(count), [count]);
  const crossed = useMemo(
    () => (showCrossed ? calcCrossedPrice(count) : null),
    [showCrossed, count]
  );

  // 🔹 İndirim kodu kontrolü
  const applyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountPercent(0);
      setDiscountMsg("Lütfen bir indirim kodu girin.");
      return;
    }

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/admin/validate-discount?code=" +
          encodeURIComponent(code)
      );

      if (!res.ok) {
        setDiscountPercent(0);
        setDiscountMsg("❌ Kod geçersiz veya süresi dolmuş.");
        return;
      }

      const data = await res.json();

      if (!data.percent || data.percent <= 0) {
        setDiscountPercent(0);
        setDiscountMsg("❌ Bu kod için indirim tanımlı değil.");
        return;
      }

      setDiscountPercent(data.percent);
      setDiscountMsg("✅ %" + data.percent + " indirim uygulandı!");
    } catch (e) {
      console.error(e);
      setDiscountPercent(0);
      setDiscountMsg("❌ Kod doğrulanırken bir hata oluştu.");
    }
  };

  // 🔹 İndirimli fiyat hesaplama
  const finalPrice = useMemo(() => {
    if (!discountPercent) return real;
    const discounted = real - real * (discountPercent / 100);
    return Math.round(discounted);
  }, [real, discountPercent]);

  return (
    <div className="min-h-screen mt-12 px-6 sm:px-10 md:px-16 pb-12">
      <div className="glass p-6 sm:px-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Libra AI – Legal Intelligence Suite
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Lisansınızı etkinleştirin ve tüm modüllere erişin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Özellikler */}
          <div className="lg:col-span-7 glass p-5 rounded-2xl">
            <h3 className="font-semibold text-cyan-300 mb-3">Paket Özellikleri</h3>
            <ul className="text-sm space-y-2 text-gray-200">
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
            <div className="text-sm text-gray-400">
              {isMulti
                ? "Çok kişili lisans • " + count + " kullanıcı"
                : "Şahıs lisansı • 1 kullanıcı"}
            </div>

            {/* Ödeme uyarısı */}
            <div className="mt-3 p-3 rounded-xl border border-red-400/30 bg-red-500/5 text-sm text-red-600">
              ⚠ Her hesap <strong>1 kişiliktir</strong>. Lütfen aynı hesabı birden
              fazla kişiyle paylaşmayın. Aksi halde aboneliğiniz iptal edilebilir.
            </div>

            {/* Eski fiyat ve indirimli fiyat */}
            <div className="mt-4">
              {showCrossed && crossed != null && (
                <div className="text-lg text-gray-400 line-through">
                  {tl(crossed)}
                </div>
              )}

              <div className="text-3xl font-extrabold text-white">
                {tl(finalPrice)}
              </div>

              {/* İndirim alanı */}
              <div className="mt-4">
                <input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="İndirim kodu"
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white"
                />
                <button
                  onClick={applyDiscount}
                  className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold"
                >
                  Kodu Uygula
                </button>

                {discountMsg && (
                  <div className="text-sm text-red-400 mt-2">{discountMsg}</div>
                )}
              </div>
            </div>

            <button
              onClick={() =>
                alert("Ödeme entegrasyonu daha sonra bağlanacak.")
              }
              className="mt-5 w-full py-3 rounded-xl font-semibold text-white shadow bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-95 transition"
            >
              Satın Al
            </button>

            <div className="text-[11px] text-gray-400 mt-3">
              * Çoklu satın alımlarda 3+ kişide özel indirim uygulanır.
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 mb-6 text-center text-xs text-gray-500">
        © 2025 Miron Intelligence — All Rights Reserved
      </footer>
    </div>
  );
}