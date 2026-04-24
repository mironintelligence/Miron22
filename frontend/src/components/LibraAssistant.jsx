import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUp,
  Copy,
  FileText,
  Menu,
  Paperclip,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  X,
} from "lucide-react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { parseAssistantMessage, firstNameOf, groupChatsByBucket } from "./assistantParse.js";

const C = {
  border: "#1e1e1e",
  borderH: "#2e2e2e",
  accent: "#FFD700",
  muted: "#3a3a3a",
};

const SUGGEST = [
  {
    title: "İş akdi feshi emsal ara",
    desc: "Yargıtay kararlarından güncel emsal bul",
    text: "İş akdi feshi hakkında güncel Yargıtay emsal kararlarını özetle ve farklı senaryolara ayır.",
  },
  {
    title: "Bu sözleşmedeki riskleri",
    desc: "analiz et ve önerileri sun",
    text: "Bir sözleşme metninde tespit edilebilecek hukuki ve ticari riskleri maddeler halinde analiz et ve çözüm önerileri sun. Varsayımlarını açıkça belirt.",
  },
  {
    title: "Alacak davası için",
    desc: "dilekçe taslağı oluştur",
    text: "Alacak davası için usul ve kanuna uygun, özet açıklamalı bir dilekçe taslağı hazırla. Varsayımlarını açıkça belirt.",
  },
  {
    title: "Kazanma ihtimalimi",
    desc: "hesapla ve strateji öner",
    text: "Verilecek dava açıklamasına göre kazanma ihtimalini faktörlere göre yorumla ve strateji öner. Kanıt ve dosya eksikliği sınırlarını vurgula.",
  },
];

function trDate() {
  return new Date().toLocaleDateString("tr-TR");
}

function initials(user) {
  const t = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "M";
  const parts = String(t).trim().split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return t.slice(0, 1).toUpperCase();
}

