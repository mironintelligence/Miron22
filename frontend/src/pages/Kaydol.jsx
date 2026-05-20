import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { register as apiRegister } from "../auth/api";
import { emitToast } from "../utils/toastBus";
import { passwordMeetsPolicy } from "../utils/passwordPolicy";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { getApiBase } from "../lib/apiBase.js";

const panelMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

const TR_CITIES = [
  "Adana",
  "Ankara",
  "Antalya",
  "Aydın",
  "Balıkesir",
  "Bursa",
  "Denizli",
  "Diyarbakır",
  "Eskişehir",
  "Gaziantep",
  "İstanbul",
  "İzmir",
  "Kayseri",
  "Kocaeli",
  "Konya",
  "Mersin",
  "Samsun",
  "Şanlıurfa",
  "Trabzon",
  "Diğer",
];

const LEGAL_FEATURES = [
  "Dava merkezi ve dosya özeti",
  "Yargıtay ve mevzuat araştırması",
  "Belge stüdyosu ve dilekçe yardımı",
  "Sözleşme analizi",
  "Bildirimler ve hatırlatmalar",
  "KVKK uyumlu veri işleme ve denetim izi",
  "Kurumsal destek ve güncellemeler",
];

const QUESTIONS = [
  {
    key: "invest",
    title: "Yatırım isteği",
    text: "İşinizi büyütmek için teknolojiye yatırım yapmaya hazır mısınız?",
  },
  {
    key: "compete",
    title: "Rekabet",
    text: "Rakiplerinizden daha hızlı ve kaliteli hizmet sunmak istiyor musunuz?",
  },
  {
    key: "time",
    title: "Zaman problemi",
    text: "Rutin evrak işleri için haftada 10 saatten fazla zaman harcıyor musunuz?",
  },
  {
    key: "regional",
    title: "Bölgesel hedef",
    text: "Olduğunuz bölgedeki en iyi avukatlardan biri misiniz veya olmak istiyor musunuz?",
  },
  {
    key: "national",
    title: "Ulusal hedef",
    text: "Türkiye'nin en iyi avukatlarından biri olmak istiyor musunuz veya öyle misiniz?",
  },
];

