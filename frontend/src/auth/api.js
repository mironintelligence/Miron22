const API = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

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

/** Bellekte tutulan access token getter (HttpOnly çerez yoksa Bearer yedek). */
let _getAccessToken = () => null;

export function registerAccessTokenGetter(fn) {
  _getAccessToken = typeof fn === "function" ? fn : () => null;
}

export async function login(email, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Giriş başarısız");
  }
  return r.json();
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
  const r = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(detailMessage(t) || "Oturum yenilenemedi");
  }
  return r.json();
}

export async function logout() {
  const r = await fetch(`${API}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
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
  const token = (_getAccessToken && _getAccessToken()) || "";
  const method = String(options.method || "GET").toUpperCase();
  const unsafe = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const csrf =
    typeof document !== "undefined"
      ? String(document.cookie || "")
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("csrf_token="))
      : null;
  const csrfToken = csrf ? decodeURIComponent(csrf.split("=", 2)[1] || "") : "";
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(unsafe && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
  };
  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}
