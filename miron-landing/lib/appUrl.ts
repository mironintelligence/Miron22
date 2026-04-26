/**
 * Ana Miron uygulaması (Vite) kökü — Kaydol / Giriş linkleri için.
 * Örn: Vercel'de NEXT_PUBLIC_APP_ORIGIN=https://app.example.com
 */
export function appOrigin(): string {
  if (typeof process === 'undefined') return ''
  return String(process.env.NEXT_PUBLIC_APP_ORIGIN || '').replace(/\/$/, '')
}

export function appUrl(path: string): string {
  const base = appOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
