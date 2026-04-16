import axios from "axios";

function resolveApiBase() {
  const raw = String(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://miron22.onrender.com"
  ).trim();
  if (!raw) return "https://miron22.onrender.com";
  return raw.replace(/\/+$/, "");
}

const API = resolveApiBase();

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

function readCsrfToken() {
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
      const stored = readStoredRefresh();
      const controller = new AbortController();
      const timeoutMs = 12000;
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      let r;
      try {
        r = await fetch(`${API}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: stored ? { "Content-Type": "application/json" } : {},
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
        throw new Error(detailMessage(t) || "Oturum yenilenemedi");
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
    throw new Error(detailMessage(t) || "Giriş başarısız");
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
  const r = await fetch(`${API}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  writeStoredRefresh("");
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
  const headers = authHeaders(method, options.headers || {});
  const url = `${API}${path}`;

  const exec = (hdrs) =>
    fetchWithTimeout(url, {
      ...options,
      headers: hdrs,
      credentials: "include",
    });

  let res = await exec(headers);
  if (res.status === 401 && !shouldSkip401Retry(path)) {
    try {
      await refreshSession();
      const retryHeaders = authHeaders(method, options.headers || {});
      res = await exec(retryHeaders);
    } catch {
      /* orijinal 401 */
    }
  }
  return res;
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
