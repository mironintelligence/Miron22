import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { emitToast } from "../utils/toastBus";
import { passwordMeetsPolicy } from "../utils/passwordPolicy";

export default function Kaydol() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const initialMode = searchParams.get("mode") === "demo" ? "demo" : "single";
  const [mode, setMode] = useState(initialMode);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discountCode, setDiscountCode] = useState("");

  const [consentSaas, setConsentSaas] = useState(false);
  const [consentMss, setConsentMss] = useState(false);
  const [consentPreinfo, setConsentPreinfo] = useState(false);
  const [consentKvkk, setConsentKvkk] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isValidEmail = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    return /\S+@\S+\.\S+/.test(v);
  };

  const valid = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      isValidEmail(email) &&
      passwordMeetsPolicy(password)
    );
  }, [firstName, lastName, email, password]);

  const acceptedAll = consentSaas && consentMss && consentPreinfo && consentKvkk;
  const disabled = !valid || !acceptedAll;

  const handleSubmit = async () => {
    if (submitting || disabled) return;
    setSubmitError("");
    setSubmitting(true);
    const consents = { saas: true, mss: true, preinfo: true, kvkk: true };
    const normalizedDiscount = (discountCode || "").trim().toUpperCase();
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mode: mode === "demo" ? "demo" : "single",
        discountCode: normalizedDiscount || undefined,
        consents,
        card: null,
      });
      emitToast("Kayıt başarılı. Giriş yapabilirsiniz.", "success");
      navigate("/login");
    } catch (e) {
      const msg = e?.message || "Kayıt başarısız.";
      setSubmitError(msg);
      emitToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 md:px-16 pb-16 flex flex-col items-center">
      <div className="w-full max-w-lg glass p-8 sm:p-10 rounded-2xl mt-4">
        <h1 className="text-4xl sm:text-5xl font-black text-white text-center mb-2 tracking-tight">Kaydol</h1>
        <p className="text-center text-sm text-subtle mb-8">Miron AI hesabı oluşturun. Deneme için kart gerekmez.</p>

        <div className="space-y-4 mb-6">
          <div className="text-sm font-medium text-white/80">Kayıt tipi</div>
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === "single"} onChange={() => setMode("single")} />
            <span>Şahıs</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === "demo"} onChange={() => setMode("demo")} />
            <span>Onaylı demo</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm mb-1 text-subtle">
              Ad <span className="text-red-400">*</span>
            </div>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
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
            />
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm mb-1 text-subtle">
              E-posta <span className="text-red-400">*</span>
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
              placeholder="ornek@domain.com"
            />
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
            />
            <div className="text-[12px] mt-1 text-subtle">Güçlü şifre politikası geçerlidir (uzunluk, büyük/küçük harf, rakam, özel karakter).</div>
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
            <input type="checkbox" checked={consentSaas} onChange={(e) => setConsentSaas(e.target.checked)} />
            <span>
              <Link to="/user-agreement" className="text-accent underline">
                Hizmet sözleşmesi
              </Link>{" "}
              metnini okudum ve kabul ediyorum.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={consentMss} onChange={(e) => setConsentMss(e.target.checked)} />
            <span>
              <Link to="/terms" className="text-accent underline">
                Mesafeli satış
              </Link>{" "}
              hükümlerini okudum ve kabul ediyorum.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={consentPreinfo} onChange={(e) => setConsentPreinfo(e.target.checked)} />
            <span>
              <Link to="/terms" className="text-accent underline">
                Ön bilgilendirme
              </Link>{" "}
              formunu okudum ve kabul ediyorum.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={consentKvkk} onChange={(e) => setConsentKvkk(e.target.checked)} />
            <span>
              <Link to="/privacy" className="text-accent underline">
                KVKK / Gizlilik
              </Link>{" "}
              kapsamında kişisel verilerimin işlenmesine rıza veriyorum.
            </span>
          </label>
        </div>

        {submitError && (
          <div className="mt-4 p-3 rounded-xl border border-red-400/30 bg-red-500/10 text-sm text-red-200">{submitError}</div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || submitting}
          className="mt-8 w-full py-4 rounded-2xl bg-white text-black text-lg font-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Kaydediliyor…" : "Kaydol"}
        </button>

        <p className="mt-6 text-center text-xs text-subtle">
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="text-accent underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
