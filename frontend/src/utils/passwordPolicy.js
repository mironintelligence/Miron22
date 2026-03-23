/** Backend `auth_router.RegisterRequest` ile uyumlu şifre politikası (frontend ön kontrol). */
export function passwordMeetsPolicy(p) {
  const s = String(p || "");
  if (s.length < 12 || s.length > 128) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[a-z]/.test(s)) return false;
  if (!/\d/.test(s)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(s)) return false;
  return true;
}