export default function LibraAssistant({ caseText: caseTextProp = "" }) {
  const location = useLocation();
  const { user } = useAuth();

  const fromState = location.state && typeof location.state === "object" && location.state.caseText;
  const mergedCase = [caseTextProp, fromState].filter(Boolean).join("\n\n").trim();

  const userScope = user?.id ? String(user.id) : "anon";
  const LS_CHATS = `libraChats::${userScope}`;
  const LS_CURRENT = `libraCurrentChatId::${userScope}`;

  const [chats, setChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CHATS) || "[]");
    } catch {
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    const s = localStorage.getItem(LS_CURRENT);
    return s ? Number(s) : null;
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [fileTray, setFileTray] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [rnOpen, setRnOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [headMenu, setHeadMenu] = useState(false);
  const [linked, setLinked] = useState(null);
  const [staged, setStaged] = useState(null);
  const [rightOff, setRightOff] = useState(false);
  const [msgHover, setMsgHover] = useState(null);
  const [narrow, setNarrow] = useState(false);

  const fileIn = useRef(null);
  const ta = useRef(null);
  const menuR = useRef(null);
  const sc = useRef(null);

  const current = useMemo(() => chats.find((c) => c.id === currentChatId) || null, [chats, currentChatId]);
  const messages = current?.messages || [];
  const empty = messages.length === 0;
  const showRight = !rightOff && !empty && !narrow && (Boolean(staged) || Boolean(linked));

  useEffect(() => {
    try {
      setChats(JSON.parse(localStorage.getItem(LS_CHATS) || "[]"));
    } catch {
      setChats([]);
    }
    setCurrentChatId(localStorage.getItem(LS_CURRENT) ? Number(localStorage.getItem(LS_CURRENT)) : null);
  }, [userScope, LS_CHATS, LS_CURRENT]);

  useEffect(() => {
    localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  }, [chats, LS_CHATS]);

  useEffect(() => {
    if (currentChatId) localStorage.setItem(LS_CURRENT, String(currentChatId));
  }, [currentChatId, LS_CURRENT]);

  useEffect(() => {
    const f = () => setNarrow(window.innerWidth < 768);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  useEffect(() => {
    if (chats.length === 0) {
      const n = { id: Date.now(), name: "Sohbet 1", date: trDate(), createdAt: Date.now(), messages: [] };
      setChats([n]);
      setCurrentChatId(n.id);
      return;
    }
    if (chats.length > 0 && !chats.some((c) => c.id === currentChatId)) {
      setCurrentChatId(chats[0].id);
    }
  }, [chats, currentChatId]);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = sc.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 40);
    return () => clearTimeout(t);
  }, [messages.length, loading, empty]);

  useEffect(() => {
    const h = (e) => {
      if (menuR.current && !menuR.current.contains(e.target)) setHeadMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ta.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const postAssistant = useCallback(
    async (payload) => {
      const paths = ["/assistant-chat", "/api/assistant-chat", "/assistant/assistant-chat"];
      let last = null;
      for (const path of paths) {
        try {
          const res = await authFetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.status === 404) continue;
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const d = data?.detail
              ? typeof data.detail === "string"
                ? data.detail
                : Array.isArray(data.detail)
                  ? data.detail.map((x) => x?.msg || x).join("; ")
                  : JSON.stringify(data.detail)
              : data?.reply
                ? String(data.reply)
                : res.status === 401
                  ? "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın."
                  : `HTTP ${res.status}`;
            throw new Error(d);
          }
          return data;
        } catch (e) {
          last = e;
        }
      }
      throw last || new Error("Bağlantı hatası");
    },
    []
  );

  const buildCtx = useCallback(() => {
    const bits = [mergedCase];
    if (linked) bits.push(`Bağlı dava: ${linked.name} / ${linked.num}`);
    if (staged) bits.push(`Yüklenen: ${staged.name} (${Math.round(staged.size / 1024)} KB)`);
    return bits.filter(Boolean).join("\n\n");
  }, [mergedCase, linked, staged]);

  const addAssistant = (text) => {
    if (!current) return;
    const b = { sender: "assistant", text, at: Date.now(), id: `a-${Date.now()}` };
    setChats((p) => p.map((c) => (c.id === current.id ? { ...c, messages: [...(c.messages || []), b] } : c)));
  };

  const send = async (raw) => {
    if (!current) return;
    const t = String(raw || "").trim();
    if (!t) return;
    const u = { sender: "user", text: t, at: Date.now(), id: `u-${Date.now()}` };
    setChats((p) => p.map((c) => (c.id === current.id ? { ...c, messages: [...(c.messages || []), u] } : c)));
    setInput("");
    setLoading(true);
    setSideOpen(false);
    try {
      const data = await postAssistant({ message: t, context: buildCtx(), chat_id: String(current.id) });
      const reply = data?.reply || "Yanıt alınamadı.";
      addAssistant(reply);
    } catch (e) {
      addAssistant(`Yanıt alınamadı: ${e?.message || "Bilinmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  };

  const reGen = async () => {
    if (!current) return;
    const cid = current.id;
    const msgs = [...(current.messages || [])];
    let a = -1;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].sender === "assistant") {
        a = i;
        break;
      }
    }
    if (a < 1) return;
    if (msgs[a - 1].sender !== "user") return;
    const uText = msgs[a - 1].text;
    setChats((p) => p.map((c) => (c.id === cid ? { ...c, messages: msgs.slice(0, a) } : c)));
    setLoading(true);
    try {
      const data = await postAssistant({ message: uText, context: buildCtx(), chat_id: String(cid) });
      const text = data?.reply || "Yanıt alınamadı.";
      const b = { sender: "assistant", text, at: Date.now(), id: `a-${Date.now()}` };
      setChats((p) => p.map((c) => (c.id === cid ? { ...c, messages: [...(c.messages || []), b] } : c)));
    } catch (e) {
      const err = { sender: "assistant", text: `Yanıt alınamadı: ${e?.message || "Bilinmeyen hata"}`, at: Date.now(), id: `e-${Date.now()}` };
      setChats((p) => p.map((c) => (c.id === cid ? { ...c, messages: [...(c.messages || []), err] } : c)));
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    const n = { id: Date.now(), name: `Sohbet ${chats.length + 1}`, date: trDate(), createdAt: Date.now(), messages: [] };
    setChats((p) => [n, ...p]);
    setCurrentChatId(n.id);
    setStaged(null);
    setLinked(null);
    setRightOff(false);
  };

  const onRename = () => {
    if (!current) return;
    setNameDraft(current.name || "");
    setRnOpen(true);
    setHeadMenu(false);
  };
  const saveRn = () => {
    if (!current) return;
    const v = nameDraft.trim();
    if (v) setChats((p) => p.map((c) => (c.id === current.id ? { ...c, name: v } : c)));
    setRnOpen(false);
  };

  const ex = () => {
    if (!current) return;
    const body = (current.messages || [])
      .map((m) => `${m.sender === "user" ? "Kullanici" : "Asistan"}: ${m.text || ""}`)
      .join("\n\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${(current.name || "sohbet").replace(/[\\/*?:"<>|]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(u);
    setHeadMenu(false);
  };

  const onDel = () => {
    if (!current) return;
    setHeadMenu(false);
    setDelOpen(true);
  };
  const doDel = () => {
    if (!current) return;
    const id = current.id;
    const rest = chats.filter((c) => c.id !== id);
    if (rest.length) {
      setChats(rest);
      setCurrentChatId(rest[0].id);
    } else {
      const n = { id: Date.now(), name: "Sohbet 1", date: trDate(), createdAt: Date.now(), messages: [] };
      setChats([n]);
      setCurrentChatId(n.id);
    }
    setDelOpen(false);
  };

  const copyT = (x) => navigator.clipboard.writeText(String(x || "")).catch(() => {});

  const shareT = (x) => {
    if (navigator.share) navigator.share({ text: x }).catch(() => copyT(x));
    else copyT(x);
  };

  const taResize = () => {
    const e = ta.current;
    if (!e) return;
    e.style.height = "0px";
    e.style.height = `${Math.min(200, Math.max(52, e.scrollHeight))}px`;
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setStaged({ name: f.name, size: f.size, file: f });
    setFileTray(false);
    setRightOff(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setStaged({ name: f.name, size: f.size, file: f });
      setFileTray(false);
      setRightOff(false);
    }
  };

  const grouped = useMemo(() => {
    return groupChatsByBucket(
      chats.map((c) => ({ ...c, createdAt: c.createdAt != null ? c.createdAt : c.id }))
    );
  }, [chats]);

  const displayName = firstNameOf(user) || "Kullanici";
  const plan = user?.plan || user?.subscription || "Profesyonel Plan";
  const iv = initials(user);

  return (
    <motion.main
      className="w-full max-w-full overflow-x-hidden"
      style={{ minHeight: "calc(100dvh - 7.5rem)", maxHeight: "calc(100dvh - 7.5rem)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {narrow && (
        <div
          className="flex justify-end border-b border-[#1e1e1e] bg-[#0a0a0a] md:hidden"
          style={{ borderWidth: 0.5, padding: "6px 12px" }}
        >
          <button
            type="button"
            className="p-1.5 border border-[#1e1e1e] bg-[#0a0a0a]"
            onClick={() => setSideOpen(true)}
            style={{ borderRadius: 6, borderWidth: 0.5 }}
            aria-label="Menu"
          >
            <Menu size={16} color={C.muted} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex w-full" style={{ height: "calc(100% - 0px)", minHeight: 0 }}>
        <AnimatePresence>
          {narrow && sideOpen && (
            <motion.button
              type="button"
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className="flex min-h-0 flex-col border-r border-[#1e1e1e] bg-[#0a0a0a]"
          style={{
            width: narrow && !sideOpen ? 0 : 260,
            minWidth: narrow && !sideOpen ? 0 : 260,
            maxWidth: narrow && !sideOpen ? 0 : 260,
            position: narrow ? "fixed" : "relative",
            zIndex: narrow && sideOpen ? 45 : 0,
            height: narrow && sideOpen ? "100dvh" : "100%",
            left: 0,
            top: 0,
            boxShadow: narrow && sideOpen ? "8px 0 24px rgba(0,0,0,0.45)" : "none",
            overflow: narrow && !sideOpen ? "hidden" : "auto",
            transform: narrow && !sideOpen ? "translateX(-102%)" : "translateX(0)",
            transition: narrow ? "transform 0.2s ease" : "none",
          }}
        >
          {narrow && sideOpen && (
            <button
              type="button"
              className="absolute right-2 top-2 z-50 p-0.5"
              onClick={() => setSideOpen(false)}
              style={{ background: "none", border: "none" }}
              aria-label="Kapat"
            >
              <X size={16} color={C.muted} strokeWidth={1.5} />
            </button>
          )}

          <div className="flex h-full min-h-0 w-[260px] flex-col" style={{ padding: 16, boxSizing: "border-box" }}>
            <div className="mb-3">
              <span
                className="inline-block"
                style={{ fontFamily: "Abril Fatface, serif", fontSize: 13, letterSpacing: "-0.01em" }}
              >
                <span className="text-white">Miron</span> <span style={{ color: C.accent }}>AI</span>
              </span>
            </div>

            <button
              type="button"
              onClick={newChat}
              className="mb-0 flex w-full items-center gap-2 border-0"
              style={{
                background: "#0a0a0a",
                border: "0.5px solid #1e1e1e",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#555",
                fontSize: 12,
                fontWeight: 400,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.borderH;
                e.currentTarget.style.color = "#888";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = "#555";
              }}
            >
              <Plus size={14} color="#333" strokeWidth={1.5} />
              Yeni Sohbet
            </button>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto" style={{ paddingRight: 2 }}>
              <div
                className="mb-2.5"
                style={{
                  fontSize: 10,
                  color: "#2a2a2a",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Geçmiş
              </div>
              {grouped.map((g, gIdx) => (
                <div key={g.key} className="mb-0">
                  <div
                    style={{ marginTop: gIdx === 0 ? 0 : 20, fontSize: 10, color: "#222", textTransform: "uppercase" }}
                  >
                    {g.key}
                  </div>
                  <ul className="m-0 list-none p-0" style={{ marginTop: 6 }}>
                    {g.items.map((c) => {
                      const on = c.id === currentChatId;
                      return (
                        <li key={c.id} className="m-0 p-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentChatId(c.id);
                              if (narrow) setSideOpen(false);
                            }}
                            className="w-full cursor-pointer text-left"
                            style={{
                              padding: "9px 12px",
                              borderRadius: 8,
                              color: on ? "#ccc" : "#444",
                              background: on ? "#0d0d0d" : "transparent",
                              border: "none",
                              borderLeft: on ? "2px solid #FFD700" : "2px solid transparent",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              if (!on) e.currentTarget.style.color = "#777";
                              if (!on) e.currentTarget.style.background = "#0d0d0d";
                            }}
                            onMouseLeave={(e) => {
                              if (!on) e.currentTarget.style.color = "#444";
                              if (!on) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {c.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "0.5px solid #1e1e1e", paddingTop: 16, marginTop: 8, flexShrink: 0 }}>
              <div className="flex items-center gap-2.5 pr-0">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9999,
                    background: C.accent,
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {iv}
                </div>
                <div className="min-w-0 flex-1" style={{ lineHeight: 1.25 }}>
                  <div className="truncate" style={{ fontSize: 12, color: "#555" }}>
                    Av. {displayName}
                  </div>
                  <div className="truncate" style={{ fontSize: 10, color: "#2a2a2a" }}>
                    {String(plan)}
                  </div>
                </div>
                <Link
                  to="/settings"
                  className="inline-flex p-0.5 no-underline"
                  style={{ lineHeight: 0 }}
                  aria-label="Ayarlar"
                >
                  <Settings size={14} color="#2a2a2a" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div
          className="flex min-w-0 min-h-0 flex-1 flex-col"
          style={{ background: "#000" }}
        >
          <div
            className="flex flex-shrink-0 items-center justify-between"
            style={{ borderBottom: "0.5px solid #1e1e1e", padding: "8px 16px" }}
          >
            <Link
              to="/dashboard/dava-merkezi"
              className="no-underline"
              style={{ fontSize: 12, color: "#2a2a2a" }}
            >
              ← Dava Merkezine Dön
            </Link>
            <div className="relative" ref={menuR}>
              <button
                type="button"
                onClick={() => setHeadMenu((h) => !h)}
                className="inline-flex h-6 w-6 items-center justify-center border-0 p-0"
                style={{ background: "none", color: C.muted }}
                title="Daha"
              >
                <span className="select-none" style={{ fontSize: 14, letterSpacing: 2, lineHeight: 1 }}>···</span>
              </button>
              {headMenu && (
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-44"
                  style={{ background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 8 }}
                >
                  <button
                    type="button"
                    onClick={onRename}
                    className="w-full text-left"
                    style={{ color: "#888", fontSize: 12, padding: "8px 12px", background: "none", border: "none" }}
                  >
                    Yeniden adlandır
                  </button>
                  <button
                    type="button"
                    onClick={ex}
                    className="w-full text-left"
                    style={{ color: "#888", fontSize: 12, padding: "8px 12px", background: "none", border: "none" }}
                  >
                    Dışa aktar
                  </button>
                  <button
                    type="button"
                    onClick={onDel}
                    className="w-full text-left"
                    style={{ color: "#888", fontSize: 12, padding: "8px 12px", background: "none", border: "none" }}
                  >
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>

          <div ref={sc} className="min-h-0 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {empty ? (
              <div
                className="flex h-full min-h-full flex-col items-center justify-center"
                style={{ padding: 24, paddingTop: 40, paddingBottom: 200 }}
              >
                <h1
                  className="m-0 p-0"
                  style={{ fontFamily: "Abril Fatface, serif", fontSize: 48, color: "#fff", letterSpacing: "-1px" }}
                >
                  Miron
                </h1>
                <p
                  className="m-0 p-0"
                  style={{ fontFamily: "Libre Baskerville, serif", fontSize: 18, fontStyle: "italic", color: "#333" }}
                >
                  Hukuki asistanınız.
                </p>
                <div
                  className="grid w-full gap-3"
                  style={{ maxWidth: 520, marginTop: 56, gridTemplateColumns: narrow ? "1fr" : "1fr 1fr" }}
                >
                  {SUGGEST.map((s) => (
                    <button
                      type="button"
                      key={s.title}
                      onClick={() => send(s.text)}
                      className="text-left"
                      style={{
                        background: "#0a0a0a",
                        border: "0.5px solid #1e1e1e",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.borderH;
                        e.currentTarget.querySelector("div:first-child") &&
                          (e.currentTarget.querySelector("div:first-child").style.color = "#bbb");
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.querySelector("div:first-child") &&
                          (e.currentTarget.querySelector("div:first-child").style.color = "#888");
                      }}
                    >
                      <div className="font-medium" style={{ color: "#888", fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                      <div className="mt-1" style={{ color: "#333", fontSize: 11 }}>
                        {s.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="mx-auto w-full space-y-4 px-4 py-3"
                style={{ maxWidth: 860, paddingBottom: 28 }}
              >
                {messages.map((m, idx) => {
                  if (m.sender === "user") {
                    return (
                      <div key={m.id || `u${idx}`} className="flex w-full flex-col items-end" style={{ gap: 2 }}>
                        <div
                          style={{
                            maxWidth: 480,
                            background: "#0d0d0d",
                            border: "0.5px solid #1e1e1e",
                            borderRadius: 12,
                            padding: "14px 18px",
                            color: "#ccc",
                            fontSize: 14,
                            lineHeight: 1.7,
                            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  }
                  const tline = m.at
                    ? new Date(m.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                    : "";
                  const parts = parseAssistantMessage(m.text);
                  const hKey = m.id || `a${idx}`;
                  return (
                    <div
                      key={hKey}
                      className="w-full"
                      onMouseEnter={() => setMsgHover(hKey)}
                      onMouseLeave={() => setMsgHover(null)}
                    >
                      {tline ? <div className="mb-1" style={{ fontSize: 10, color: "#1e1e1e" }}>{tline}</div> : null}
                      <div className="flex" style={{ alignItems: "flex-start" }}>
                        <div
                          className="flex-shrink-0"
                          style={{ width: 1, minHeight: 8, background: C.border, marginRight: 20, alignSelf: "stretch" }}
                        />
                        <div className="min-w-0" style={{ maxWidth: 680, flex: 1 }}>
                          {parts.map((p, j) => {
                            if (p.type === "text")
                              return (
                                <p
                                  key={j}
                                  className="m-0"
                                  style={{
                                    fontFamily: "Libre Baskerville, serif",
                                    color: "#999",
                                    lineHeight: 1.85,
                                    fontSize: 14,
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {p.v}
                                </p>
                              );
                            return (
                              <div
                                key={j}
                                className="mb-1 mt-2"
                                style={{
                                  background: "#0a0a0a",
                                  border: "0.5px solid #1e1e1e",
                                  borderRadius: 8,
                                  padding: 16,
                                  fontSize: 12,
                                  color: "#c9a84c",
                                  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                                }}
                              >
                                <div style={{ color: "#2a2a2a", fontSize: 10, fontFamily: '"IBM Plex Sans", system-ui' }}>
                                  {p.lang}
                                </div>
                                <pre className="m-0 mt-1" style={{ whiteSpace: "pre-wrap", color: "#c9a84c" }}>
                                  {p.v}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {msgHover === hKey && (
                        <div className="mt-1.5 flex flex-wrap gap-3" style={{ marginLeft: 21, fontSize: 10, color: "#2a2a2a" }}>
                          <button
                            type="button"
                            onClick={() => copyT(m.text)}
                            className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
                            style={{ color: C.muted }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                          >
                            <Copy size={10} color="currentColor" />
                            <span className="font-['IBM_Plex_Sans',sans-serif]">Kopyala</span>
                          </button>
                          <button
                            type="button"
                            onClick={reGen}
                            className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
                            style={{ color: C.muted }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                          >
                            <RefreshCw size={10} color="currentColor" />
                            <span className="font-['IBM_Plex_Sans',sans-serif]">Yeniden Üret</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => shareT(m.text)}
                            className="inline-flex items-center gap-1 border-0 bg-transparent p-0"
                            style={{ color: C.muted }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                          >
                            <Share2 size={10} color="currentColor" />
                            <span className="font-['IBM_Plex_Sans',sans-serif]">Paylaş</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {loading && (
                  <div className="ml-1 flex" style={{ marginLeft: 21, gap: 1 }}>
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="inline-block"
                        style={{ animation: `asDot 0.6s ease-in-out ${d * 0.1}s infinite`, color: C.muted, fontSize: 20, lineHeight: 1, opacity: 0.2 }}
                      >
                        ·
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <style>{`@keyframes asDot{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
          </div>

          <div
            className="w-full border-t border-[#1e1e1e]"
            style={{ background: "#000", borderWidth: 0.5, padding: narrow ? "10px 14px" : "12px 24px" }}
          >
            <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
              <AnimatePresence>
                {fileTray && (
                  <motion.div
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 4, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    style={{ background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 10, marginBottom: 8, padding: 12 }}
                  >
                    <button
                      type="button"
                      onClick={() => fileIn.current && fileIn.current.click()}
                      className="w-full"
                      style={{
                        background: "transparent",
                        border: "0.5px dashed #222",
                        borderRadius: 8,
                        padding: 20,
                        color: "#333",
                        fontSize: 12,
                      }}
                    >
                      Dosya sürükle veya seç
                    </button>
                    <p className="m-0 mt-1.5 text-center" style={{ fontSize: 10, color: "#222" }}>
                      PDF · DOCX · TXT · UYAP
                    </p>
                    <input
                      ref={fileIn}
                      className="hidden"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.udf,.udx"
                      onChange={onPick}
                    />
                    {staged && (
                      <div className="mt-2 flex items-center justify-between" style={{ fontSize: 12, color: "#888" }}>
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <FileText size={14} color={C.muted} />
                          <span className="truncate">{staged.name}</span>
                        </span>
                        <button
                          type="button"
                          className="p-0"
                          onClick={() => {
                            setStaged(null);
                          }}
                          style={{ color: C.muted, background: "none", border: "none" }}
                        >
                          <X size={16} color={C.muted} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="relative w-full"
                style={{ background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: "12px 16px" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderH)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
              >
                <textarea
                  ref={ta}
                  className="w-full resize-none border-0 bg-transparent p-0 outline-none"
                  rows={1}
                  style={{ minHeight: 52, color: "#888", fontSize: 14, fontFamily: '"IBM Plex Sans", system-ui' }}
                  placeholder="Hukuki sorunuzu yazın..."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    requestAnimationFrame(taResize);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="inline-flex" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="p-0"
                    onClick={() => {
                      setFileTray((f) => !f);
                    }}
                    style={{ background: "none", border: "none" }}
                    aria-label="Dosya ekle"
                  >
                    <Paperclip size={15} color={C.muted} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="p-0"
                    onClick={() => setCtxOpen(true)}
                    style={{ background: "none", border: "none" }}
                    aria-label="Baglam sec"
                  >
                    <FileText size={15} color={C.muted} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="inline-flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#1e1e1e" }}>{input.length}</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center border-0"
                    disabled={loading}
                    onClick={() => send(input)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: input.trim() ? C.accent : "#111",
                      border: input.trim() ? "none" : "0.5px solid #1e1e1e",
                      transition: "background 0.15s, border 0.15s, opacity 0.15s",
                      opacity: input.trim() && loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (input.trim()) e.currentTarget.style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = input.trim() && loading ? "0.6" : "1";
                    }}
                    aria-label="Gonder"
                  >
                    <ArrowUp size={14} color={input.trim() ? "#000" : C.muted} />
                  </button>
                </div>
              </div>
              <p className="m-0 text-center" style={{ fontSize: 10, color: "#1a1a1a", marginTop: 10, lineHeight: 1.45 }}>
                Yapay zeka hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu kontrol edin.
              </p>
            </div>
          </div>
        </div>

        {showRight && (
          <aside
            className="hidden min-h-0 w-[280px] flex-col border-l border-[#1e1e1e] md:flex"
            style={{ background: "#0a0a0a", borderWidth: 0.5 }}
          >
            <div className="flex justify-end" style={{ padding: 6 }}>
              <button type="button" onClick={() => setRightOff(true)} className="p-0" style={{ background: "none", border: "none" }} aria-label="Kapat">
                <X size={14} color="#333" />
              </button>
            </div>
            <div className="px-3" style={{ fontSize: 10, color: "#2a2a2a", letterSpacing: 1, textTransform: "uppercase" }}>
              Bağlam
            </div>
            {staged && (
              <div className="m-2.5" style={{ background: "#000", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                <div className="truncate" style={{ fontSize: 12, fontWeight: 500, color: "#777" }}>{staged.name}</div>
                <div style={{ fontSize: 10, color: "#2a2a2a" }}>{Math.max(0, Math.round(staged.size / 1024))} KB</div>
                <div className="mt-1" style={{ fontSize: 10, color: "#888" }}>Hazır</div>
              </div>
            )}
            {linked && (
              <div className="m-2.5" style={{ background: "#000", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                <div className="truncate" style={{ fontSize: 12, fontWeight: 500, color: "#777" }}>{linked.name}</div>
                <div style={{ fontSize: 10, color: "#2a2a2a" }}>{linked.num}</div>
                <div className="mt-1" style={{ fontSize: 10, color: "#888" }}>Bağlandı</div>
              </div>
            )}
          </aside>
        )}
      </div>

      {narrow && (staged || linked) && !rightOff && !empty && (
        <div
          className="fixed left-0 right-0 z-30 border-t border-[#1e1e1e] p-2 md:hidden"
          style={{ bottom: 0, background: "#0a0a0a", fontSize: 10, color: "#666" }}
        >
          {staged ? (
            <div>
              {staged.name} &middot; {Math.max(0, Math.round(staged.size / 1024))} KB &middot; hazır
            </div>
          ) : null}
          {linked ? <div> {linked.name} / {linked.num} </div> : null}
        </div>
      )}

      <AnimatePresence>
        {ctxOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setCtxOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full"
              style={{ maxWidth: 400, background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 10, padding: 16 }}
            >
              <div className="flex items-center justify-between">
                <p className="m-0" style={{ color: "#fff", fontSize: 14 }}>
                  Dava bağla
                </p>
                <button type="button" onClick={() => setCtxOpen(false)} className="p-0" style={{ background: "none", border: "none" }}>
                  <X size={14} color={C.muted} />
                </button>
              </div>
              <p className="m-0 mt-2" style={{ fontSize: 12, color: "#888" }}>Bağlayabileceğiniz örnek davalar (yer tutucu).</p>
              {["Örnek Dava A: 2024/120", "Örnek Dava B: 2023/45"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className="mt-2 w-full"
                  onClick={() => {
                    const [a, b] = l.split(":");
                    setLinked({ name: a?.trim() || l, num: b?.trim() || "" });
                    setRightOff(false);
                    setCtxOpen(false);
                  }}
                  style={{ border: "0.5px solid #1e1e1e", color: "#888", background: "#000", textAlign: "left", fontSize: 12, borderRadius: 6, padding: 10 }}
                >
                  {l}
                </button>
              ))}
              <button
                type="button"
                className="mt-2 w-full"
                onClick={() => {
                  setLinked(null);
                  setCtxOpen(false);
                }}
                style={{ fontSize: 10, color: C.muted, background: "none", border: "none", textAlign: "right" }}
              >
                Bağlamı kaldır
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rnOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setRnOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ maxWidth: 400, padding: 20, background: "#0a0a0a", border: "0.5px solid #1e1e1e" }}>
              <p className="m-0" style={{ color: "#fff" }}>Yeniden adlandır</p>
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="w-full" style={{ marginTop: 10, background: "#000", color: "#fff", border: "0.5px solid #1e1e1e", borderRadius: 6, padding: 8, fontSize: 13 }} />
              <div className="mt-2 flex justify-end" style={{ gap: 6 }}>
                <button type="button" onClick={() => setRnOpen(false)} className="border" style={{ border: "0.5px solid #1e1e1e", background: "none", color: "#888", borderRadius: 6, padding: "6px 10px" }}>
                  Vazgeç
                </button>
                <button type="button" onClick={saveRn} style={{ background: C.accent, color: "#000", fontWeight: 600, borderRadius: 6, border: "none", padding: "6px 10px" }}> Kaydet</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDelOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full" style={{ maxWidth: 400, background: "#0a0a0a", border: "0.5px solid #1e1e1e", padding: 20 }}>
              <p className="m-0" style={{ color: "#fff", fontWeight: 600 }}>Sohbeti sil</p>
              <p className="m-0" style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Devam edilsin mi?</p>
              <div className="mt-2 flex justify-end" style={{ gap: 6 }}>
                <button type="button" onClick={() => setDelOpen(false)} className="border" style={{ border: "0.5px solid #1e1e1e", background: "none", color: "#888", borderRadius: 6, padding: "6px 10px" }}>Vazgeç</button>
                <button type="button" onClick={doDel} className="border-0" style={{ background: "rgb(150, 50, 50)", color: "#fff", borderRadius: 6, padding: "6px 10px" }}> Sil</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
