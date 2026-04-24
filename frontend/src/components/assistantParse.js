/**
 * Splits assistant message text into prose + fenced code segments for display.
 */
export function parseAssistantMessage(text) {
  const s = String(text || "");
  if (!s) return [{ type: "text", v: "" }];
  const re = /```([^\n`]*)\n?([\s\S]*?)```/g;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ type: "text", v: s.slice(last, m.index) });
    out.push({ type: "code", lang: (m[1] || "code").trim() || "code", v: m[2] || "" });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: "text", v: s.slice(last) });
  return out.length ? out : [{ type: "text", v: s }];
}

export function firstNameOf(user) {
  const full =
    (user && (user.firstName || user.first_name)) ||
    (user && user.email ? user.email.split("@")[0] : "") ||
    "";
  return String(full).trim().split(/\s+/)[0] || "";
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function timeBucket(createdAt) {
  if (!createdAt) return "Daha Eski";
  const t = new Date(createdAt).getTime();
  const now = new Date();
  const today = startOfLocalDay(now);
  const y = new Date(t);
  if (y >= today) return "Bugün";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (y >= yesterday) return "Dün";
  const wk = new Date(today);
  wk.setDate(wk.getDate() - 6);
  if (y >= wk) return "Bu Hafta";
  return "Daha Eski";
}

const ORDER = ["Bugün", "Dün", "Bu Hafta", "Daha Eski"];

export function groupChatsByBucket(chats) {
  const groups = { Bugün: [], Dün: [], "Bu Hafta": [], "Daha Eski": [] };
  for (const c of chats) {
    const created = c.createdAt != null ? Number(c.createdAt) : Number(c.id) || 0;
    const b = timeBucket(created);
    if (groups[b]) groups[b].push(c);
    else groups["Daha Eski"].push(c);
  }
  return ORDER.map((k) => (groups[k] && groups[k].length ? { key: k, items: groups[k] } : null)).filter(Boolean);
}