const STORAGE_KEY = "miron_register_flow_v1";

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function StepBar({ phase }) {
  const steps = [
    { id: "q", label: "1. Uygunluk" },
    { id: "r", label: "2. Kayıt olma" },
    { id: "p", label: "3. Ödeme" },
  ];
  const active =
    phase === "questions" || phase === "unsuitable" || phase === "pricing" ? 0 : phase === "payment" ? 2 : 1;
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="flex items-center justify-between gap-1 sm:gap-3 mb-3">
        {steps.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col items-center min-w-0">
            <div
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-black shrink-0 border-2 transition-colors ${
                i < active
                  ? "border-[var(--miron-gold)] bg-[var(--miron-gold)]/20 text-[var(--miron-gold)]"
                  : i === active
                    ? "border-[var(--miron-gold)] bg-[var(--miron-gold)] text-black shadow-[0_0_20px_rgba(255,215,0,0.25)]"
                    : "border-white/15 text-white/35 bg-black/30"
              }`}
            >
              {i < active ? "✓" : i + 1}
            </div>
            <span
              className={`mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center leading-tight max-w-[5.5rem] sm:max-w-none ${
                i === active ? "text-[var(--miron-gold)]" : "text-white/40"
              }`}
            >
              {s.label.replace(/^\d\.\s*/, "")}
            </span>
          </div>
        ))}
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-700 to-[var(--miron-gold)]"
          initial={false}
          animate={{ width: `${((active + 1) / 3) * 100}%` }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function Kaydol() {

  const persisted = useMemo(() => loadPersisted(), []);
  const [phase, setPhase] = useState(persisted?.phase || "questions");
  const [answers, setAnswers] = useState(persisted?.answers || {});
  const [qIndex, setQIndex] = useState(persisted?.qIndex || 0);
  const [selectedPlan, setSelectedPlan] = useState(persisted?.selectedPlan || null);
  const [publicPrices, setPublicPrices] = useState(null);

  const [firstName, setFirstName] = useState(persisted?.firstName || "");
  const [lastName, setLastName] = useState(persisted?.lastName || "");
  const [email, setEmail] = useState(persisted?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(persisted?.phone || "");
  const [lawFirm, setLawFirm] = useState(persisted?.lawFirm || "");
  const [city, setCity] = useState(persisted?.city || "");
  const [discountCode, setDiscountCode] = useState(persisted?.discountCode || "");
  const [acceptedTermsPrivacy, setAcceptedTermsPrivacy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          phase,
          answers,
          qIndex,
          selectedPlan,
          firstName,
          lastName,
          email,
          phone,
          lawFirm,
          city,
          discountCode,
        })
      );
    } catch {
      /* ignore */
    }
  }, [phase, answers, qIndex, selectedPlan, firstName, lastName, email, phone, lawFirm, city, discountCode]);

  useEffect(() => {
    persist();
  }, [persist]);

  useEffect(() => {
    const base = getApiBase();
    fetch(`${String(base).replace(/\/+$/, "")}/api/pricing/public-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPublicPrices)
      .catch(() => setPublicPrices(null));
  }, []);

  const listPrice = publicPrices?.legal_list_price ?? 24000;
  const salePrice = publicPrices?.legal_sale_price ?? 12000;

  const isValidEmail = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    return /\S+@\S+\.\S+/.test(v);
  };

  const formValid = useMemo(() => {
    const base =
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      isValidEmail(email) &&
      passwordMeetsPolicy(password) &&
      phone.trim().length >= 10 &&
      lawFirm.trim().length > 0 &&
      city.trim().length > 0;
    if (selectedPlan === "legal") return base;
    if (selectedPlan === "enterprise") {
      return (
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        isValidEmail(email) &&
        passwordMeetsPolicy(password) &&
        phone.trim().length >= 10 &&
        lawFirm.trim().length > 0 &&
        city.trim().length > 0
      );
    }
    return false;
  }, [firstName, lastName, email, password, phone, lawFirm, city, selectedPlan]);

  const answerQuestion = (yes) => {
    const q = QUESTIONS[qIndex];
    const next = { ...answers, [q.key]: yes };
    setAnswers(next);
    if (!yes) {
      setPhase("unsuitable");
      return;
    }
    if (qIndex >= QUESTIONS.length - 1) {
      setPhase("pricing");
      setQIndex(0);
      return;
    }
    setQIndex((i) => i + 1);
  };

  const restartQuestions = () => {
    setAnswers({});
    setQIndex(0);
    setPhase("questions");
    setSelectedPlan(null);
  };

  const choosePlan = (plan) => {
    setSelectedPlan(plan);
    if (plan === "enterprise") {
      return;
    }
    setPhase("register");
  };

  const startRegisterFromEnterprise = () => {
    setSelectedPlan("enterprise");
    setPhase("register");
  };

  const runBackendRegister = async (sbAccessToken) => {
    const normalizedDiscount = (discountCode || "").trim().toUpperCase();
    const payload = {
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mode: "single",
      discountCode: normalizedDiscount || undefined,
      consents: null,
      card: null,
      acceptedTermsAndPrivacy: acceptedTermsPrivacy,
      phone: phone.trim(),
      law_firm: lawFirm.trim(),
      city: city.trim(),
      registration_plan: selectedPlan === "enterprise" ? "enterprise" : "legal",
    };
    await apiRegister(payload, { supabaseAccessToken: sbAccessToken || undefined });
  };

  const handleCompleteRegistration = async () => {
    if (submitting || !formValid || !acceptedTermsPrivacy) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim(),
              law_firm: lawFirm.trim(),
              city: city.trim(),
              registration_plan: selectedPlan,
            },
          },
        });
        if (signErr) {
          throw new Error(signErr.message || "Kayıt başlatılamadı.");
        }
        const sess = signData?.session;
        if (sess?.access_token) {
          await runBackendRegister(sess.access_token);
          emitToast("Kayıt tamamlandı.", "success");
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
          try {
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          setPhase("payment");
          return;
        }
        setPhase("verify");
        emitToast("E-postanıza doğrulama kodu gönderildi.", "success");
        return;
      }

      await runBackendRegister(null);
      emitToast("Kayıt oluşturuldu.", "success");
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setPhase("payment");
    } catch (e) {
      const msg = e?.message || "Kayıt başarısız.";
      setSubmitError(msg);
      emitToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const digits = otpCode.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 12) {
      emitToast("Geçerli bir doğrulama kodu girin (e-postadaki kod).", "error");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: digits,
        type: "signup",
      });
      if (error) throw new Error(error.message || "Doğrulama başarısız.");
      const tok = data?.session?.access_token;
      if (!tok) throw new Error("Oturum oluşturulamadı.");
      await runBackendRegister(tok);
      emitToast("E-posta doğrulandı.", "success");
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      setPhase("payment");
    } catch (e) {
      const msg = e?.message || "Doğrulama başarısız.";
      setSubmitError(msg);
      emitToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resendSignup = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      emitToast("Kod yeniden gönderildi.", "success");
    } catch (e) {
      emitToast(e?.message || "Gönderilemedi", "error");
    }
  };

  return (
    <div className="premium-scope relative min-h-screen overflow-hidden px-6 sm:px-10 md:px-16 pb-20 flex flex-col items-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.07),transparent_50%)]" />
        <div className="absolute top-24 left-1/2 h-64 w-[min(90vw,42rem)] -translate-x-1/2 rounded-full bg-[var(--miron-gold)]/[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "url('/noise.svg')" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl text-center mt-2 mb-2"
      >
        <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--miron-gold)]">
          Miron AI kayıt
        </span>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">
          Uygunluk ve hesap
        </h1>
        <p className="mt-2 text-sm text-white/50 max-w-md mx-auto leading-relaxed">
          Birkaç soru, paket seçimi ve güvenli kayıt — deneme veya demo adımı yoktur.
        </p>
      </motion.div>

      <StepBar phase={phase} />

      <AnimatePresence mode="wait">
        {phase === "questions" && (
          <motion.div key="questions" className="w-full max-w-lg" {...panelMotion}>
            <div className="glass p-8 sm:p-10 rounded-2xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3 mb-6">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--miron-gold)]/90">
                  Uygunluk testi
                </span>
                <span className="text-xs text-white/40 tabular-nums">
                  {qIndex + 1} / {QUESTIONS.length}
                </span>
              </div>
              <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[var(--miron-gold)]"
                  initial={false}
                  animate={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{QUESTIONS[qIndex].title}</h2>
              <p className="text-white/75 text-sm sm:text-base mb-8 leading-relaxed">{QUESTIONS[qIndex].text}</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => answerQuestion(false)}
                  className="py-4 rounded-xl border border-white/20 text-white hover:bg-white/[0.06] hover:border-white/30 transition font-semibold text-sm sm:text-base"
                >
                  Hayır
                </button>
                <button
                  type="button"
                  onClick={() => answerQuestion(true)}
                  className="py-4 rounded-xl bg-[var(--miron-gold)] text-black font-black hover:brightness-110 transition text-sm sm:text-base shadow-[0_8px_32px_rgba(255,215,0,0.2)]"
                >
                  Evet
                </button>
              </div>
              <p className="text-[11px] text-subtle mt-6 text-center leading-relaxed">
                “Hayır” derseniz Miron AI şu an için profilinize uygun görünmeyebilir.
              </p>
            </div>
          </motion.div>
        )}

        {phase === "unsuitable" && (
          <motion.div key="unsuitable" className="w-full max-w-lg" {...panelMotion}>
            <div className="glass p-8 rounded-2xl border border-red-500/20 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <h2 className="text-2xl font-black text-white mb-3">Miron AI için uygun değilsiniz</h2>
              <p className="text-sm text-subtle mb-8 leading-relaxed">
                Yanıtlarınıza göre platform şu aşamada ihtiyaçlarınızla örtüşmüyor. İleride tekrar değerlendirmek isterseniz
                sorulara yeniden başlayabilirsiniz.
              </p>
              <button
                type="button"
                onClick={restartQuestions}
                className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/[0.08] transition"
              >
                Sorulara dön
              </button>
              <Link to="/" className="block mt-4 text-sm text-accent underline">
                Ana sayfa
              </Link>
            </div>
          </motion.div>
        )}

        {phase === "pricing" && (
          <motion.div key="pricing" className="w-full max-w-3xl" {...panelMotion}>
        <div className="mt-2 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Paket seçimi</h1>
            <p className="text-sm text-subtle mt-2">Uygunluk adımlarını tamamladınız. Devam etmek için bir seçenek seçin.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass p-6 sm:p-8 rounded-2xl border border-[var(--miron-gold)]/45 flex flex-col shadow-[0_20px_60px_rgba(255,215,0,0.08)]">
              <div className="text-xs font-bold text-[var(--miron-gold)] uppercase tracking-widest mb-2">Miron AI Legal</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg text-white/40 line-through">{Number(listPrice).toLocaleString("tr-TR")} TL</span>
                <span className="text-3xl font-black text-white">{Number(salePrice).toLocaleString("tr-TR")} TL</span>
              </div>
              <p className="text-xs text-subtle mb-4">Tek kullanıcı — fiyat ve indirim oranı yönetici panelinden güncellenir.</p>
              <ul className="text-sm text-white/80 space-y-2 mb-6 flex-1">
                {LEGAL_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--miron-gold)]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => choosePlan("legal")} className="w-full py-4 rounded-xl bg-[var(--miron-gold)] text-black font-black">
                1. Kayıt ol
              </button>
            </div>

            <div className="glass p-6 sm:p-8 rounded-2xl border border-white/[0.12] flex flex-col bg-black/20">
              <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Enterprise</div>
              <h3 className="text-xl font-bold text-white mb-2">Çoklu kullanıcı</h3>
              <p className="text-sm text-subtle mb-4">Tüm özellikler ve kullanıcı sayısına göre özel indirim.</p>
              <ul className="text-sm text-white/80 space-y-2 mb-6 flex-1">
                <li className="flex gap-2">
                  <span className="text-[var(--miron-gold)]">✓</span>
                  <span>Sınırsız ölçekte ekip lisansı</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--miron-gold)]">✓</span>
                  <span>Öncelikli kurumsal destek</span>
                </li>
              </ul>
              <a
                href="mailto:mironai@mironintelligence.com?subject=Miron%20AI%20Enterprise%20bilgi%20talebi"
                className="block w-full py-4 rounded-xl border border-white/25 text-center text-white font-bold hover:bg-white/5 transition mb-3"
              >
                İletişime geç
              </a>
              <button type="button" onClick={startRegisterFromEnterprise} className="w-full py-3 rounded-xl bg-white/10 text-sm font-semibold text-white/90">
                1. Kayıt ol (kurumsal ön kayıt)
              </button>
            </div>
          </div>
        </div>
          </motion.div>
        )}

        {phase === "register" && (
          <motion.div key="register" className="w-full max-w-lg" {...panelMotion}>
        <div className="glass p-8 sm:p-10 rounded-2xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <h1 className="text-2xl sm:text-3xl font-black text-white text-center mb-2">
            {selectedPlan === "enterprise" ? "Kurumsal ön kayıt" : "Hesap oluştur"}
          </h1>
          <p className="text-center text-sm text-subtle mb-6">
            {selectedPlan === "enterprise"
              ? "Ekibiniz için ön kayıt. Onay sonrası satış ekibi sizinle iletişime geçer."
              : "Bilgilerinizi girin; e-posta doğrulamasından sonra ödeme adımına geçebilirsiniz (ödeme altyapısı yakında)."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm mb-1 text-subtle">
                Ad <span className="text-red-400">*</span>
              </div>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                autoComplete="given-name"
              />
            </div>
            <div>
              <div className="text-sm mb-1 text-subtle">
                Soyad <span className="text-red-400">*</span>
              </div>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                autoComplete="family-name"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm mb-1 text-subtle">
                E-posta <span className="text-red-400">*</span>
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm mb-1 text-subtle">
                Cep telefonu <span className="text-red-400">*</span>
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                placeholder="+90 5xx xxx xx xx"
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm mb-1 text-subtle">
                Hukuk bürosu <span className="text-red-400">*</span>
              </div>
              <input
                value={lawFirm}
                onChange={(e) => setLawFirm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                placeholder="Büro adı"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm mb-1 text-subtle">
                Şehir <span className="text-red-400">*</span>
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
              >
                <option value="">Seçin</option>
                {TR_CITIES.map((c) => (
                  <option key={c} value={c} className="bg-black text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm mb-1 text-subtle">
                Şifre <span className="text-red-400">*</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                autoComplete="new-password"
              />
              <div className="text-[12px] mt-1 text-subtle">Güçlü şifre politikası geçerlidir.</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs text-subtle mb-1">İndirim kodu (opsiyonel)</label>
            <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white text-sm"
              placeholder="Örn. BARO10"
            />
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-xs text-subtle uppercase tracking-wider">Yasal onaylar</p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptedTermsPrivacy}
                onChange={(e) => setAcceptedTermsPrivacy(e.target.checked)}
              />
              <span>
                <Link to="/legal/terms" className="text-accent underline" target="_blank" rel="noreferrer">
                  Kullanım Şartları
                </Link>{" "}
                ve{" "}
                <Link to="/legal/privacy" className="text-accent underline" target="_blank" rel="noreferrer">
                  Gizlilik Politikası
                </Link>
                ’nı okudum, kabul ediyorum.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="mt-4 p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-sm text-red-200">{submitError}</div>
          )}

          <button
            type="button"
            onClick={handleCompleteRegistration}
            disabled={!formValid || !acceptedTermsPrivacy || submitting}
            className="mt-8 w-full py-4 rounded-2xl bg-white text-black text-lg font-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "İşleniyor…" : "Kaydı tamamla"}
          </button>

          <button type="button" onClick={() => setPhase("pricing")} className="mt-4 w-full text-sm text-subtle hover:text-white transition">
            ← Paket seçimine dön
          </button>

          <p className="mt-6 text-center text-xs text-subtle">
            Zaten hesabınız var mı?{" "}
            <Link to="/login" className="text-accent underline">
              Giriş yapın
            </Link>
          </p>
        </div>
          </motion.div>
        )}

        {phase === "verify" && (
          <motion.div key="verify" className="w-full max-w-md" {...panelMotion}>
        <div className="glass p-8 rounded-2xl border border-[var(--miron-gold)]/25 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <h2 className="text-xl font-bold text-white mb-2 text-center">E-posta doğrulama</h2>
          <p className="text-sm text-subtle text-center mb-6">
            Supabase üzerinden gönderilen doğrulama kodunu girin. Proje ayarlarınızda OTP 12 hane olacak şekilde
            yapılandırılmışsa tam 12 haneyi girin; aksi halde e-postadaki kod uzunluğuna uyun (çoğu projede 6 hanedir).
          </p>
          <input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            className="w-full px-3 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-center text-2xl tracking-[0.2em] font-mono mb-4"
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          {submitError && <div className="mb-4 text-sm text-red-300">{submitError}</div>}
          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold disabled:opacity-50"
          >
            {submitting ? "Doğrulanıyor…" : "Onayla ve devam et"}
          </button>
          <button type="button" onClick={resendSignup} className="w-full mt-3 text-sm text-accent underline">
            Kodu tekrar gönder
          </button>
        </div>
          </motion.div>
        )}

        {phase === "payment" && (
          <motion.div key="payment" className="w-full max-w-lg" {...panelMotion}>
        <div className="glass p-8 rounded-2xl border border-emerald-500/20 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <h2 className="text-xl font-bold text-white mb-2">Ödeme</h2>
          <p className="text-sm text-subtle mb-6">
            Ödeme altyapısı yakında aktif edilecek. Şimdilik kaydınız tamamlandı; giriş yaparak devam edebilirsiniz.
          </p>
          <Link to="/login" className="inline-flex px-6 py-3 rounded-xl bg-[var(--miron-gold)] text-black font-bold hover:brightness-110 transition">
            Giriş sayfası
          </Link>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
