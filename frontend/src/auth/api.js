const API = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";

export async function login(email, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
  });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.detail || "Register failed");
  }
  return r.json();
}
