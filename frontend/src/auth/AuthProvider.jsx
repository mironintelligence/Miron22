import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  refresh as apiRefresh,
  logout as apiLogout,
  me as apiMe,
  registerAccessTokenGetter,
  registerAccessTokenSetter,
} from "./api";
import { purgeLegacyTokenStorage } from "../utils/auth";
import { emitToast } from "../utils/toastBus";

const AuthContext = createContext(null);

function normalizeUser(meta) {
  const m = meta || {};
  const normalized = {
    id: m.id || m.user_id || null,
    email: m.email || "",
    firstName: m.first_name || m.firstName || "",
    lastName: m.last_name || m.lastName || "",
    role: m.role || "user",
    subscriptionPlan: m.subscription_plan || m.subscriptionPlan || null,
    subscriptionStatus: m.subscription_status || m.subscriptionStatus || null,
    demoExpiresAt: m.demo_expires_at || m.demoExpiresAt || null,
    paymentCardOnFile: !!m.payment_card_on_file,
    trialEndsAt: m.trial_ends_at || m.trialEndsAt || null,
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
  };
  normalized.isDemo =
    normalized.subscriptionStatus === "demo" ||
    normalized.subscriptionPlan === "demo" ||
    !!normalized.demoExpiresAt ||
    normalized.role === "demo";
  return normalized;
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [lastLoginMeta, setLastLoginMeta] = useState(null);
  /** authFetch aynı tick içinde çalışır; getter closure'ı React render'ını bekleyemez. */
  const accessTokenRef = useRef(null);

  const setAccessToken = useCallback((t) => {
    const v = t ? String(t) : null;
    accessTokenRef.current = v;
    setAccessTokenState(v);
  }, []);

  const setAccessTokenRef = useRef(setAccessToken);
  setAccessTokenRef.current = setAccessToken;

  useEffect(() => {
    registerAccessTokenSetter((tok) => setAccessTokenRef.current(tok || null));
  }, []);

  useEffect(() => {
    registerAccessTokenGetter(() => accessTokenRef.current);
  }, []);

  const bootstrap = useCallback(async () => {
    purgeLegacyTokenStorage();
    try {
      const ref = await apiRefresh();
      const tok = ref?.access_token || "";
      if (tok) setAccessToken(tok);
      const d = await apiMe();
      const nu = normalizeUser(d?.user);
      setUser(nu);
      setStatus("authed");
    } catch (e) {
      setAccessToken(null);
      setUser(null);
      setStatus("guest");
      if (e?.message && !String(e.message).includes("401")) {
        emitToast(String(e.message || "Oturum başlatılamadı"), "error");
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (cancelled) return;
      setStatus((s) => (s === "loading" ? "guest" : s));
      setAccessToken(null);
      setUser(null);
    }, 15000);
    bootstrap().finally(() => {
      cancelled = true;
      window.clearTimeout(safety);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [bootstrap]);

  const login = async (email, password, nameHint) => {
    const data = await apiLogin(email, password, nameHint);
    const tok = data?.access_token || "";
    if (tok) setAccessToken(tok);
    const meta = data?.user || {};
    const normalized = normalizeUser({ ...meta, permissions: meta.permissions });
    setUser(normalized);
    setStatus("authed");
    try {
      const fresh = await apiMe();
      setUser(normalizeUser(fresh?.user));
    } catch (e) {
      emitToast(e?.message || "Profil bilgisi alınamadı", "error");
    }
    const hintFirst = (nameHint && nameHint.firstName) || "";
    const hintLast = (nameHint && nameHint.lastName) || "";
    const hintFull = `${hintFirst} ${hintLast}`.trim();
    setLastLoginMeta({
      at: Date.now(),
      name:
        hintFull ||
        `${normalized.firstName || ""} ${normalized.lastName || ""}`.trim() ||
        normalized.email ||
        email,
    });
    return normalized;
  };

  const register = async (payload) => {
    return apiRegister(payload);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      emitToast(e?.message || "Çıkış isteği tamamlanamadı", "error");
    }
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
    setLastLoginMeta(null);
    purgeLegacyTokenStorage();
  };

  const refreshUser = async () => {
    try {
      const d = await apiMe();
      setUser(normalizeUser(d?.user));
    } catch (e) {
      emitToast(e?.message || "Profil yenilenemedi", "error");
    }
  };

  const consumeLastLoginMeta = () => {
    if (!lastLoginMeta) return null;
    const meta = lastLoginMeta;
    setLastLoginMeta(null);
    return meta;
  };

  const value = useMemo(
    () => ({
      status,
      user,
      token: accessToken,
      login,
      logout,
      register,
      refreshUser,
      lastLoginMeta,
      consumeLastLoginMeta,
    }),
    [status, user, accessToken, lastLoginMeta]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
