/** Time-of-day Turkish greeting (local clock). */
export function trGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 15) return "Tünaydın";
  if (h < 18) return "İyi günler";
  if (h < 22) return "İyi akşamlar";
  return "İyi geceler";
}

/** e.g. "Av. Ad Soyad" or "Av. kullanici" from e-posta. */
export function lawyerDisplayName(user) {
  if (!user) return "Avukat";
  const f = String(user.firstName || user.first_name || "").trim();
  const l = String(user.lastName || user.last_name || "").trim();
  if (f && l) return `Av. ${f} ${l}`;
  if (f) return `Av. ${f}`;
  if (l) return `Av. ${l}`;
  const local = user.email ? String(user.email).split("@")[0] : "";
  if (local) return `Av. ${local}`;
  return "Avukat";
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketFor(createdAt) {
  if (createdAt == null) return "Daha Eski";
  const t = new Date(createdAt).getTime();
  const now = new Date();
  const today = startOfLocalDay(now);
  const y = new Date(t);
  if (y >= today) return "Bugün";
  const yd = new Date(today);
  yd.setDate(yd.getDate() - 1);
  if (y >= yd) return "Dün";
  const wk = new Date(today);
  wk.setDate(wk.getDate() - 6);
  if (y >= wk) return "Bu Hafta";
  return "Daha Eski";
}

const ORDER = ["Bugün", "Dün", "Bu Hafta", "Daha Eski"];

/** Group chat list for sidebar. */
export function groupChatsForSidebar(chats) {
  const groups = { Bugün: [], Dün: [], "Bu Hafta": [], "Daha Eski": [] };
  for (const c of chats) {
    const created = c.createdAt != null ? Number(c.createdAt) : Number(c.id) || 0;
    const b = bucketFor(created);
    if (groups[b]) groups[b].push(c);
    else groups["Daha Eski"].push(c);
  }
  return ORDER.map((k) => (groups[k]?.length ? { key: k, items: groups[k] } : null)).filter(Boolean);
}
