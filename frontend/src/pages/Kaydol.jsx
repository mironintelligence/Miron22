import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { register as apiRegister, login as apiLogin } from "../auth/api";
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
  const steps = ["Uygunluk", "Kayıt olma", "Ödeme"];
  const active =
    phase === "questions" || phase === "unsuitable" || phase === "pricing"
      ? 0
      : phase === "payment"
      ? 2
      : phase === "consent"
      ? 2
      : 1;
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center" style={{ minWidth: 0, flex: '0 0 auto' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  border: i === active
                    ? '1px solid #ebac00'
                    : i < active
                    ? '1px solid #2e2e2e'
                    : '0.5px solid #1e1e1e',
                  background: i === active ? '#ebac00' : '#0a0a0a',
                  color: i === active ? '#000' : i < active ? '#ebac00' : '#333',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {i < active ? '✓' : i + 1}
              </div>
              <span style={{
                marginTop: 6,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: i === active ? '#ebac00' : i < active ? '#555' : '#2a2a2a',
                fontFamily: '"IBM Plex Sans", sans-serif',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '0.5px',
                background: i < active ? '#2e2e2e' : '#1e1e1e',
                marginBottom: 18,
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        ))}
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
  const [registeredToken, setRegisteredToken] = useState(null);

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
    const data = await apiRegister(payload, { supabaseAccessToken: sbAccessToken || undefined });
    if (data?.access_token) setRegisteredToken(data.access_token);
    return data;
  };

  const handleAIConsent = async (consent) => {
    try {
      const base = String(getApiBase()).replace(/\/+$/, "");
      const headers = { "Content-Type": "application/json" };
      if (registeredToken) headers.Authorization = `Bearer ${registeredToken}`;
      await fetch(`${base}/api/auth/ai-consent`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ consent }),
      });
    } catch {
      /* consent save failure is non-blocking */
    }
    setPhase("payment");
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
          setPhase("consent");
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
      setPhase("consent");
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
      setPhase("consent");
    } catch (e) {
      const msg = e?.message || "Doğrulama başarısız.";
      setSubmitError(msg);
      emitToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const goToCheckout = async (plan) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const loginData = await apiLogin(email.trim(), password, { firstName, lastName });
      const token = loginData?.access_token;
      if (!token) throw new Error("Giriş yapılamadı, lütfen tekrar deneyin.");
      const apiBase = String(getApiBase()).replace(/\/+$/, "");
      const res = await fetch(`${apiBase}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ödeme başlatılamadı.");
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      const msg = e?.message || "Ödeme başlatılamadı.";
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
        <span style={{
          display: 'inline-block',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#333',
          fontFamily: '"IBM Plex Sans", sans-serif',
          marginBottom: 12,
        }}>
          Miron AI kayıt
        </span>
        <h1 style={{ fontFamily: '"Abril Fatface", serif', fontSize: 32, lineHeight: 1.1, color: '#fff', fontWeight: 400, letterSpacing: '-0.5px', margin: '8px 0 10px' }}>
          Uygunluk ve hesap
        </h1>
        <p style={{ fontSize: 13, color: '#555', fontFamily: '"IBM Plex Sans", sans-serif', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
          Birkaç soru, paket seçimi ve güvenli kayıt — deneme veya demo adımı yoktur.
        </p>
      </motion.div>

      <StepBar phase={phase} />

      <AnimatePresence mode="wait">
        {phase === "questions" && (
          <motion.div key="questions" className="w-full max-w-lg" {...panelMotion}>
            {/* Subtle background glow that shifts with each question */}
            <motion.div
              animate={{ opacity: [0.04, 0.07, 0.04] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: 'absolute',
                top: -80,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ebac00 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div style={{
              position: 'relative',
              background: '#0a0a0a',
              border: '0.5px solid #1e1e1e',
              borderRadius: 14,
              padding: '36px 36px 28px',
              overflow: 'hidden',
              zIndex: 1,
            }}>
              <div className="dash-hero-line" />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px', color: '#ebac00', fontFamily: '"IBM Plex Sans", sans-serif', fontWeight: 600 }}>
                  Uygunluk testi
                </span>
                <motion.span
                  key={qIndex}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: 10, color: '#333', fontFamily: '"IBM Plex Sans", sans-serif', letterSpacing: '1px', fontVariantNumeric: 'tabular-nums' }}
                >
                  {qIndex + 1} / {QUESTIONS.length}
                </motion.span>
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 32 }}>
                {QUESTIONS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === qIndex ? 22 : 5,
                      background: i < qIndex ? '#2a2a2a' : i === qIndex ? '#ebac00' : '#181818',
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: 3, borderRadius: 99, flexShrink: 0 }}
                  />
                ))}
              </div>

              {/* Question content — animates per qIndex */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={qIndex}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ fontFamily: '"Abril Fatface", serif', fontSize: 28, lineHeight: 1.1, color: '#fff', fontWeight: 400, marginBottom: 12, letterSpacing: '-0.3px' }}
                  >
                    {QUESTIONS[qIndex].title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ fontSize: 14, color: '#777', lineHeight: 1.75, marginBottom: 36, fontFamily: '"IBM Plex Sans", sans-serif' }}
                  >
                    {QUESTIONS[qIndex].text}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => answerQuestion(false)}
                      whileHover={{ scale: 1.025, borderColor: '#2e2e2e', background: '#111' }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        padding: '13px 18px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: '0.5px solid #1e1e1e',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: '"IBM Plex Sans", sans-serif',
                        cursor: 'pointer',
                      }}
                    >
                      Hayır
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => answerQuestion(true)}
                      whileHover={{ scale: 1.025, opacity: 0.9 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        padding: '13px 18px',
                        borderRadius: 8,
                        background: 'linear-gradient(90deg, #ebac00, #b88700)',
                        border: 'none',
                        color: '#000',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: '"IBM Plex Sans", sans-serif',
                        cursor: 'pointer',
                      }}
                    >
                      Evet
                    </motion.button>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                style={{ fontSize: 10, color: '#222', marginTop: 22, textAlign: 'center', fontFamily: '"IBM Plex Sans", sans-serif', lineHeight: 1.6 }}
              >
                "Hayır" derseniz Miron AI şu an için profilinize uygun görünmeyebilir.
              </motion.p>
            </div>
          </motion.div>
        )}

        {phase === "unsuitable" && (
          <motion.div key="unsuitable" className="w-full max-w-lg" {...panelMotion}>
            <div style={{
              background: '#0a0a0a',
              border: '0.5px solid #3a1010',
              borderRadius: 14,
              padding: '36px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: '#5a1818', fontFamily: '"IBM Plex Sans", sans-serif', marginBottom: 16 }}>
                Uygunluk sonucu
              </div>
              <h2 style={{ fontFamily: '"Abril Fatface", serif', fontSize: 24, color: '#fff', fontWeight: 400, marginBottom: 12, lineHeight: 1.1 }}>
                Miron AI için uygun değilsiniz
              </h2>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75, marginBottom: 28, fontFamily: '"IBM Plex Sans", sans-serif' }}>
                Yanıtlarınıza göre platform şu aşamada ihtiyaçlarınızla örtüşmüyor. İleride tekrar değerlendirmek isterseniz sorulara yeniden başlayabilirsiniz.
              </p>
              <button
                type="button"
                onClick={restartQuestions}
                style={{
                  width: '100%',
                  padding: '11px 18px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '0.5px solid #1e1e1e',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                Sorulara dön
              </button>
              <Link to="/" style={{ fontSize: 11, color: '#333', fontFamily: '"IBM Plex Sans", sans-serif', textDecoration: 'none', display: 'block' }}>
                Ana sayfa →
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

        {phase === "consent" && (
          <motion.div key="consent" className="w-full max-w-lg" {...panelMotion}>
            <div style={{ background: '#0a0a0a', border: '0.5px solid #1e1e1e', borderRadius: 14, padding: '40px 36px 32px', overflow: 'hidden' }}>
              <div className="dash-hero-line" />
              <div style={{ marginBottom: 8, fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a5a5a' }}>
                Son adım
              </div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ fontFamily: '"Abril Fatface", serif', fontSize: 26, color: '#f5f5f5', marginBottom: 12, lineHeight: 1.2 }}
              >
                Yapay Zekayı İyileştirmeye Yardım Et
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#8a8a8a', lineHeight: 1.65, marginBottom: 28 }}
              >
                Yüklediğiniz belgeler, tüm <strong style={{ color: '#b0b0b0' }}>kişisel bilgiler ve müvekkil verileri kaldırıldıktan sonra</strong> anonim olarak kullanılsın mı? Bu veriler yalnızca Miron AI'ı daha iyi hale getirmek için kullanılır; hiçbir zaman satılmaz veya üçüncü taraflarla paylaşılmaz. Bu tercihi istediğiniz zaman Ayarlar sayfasından değiştirebilirsiniz.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAIConsent(true)}
                  style={{ background: 'linear-gradient(90deg, #ebac00, #b88700)', border: 'none', borderRadius: 8, padding: '14px 24px', fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, fontWeight: 600, color: '#0a0a0a', cursor: 'pointer', letterSpacing: '0.01em' }}
                >
                  Evet, anonim verilerimi paylaşabilirim
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAIConsent(false)}
                  style={{ background: 'transparent', border: '0.5px solid #2a2a2a', borderRadius: 8, padding: '14px 24px', fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, fontWeight: 500, color: '#6a6a6a', cursor: 'pointer' }}
                >
                  Hayır, verilerimi paylaşmak istemiyorum
                </motion.button>
              </motion.div>
              <p style={{ marginTop: 20, fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 11, color: '#3a3a3a', textAlign: 'center', lineHeight: 1.5 }}>
                Her iki seçenek de ödemeye devam ettirir. Onay zorunlu degil.
              </p>
            </div>
          </motion.div>
        )}

        {phase === "payment" && (
          <motion.div key="payment" className="w-full max-w-md" {...panelMotion}>
        <div className="glass p-8 rounded-2xl border border-emerald-500/20 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">✓</div>
            <h2 className="text-xl font-bold text-white mb-1">Hesabınız oluşturuldu</h2>
            <p className="text-sm text-subtle">
              Plan seçerek ödemeyi tamamlayın. Ödeme onaylandıktan sonra hesabınız aktif hale gelir.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => goToCheckout("monthly")}
              className="w-full py-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/5 transition disabled:opacity-50"
            >
              {submitting ? "Yönlendiriliyor..." : (
                <>
                  <div className="text-sm font-bold">Aylık Plan</div>
                  <div className="text-xs text-white/50 font-normal mt-0.5">
                    {publicPrices ? `${Number(publicPrices.base_price).toLocaleString("tr-TR")} TL/ay` : "—"}
                  </div>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => goToCheckout("yearly")}
              className="w-full py-4 rounded-xl bg-[var(--miron-gold)] text-black font-black hover:brightness-110 transition disabled:opacity-50"
            >
              {submitting ? "Yönlendiriliyor..." : (
                <>
                  <div className="text-sm font-bold">Yıllık Plan — En Avantajlı</div>
                  <div className="text-xs text-black/60 font-normal mt-0.5">
                    {publicPrices ? `${Number(publicPrices.yearly_price).toLocaleString("tr-TR")} TL/yıl` : "—"}
                  </div>
                </>
              )}
            </button>
          </div>

          {submitError && (
            <div className="mt-4 p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-sm text-red-200 text-center">{submitError}</div>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs text-white/30 hover:text-white/60 underline transition">
              Ödemeyi daha sonra yapmak istiyorum → Giriş
            </Link>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
