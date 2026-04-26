import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { emitToast } from "../utils/toastBus";
import { passwordMeetsPolicy } from "../utils/passwordPolicy";

/**
 * Register.jsx — Kullanım Şartları + Gizlilik tek onay; sunucu `accepted_terms_and_privacy` doğrular.
 */

function duplicatePasswordsExist(persons) {
  const pw = persons.map((p) => (p.password || "").trim()).filter(Boolean);
  const set = new Set(pw);
  return pw.length !== set.size;
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [mode, setMode] = useState("single");
  const [city, setCity] = useState("");
  const [firm, setFirm] = useState("");

  // single user fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(""); //  e-posta eklendi
  const [password, setPassword] = useState("");

  // multi user
  const [personCount, setPersonCount] = useState(2);
  const [persons, setPersons] = useState([
    { firstName: "", lastName: "", email: "", password: "" }, // 
    { firstName: "", lastName: "", email: "", password: "" }, // 
  ]);

  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);


  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  
  const [pricingData, setPricingData] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");

  useEffect(() => {
    async function fetchPrice() {
      try {
        const count = mode === "single" ? 1 : personCount;
        const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
        const code = (discountCode || "").trim();
        const payload = code ? { count, discount_code: code } : { count };
        const res = await fetch(`${base}/api/pricing/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setPricingData(data);
          setDiscountError("");
        } else {
          if (res.status === 400) {
            setDiscountError("İndirim kodu geçersiz, süresi dolmuş veya kullanım sınırı doldu.");
          }
        }
      } catch (e) {
        console.error("Price fetch error", e);
      }
    }
    fetchPrice();
  }, [mode, personCount, discountCode]);

  useEffect(() => {
    // ensure persons array length matches personCount
    setPersons((prev) => {
      const next = [...prev];
      if (personCount > next.length) {
        for (let i = next.length; i < personCount; i++) {
          next.push({ firstName: "", lastName: "", email: "", password: "" }); // 
        }
      } else if (personCount < next.length) {
        next.length = personCount;
      }
      return next;
    });
     
  }, [personCount]);

  const isValidEmail = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    return /\S+@\S+\.\S+/.test(v);
  };

  const validSingle = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      isValidEmail(email) &&
      passwordMeetsPolicy(password)
    );
  }, [firstName, lastName, email, password]);

  const validMulti = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length >= 8 &&
      personCount >= 3
    );
  }, [firstName, lastName, email, password, personCount]);

  const disabled = !validSingle || !acceptedTermsPrivacy;

  const updatePerson = (idx, key, value) => {
    setPersons((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const onCountChange = (n) => {
    const count = Number(n);
    setPersonCount(count);
  };

  const handleSubmit = async () => {
    if (submitting || disabled) return;
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    const normalizedDiscount = (discountCode || "").trim().toUpperCase();
    
    const modeToSend = "single";

    const payload =
      mode === "single"
        ? {
            mode: modeToSend,
            count: 1,
            city,
            firm: firm || "",
            discount_code: normalizedDiscount || undefined,
            persons: [
              {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password: password,
              },
            ],
          }
        : {
            mode,
            count: personCount,
            city,
            firm: firm || "",
            discount_code: normalizedDiscount || undefined,
            persons: persons.map((p) => ({
              firstName: p.firstName.trim(),
              lastName: p.lastName.trim(),
              email: (p.email || "").trim(),
              password: p.password,
            })),
          };

    try {
      const list = payload.persons || [];
      let verificationNeeded = false;
      
      const cardPayload = null;

      for (const p of list) {
        const res = await register({
          email: p.email,
          password: p.password,
          firstName: p.firstName,
          lastName: p.lastName,
          mode: payload.mode,
          discountCode: normalizedDiscount || undefined,
          consents: null,
          card: cardPayload,
          acceptedTermsAndPrivacy: acceptedTermsPrivacy,
        });
        if (res && res.requires_verification) {
          verificationNeeded = true;
        }
      }
      setSubmitSuccess("Kayıt başarılı.");
      emitToast("Kayıt alındı. E-posta doğrulamasını tamamlayın.", "success");
      
      navigate("/pricing", { state: { ...payload, verificationNeeded } });

    } catch (e) {
      const msg = e?.message || "Kayıt başarısız.";
      setSubmitError(msg);
      emitToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const duplicatePw = duplicatePasswordsExist(persons);

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 pb-12">
      <div className="glass p-6 sm:p-8 rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-accent">
            Miron AI – Hukuk Odaklı Yapay Zekâ Paketi
          </h2>
          <p className="text-sm text-subtle mt-1">
            Türkiye’nin en akıllı hukuk otomasyon platformuna erişim için bilgilerinizi girin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 glass p-4 rounded-xl">
            <div className="font-semibold mb-2">Kayıt Tipi</div>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "single"} onChange={() => setMode("single")} />
              <span>Şahıs (tek kullanıcı)</span>
            </label>
            <div className="mt-4">
              <div className="text-sm mb-1">Şehir (opsiyonel)</div>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="İstanbul"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
              />
            </div>

            <div className="mt-3">
              <div className="text-sm mb-1">Hukuk Bürosu (opsiyonel)</div>
              <input
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                placeholder="Miron Hukuk"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
              />
            </div>
          </div>

          <div className="md:col-span-2 glass p-4 rounded-xl">
            {mode === "single" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm mb-1">
                    Ad <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                </div>

                <div>
                  <div className="text-sm mb-1">
                    Soyad <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>

                {/*  E-POSTA EKLENDİ (görünüş aynı) */}
                <div className="sm:col-span-2">
                  <div className="text-sm mb-1">
                    E-posta <span className="text-red-400">*</span>
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                  />
                </div>

                <div className="sm:col-span-2 mt-2">
                  <div className="text-sm mb-1">
                    Şifre <span className="text-red-400">*</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 12 karakter, büyük/küçük harf, rakam, özel karakter"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                  <div className="text-[12px] mt-2 text-subtle">
                    En az 12 karakter; büyük harf, küçük harf, rakam ve özel karakter (!@#$… vb.) gerekir.
                  </div>
                </div>

                <div className="sm:col-span-2 mt-4 p-4 rounded-2xl border border-white/10 bg-black/30 space-y-2">
                  <div className="text-sm font-semibold text-white/90">Hesap oluşturma</div>
                  <p className="text-xs text-white/50">
                    Kayıt için gerekli alanları doldurun. Ödeme adımı paket seçiminde yapılır.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm mb-1">Kişi Sayısı</div>
                    <select
                      value={personCount}
                      onChange={(e) => onCountChange(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-white/15 text-white font-medium bg-black/60 backdrop-blur-md shadow-inner focus:ring-2 focus:ring-[var(--miron-gold)] outline-none transition-all hover:scale-[1.01]"
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        color: "#e3e3e3",
                        backgroundImage:
                          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23FFD700' d='M7 10l5 5 5-5z'/></svg>\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 10px center",
                        backgroundSize: "16px 16px",
                      }}
                    >
                      {Array.from({ length: 199 }).map((_, i) => {
                        const n = i + 2; // 2..200
                        return (
                          <option key={n} value={n} className="bg-[#0b0b0c] text-white">
                            {n}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Çok kişili uyarı (görünür yerde) */}
                <div className="mt-4 p-3 rounded-xl border border-red-400/30 bg-red-500/5 text-sm text-red-600">
                   Lütfen aynı şifreyi birden fazla kişiyle paylaşmayın. Her kullanıcı kendi şifresini belirlemelidir.
                  Aksi durumda güvenlik riski oluşur.
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {persons.map((p, idx) => (
                    <div key={idx} className="glass p-3 rounded-xl">
                      <div className="text-xs opacity-70 mb-2">Kişi {idx + 1}</div>

                      <input
                        value={p.firstName}
                        onChange={(e) => updatePerson(idx, "firstName", e.target.value)}
                        placeholder="Ad *"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 mb-2 text-white"
                      />

                      <input
                        value={p.lastName}
                        onChange={(e) => updatePerson(idx, "lastName", e.target.value)}
                        placeholder="Soyad *"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 mb-2 text-white"
                      />

                      {/*  E-POSTA EKLENDİ (görünüş aynı) */}
                      <input
                        value={p.email}
                        onChange={(e) => updatePerson(idx, "email", e.target.value)}
                        placeholder="E-posta *"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 mb-2 text-white"
                      />

                      <input
                        type="password"
                        value={p.password}
                        onChange={(e) => updatePerson(idx, "password", e.target.value)}
                        placeholder="Şifre * (en az 8 karakter)"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {pricingData && (
              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-subtle mb-1">İndirim Kodu (opsiyonel)</label>
                    <input
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Örn. BARO10"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white text-sm"
                    />
                  </div>
                  {discountError && (
                    <div className="text-xs text-red-400 mb-1">
                      {discountError}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-accent/40">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-subtle">Kişi Sayısı:</span>
                    <span className="text-white font-medium">{pricingData.count}</span>
                  </div>
                  {pricingData.applied_discount_rate > 0 && (
                    <div className="flex justify-between items-center text-sm mb-1 text-green-400">
                      <span>Toplu İndirim %{pricingData.applied_discount_rate}</span>
                      <span>
                        -{(pricingData.discount_amount - (pricingData.discount_code_amount || 0)).toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  )}
                  {pricingData.discount_code && pricingData.discount_code_amount > 0 && (
                    <div className="flex justify-between items-center text-sm mb-1 text-green-400">
                      <span>Kupon ({pricingData.discount_code})</span>
                      <span>
                        -{pricingData.discount_code_amount.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/15">
                    <span className="text-white font-semibold">Toplam Tutar:</span>
                    <div className="text-right">
                      {(pricingData.applied_discount_rate > 0 || (pricingData.discount_code_amount || 0) > 0) && (
                        <span className="text-xs text-subtle line-through mr-2">
                          {pricingData.raw_total.toLocaleString("tr-TR")} TL
                        </span>
                      )}
                      <span className="text-xl font-bold text-accent">
                        {pricingData.final_total.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sözleşme onayı ve uyarılar */}
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-xs text-subtle uppercase tracking-wider">Yasal onaylar (zorunlu)</p>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTermsPrivacy}
                  onChange={(e) => setAcceptedTermsPrivacy(e.target.checked)}
                />
                <div className="text-sm">
                  <Link to="/legal/terms" className="font-medium text-accent underline" target="_blank" rel="noreferrer">
                    Kullanım Şartları
                  </Link>
                  {" "}ve{" "}
                  <Link to="/legal/privacy" className="font-medium text-accent underline" target="_blank" rel="noreferrer">
                    Gizlilik Politikası
                  </Link>
                  ’nı okudum, kabul ediyorum.
                </div>
              </label>

              {mode === "multi" && duplicatePw && (
                <div className="p-3 rounded-xl border border-yellow-400/30 bg-yellow-500/5 text-sm text-yellow-600">
                   Uyarı: Kayıt edilen kişiler arasında aynı şifre tespit edildi. Her kullanıcı için benzersiz bir şifre
                  belirleyin.
                </div>
              )}

              <div className="flex flex-col gap-3 items-end">
                {submitError && (
                  <div className="w-full p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-sm text-red-200">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="w-full p-3 rounded-xl border border-green-400/30 bg-green-500/10 text-sm text-green-200">
                    {submitSuccess}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={disabled || submitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Kayıt gönderiliyor..." : "Kaydı Tamamla"}
                </button>
              </div>
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
