const API = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export async function login(email, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.detail || "Login failed");
  }
  return r.json();
}

export async function register({ email, password, firstName, lastName, mode }) {
  const r = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      mode,
    }),
    credentials: "include",
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.detail || "Register failed");
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
    throw new Error(t.detail || "Refresh failed");
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
    throw new Error(t.detail || "Logout failed");
  }
  return r.json();
}

export async function authFetch(path, options = {}) {
  const token = localStorage.getItem("miron_token") || "";
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}
