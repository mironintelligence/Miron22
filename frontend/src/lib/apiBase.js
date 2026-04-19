/**
 * API origin for fetch/axios.
 *
 * Default (no env): same origin — production uses Vercel rewrites to the backend;
 * dev uses Vite server.proxy. This avoids cross-origin cookies/CORS.
 *
 * Set VITE_API_BASE_URL or VITE_API_URL to override (e.g. local http://127.0.0.1:8000).
 */
export function getApiBase() {
  const raw = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "";
}
