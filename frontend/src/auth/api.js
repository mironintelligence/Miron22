const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function authMe() {
  const r = await fetch(`${API}/auth/me`, { credentials: "include" });
  if (!r.ok) return { authed: false };
  return r.json();
}

export async function login(email, password) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.detail || "Login failed");
  }
  return r.json();
}

export async function logout() {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
}