/** Luhn (mod 10) — kart numarası doğrulama (istemci tarafı ön kontrol). */
export function luhnCheck(pan) {
  const digits = String(pan || "")
    .replace(/\D/g, "")
    .split("")
    .map((c) => parseInt(c, 10));
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
