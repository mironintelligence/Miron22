import axios from "axios";
import { getApiBase } from "../lib/apiBase.js";

const API = getApiBase();

const REFRESH_STORAGE_KEY = "miron_refresh_token";

function readStoredRefresh() {
  try {
    return sessionStorage.getItem(REFRESH_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredRefresh(tok) {
  try {
    if (tok) sessionStorage.setItem(REFRESH_STORAGE_KEY, tok);
    else sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function detailMessage(t) {
  const d = t?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === "string" ? x : x?.msg || x?.message || JSON.stringify(x)))
      .filter(Boolean)
      .join("; ");
  }
  if (d && typeof d === "object") return d.message || JSON.stringify(d);
  return "İstek başarısız";
}

/** Bellekte tutulan access token getter (Authorization Bearer). */
let _getAccessToken = () => null;

/** Access token yenilendiğinde React state güncellemesi (401 sonrası retry için). */
let _setAccessToken = () => {};

export function registerAccessTokenGetter(fn) {
  _getAccessToken = typeof fn === "function" ? fn : () => null;
}

export function registerAccessTokenSetter(fn) {
  _setAccessToken = typeof fn === "function" ? fn : () => {};
}

export function readCsrfToken() {
  if (typeof document === "undefined") return "";
  const csrf = String(document.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrf_token="));
  return csrf ? decodeURIComponent(csrf.split("=", 2)[1] || "") : "";
}

function authHeaders(method, extra = {}) {
  const token = (_getAccessToken && _getAccessToken()) || "";
  const m = String(method || "GET").toUpperCase();
  const unsafe = m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
  const csrfToken = readCsrfToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(unsafe && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
  };
}

let _refreshChain = null;

/** Kimlik doğrulamalı API istekleri için varsayılan üst süre (AbortController). */
const AUTH_FETCH_TIMEOUT_MS = 25000;

/** İlk çağrıda tarayıcıda csrf_token yoksa GET ile çerezi al (CSRF middleware). */
async function ensureCsrfCookie() {
  if (typeof document === "undefined") return;
  if (readCsrfToken()) return;
  try {
    await fetchWithTimeout(`${API}/api/health`, { method: "GET", credentials: "include" });
  } catch {
    /* ignore */
  }
}

function csrfPostHeaders() {
  const h = { "Content-Type": "application/json" };
  const csrf = readCsrfToken();
  if (csrf) h["X-CSRF-Token"] = csrf;
  return h;
}


/** Supabase oturumu varsa token döndür; süresi dolmak üzereyse GoTrue refresh. */
async function trySupabaseRefresh() {
  try {
    const { supabase } = await import("../lib/supabaseClient.js");
    if (!supabase) return null;
    const { data: wrap, error: gerr } = await supabase.auth.getSession();
    if (gerr || !wrap?.session?.access_token) return null;
    const s = wrap.session;
    const expAt = typeof s.expires_at === "number" ? s.expires_at : 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const needsRotate = !expAt || expAt < nowSec + 120;
    if (needsRotate) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session?.access_token) return null;
      const tok = data.session.access_token;
      if (tok) _setAccessToken(tok);
      return { access_token: tok, refresh_token: data.session.refresh_token || "" };
    }
    if (s.access_token) _setAccessToken(s.access_token);
    return { access_token: s.access_token, refresh_token: s.refresh_token || "" };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const outer = options.signal;
  if (outer) {
    return fetch(url, options);
  }
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ac.signal });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Sunucuya ulaşılamadı (zaman aşımı).");
    }
    throw e;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * HttpOnly refresh çerezi ile yeni access token alır; bellekteki token'ı günceller.
 */
