/**
 * API origin for fetch/axios.
 *
 * Production: same origin ("") so requests hit the Vercel host and `vercel.json`
 * rewrites forward to Render — no browser CORS. Vercel projects often still set
 * `VITE_API_URL` to the Render URL for historical reasons; using it in PROD
 * breaks credentialed cookies, so we ignore `VITE_API_URL` when `import.meta.env.PROD`.
 *
 * Override production explicitly with `VITE_API_BASE_URL` (e.g. staging API).
 *
 * Development: `VITE_API_URL` or "" (Vite `server.proxy` to Render/local).
 */
export function getApiBase() {
  const explicit = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  if (import.meta.env.PROD) {
    return "";
  }

  const dev = String(import.meta.env.VITE_API_URL || "").trim();
  if (dev) return dev.replace(/\/+$/, "");
  return "";
}