export async function refreshSession() {
  if (!_refreshChain) {
    _refreshChain = (async () => {
      const fromSb = await trySupabaseRefresh();
      if (fromSb?.access_token) {
        return fromSb;
      }
      const stored = readStoredRefresh();
      await ensureCsrfCookie();
      const controller = new AbortController();
      const timeoutMs = 25000;
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      let r;
      try {
        const hdrs = csrfPostHeaders();
        if (!stored) {
          delete hdrs["Content-Type"];
        }
        r = await fetch(`${API}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: hdrs,
          body: stored ? JSON.stringify({ refresh_token: stored }) : undefined,
          signal: controller.signal,
        });
      } catch (e) {
        if (e?.name === "AbortError") {
          throw new Error("Oturum sunucusuna ulaşılamadı (zaman aşımı).");
        }
        throw e;
      } finally {
        clearTimeout(tid);
      }
      if (!r.ok) {
        const t = await r.json().catch(() => ({}));
        const msg = detailMessage(t) || "Oturum yenilenemedi";
        const err = new Error(msg);
        if (msg === "DEMO_EXPIRED") err.code = "DEMO_EXPIRED";
        throw err;
      }
      const j = await r.json();
      const tok = j?.access_token || "";
      if (tok) _setAccessToken(tok);
      const rt = j?.refresh_token || "";
      if (rt) writeStoredRefresh(rt);
      return j;
    })().finally(() => {
      _refreshChain = null;
    });
  }
  return _refreshChain;
}

function shouldSkip401Retry(path) {
  const p = String(path || "");
  return (
    p.includes("/api/auth/refresh") ||
    p.includes("/api/auth/login") ||
    p.includes("/api/auth/logout")
  );
}

export async function login(email, password, nameHint = null) {
  const body = { email, password };
  if (nameHint && (nameHint.firstName || nameHint.lastName)) {
    body.firstName = String(nameHint.firstName || "").trim();
    body.lastName = String(nameHint.lastName || "").trim();
  }
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    const msg = detailMessage(t) || "Giriş başarısız";
    const err = new Error(msg);
    if (msg === "DEMO_EXPIRED") err.code = "DEMO_EXPIRED";
    throw err;
  }
  const data = await r.json();
  const tok = data?.access_token || "";
  if (tok) _setAccessToken(tok);
  const rt = data?.refresh_token || "";
  if (rt) writeStoredRefresh(rt);
  return data;
}

export async function register({ email, password, firstName, lastName, mode, discountCode, consents, card }) {
  const r = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      mode,
      discountCode: discountCode || null,
      consents: consents || null,
      card: card || null,
    }),
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Kayıt başarısız");
  }
  return r.json();
}

export async function refresh() {
  return refreshSession();
}

export async function logout() {
  await ensureCsrfCookie();
  const r = await fetch(`${API}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: csrfPostHeaders(),
  });
  writeStoredRefresh("");
  try {
    const { supabase } = await import("../lib/supabaseClient.js");
    if (supabase) await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Çıkış başarısız");
  }
  return r.json();
}

export async function attachPayment(card) {
  const r = await authFetch("/api/auth/attach-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card }),
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Ödeme kaydı başarısız");
  }
  return r.json();
}

export async function me() {
  const r = await authFetch("/api/auth/me", { method: "GET" });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Profil alınamadı");
  }
  return r.json();
}

export async function authFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const { timeoutMs: optTimeout, ...restOpts } = options;
  const headers = authHeaders(method, restOpts.headers || {});
  const url = `${API}${path}`;

  const pollGet =
    method === "GET" &&
    (/\/api\/notifications\/?$/.test(String(path)) || String(path).includes("/api/notifications/unread-count"));

  const timeoutMs =
    typeof optTimeout === "number" ? optTimeout : pollGet ? 55000 : AUTH_FETCH_TIMEOUT_MS;

  const exec = (hdrs) =>
    fetchWithTimeout(
      url,
      { ...restOpts, headers: hdrs, credentials: "include" },
      timeoutMs
    );

  try {
    let res = await exec(headers);
    if (res.status === 401 && !shouldSkip401Retry(path)) {
      let refreshFailed = false;
      try {
        await refreshSession();
        const retryHeaders = authHeaders(method, restOpts.headers || {});
        res = await exec(retryHeaders);
      } catch {
        refreshFailed = true;
      }
      if (refreshFailed || res.status === 401) {
        try {
          writeStoredRefresh("");
        } catch {
          /* ignore */
        }
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(
              new CustomEvent("miron:session-expired", {
                detail: { path, status: res.status },
              })
            );
          } catch {
            /* ignore */
          }
        }
      }
    }
    return res;
  } catch (_e) {
    if (!pollGet) throw _e;
    if (String(path).includes("unread-count")) {
      return new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const apiAxios = axios.create({
  baseURL: API,
  withCredentials: true,
});

apiAxios.interceptors.request.use((config) => {
  const method = String(config.method || "get").toUpperCase();
  const base = config.headers || {};
  const merged = authHeaders(method, { ...base });
  Object.assign(config.headers, merged);
  return config;
});

apiAxios.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    const status = error.response?.status;
    if (status !== 401 || !orig || orig._retry) {
      return Promise.reject(error);
    }
    const reqUrl = String(orig.url || "");
    if (reqUrl.includes("/api/auth/refresh") || reqUrl.includes("/api/auth/login")) {
      return Promise.reject(error);
    }
    orig._retry = true;
    try {
      await refreshSession();
      const method = String(orig.method || "get").toUpperCase();
      Object.assign(orig.headers, authHeaders(method, {}));
      return apiAxios(orig);
    } catch {
      return Promise.reject(error);
    }
  }
);
