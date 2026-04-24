import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUp,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { lawyerDisplayName, trGreeting, groupChatsForSidebar } from "../lib/assistantGreeting.js";

const SUGGEST = [
  {
    title: "Emsal ara",
    sub: "Yargıtay emsal özetle",
    text: "İş akdi feshi için güncel Yargıtay emsal çizgilerini maddeler halinde özetle; varsayımlarını açıkça yaz.",
  },
  {
    title: "Sözleşme riski",
    sub: "Hukuki risk taraması",
    text: "Taraflar, süre, fesih ve yaptırımlar bağlamında sözleşme metninde dikkat edilmesi gereken riskleri listele. Metin henüz yüklenmediyse varsayım söyle.",
  },
  {
    title: "Dilekçe taslağı",
    sub: "Alacak davası",
    text: "Alacak davası için gerekçeli dilekçe iskeleti hazırla; açık noktaları soru olarak işaretle.",
  },
  {
    title: "Strateji",
    sub: "Kısa yol haritası",
    text: "Bir dava açıklaması verilmeden önce hangi adımlar atılmalı; delil, süre ve harç açısından maddelendir. Kanıt eksikliğini uyar.",
  },
];

function trDate() {
  return new Date().toLocaleDateString("tr-TR");
}

export default function LibraAssistant({ caseText: caseTextProp = "" }) {
  const { user } = useAuth();
  const location = useLocation();
  const stateCtx =
    location.state && typeof location.state === "object" && location.state.caseText
      ? String(location.state.caseText)
      : "";
  const mergedContext = [caseTextProp, stateCtx].filter(Boolean).join("\n\n");

  const userScope = user?.id ? String(user.id) : "anon";
  const LS_CHATS = `libraChats::${userScope}`;
  const LS_CURRENT = `libraCurrentChatId::${userScope}`;

  const [greetingTick, setGreetingTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setGreetingTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const greeting = useMemo(() => trGreeting(), [greetingTick]);
  const avukat = lawyerDisplayName(user);

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
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  const scRef = useRef(null);
  const taRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const f = () => setNarrow(window.innerWidth < 768);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  useEffect(() => {
    try {
      setChats(JSON.parse(localStorage.getItem(LS_CHATS) || "[]"));
    } catch {
      setChats([]);
    }
    const s = localStorage.getItem(LS_CURRENT);
    setCurrentChatId(s ? Number(s) : null);
  }, [userScope, LS_CHATS, LS_CURRENT]);

  useEffect(() => {
    localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  }, [chats, LS_CHATS]);

  useEffect(() => {
    if (currentChatId) localStorage.setItem(LS_CURRENT, String(currentChatId));
  }, [currentChatId, LS_CURRENT]);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = useMemo(() => chats.find((c) => c.id === currentChatId) || null, [chats, currentChatId]);
  const messages = current?.messages || [];
  const empty = messages.length === 0;

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        String(c.messages?.slice(-1)[0]?.text || "").toLowerCase().includes(q)
    );
  }, [chats, query]);
  const grouped = useMemo(() => groupChatsForSidebar(filteredChats), [filteredChats]);

  useEffect(() => {
    if (chats.length === 0) {
      const n = {
        id: Date.now(),
        name: "Sohbet 1",
        date: trDate(),
        createdAt: Date.now(),
        messages: [],
      };
      setChats([n]);
      setCurrentChatId(n.id);
      return;
    }
    if (!chats.some((c) => c.id === currentChatId)) {
      setCurrentChatId(chats[0].id);
    }
  }, [chats, currentChatId]);

  const scrollToBottom = () => {
    const el = scRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };
  useEffect(() => {
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [messages.length, loading]);

  const postAssistant = async (payload) => {
    const paths = ["/assistant-chat", "/api/assistant-chat", "/assistant/assistant-chat"];
    let lastErr = null;
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
          const detail = data?.detail
            ? typeof data.detail === "string"
              ? data.detail
              : Array.isArray(data.detail)
                ? data.detail.map((d) => d?.msg || d).join("; ")
                : JSON.stringify(data.detail)
            : data?.reply
              ? String(data.reply)
              : res.status === 401
                ? "Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın."
                : `HTTP ${res.status}`;
          throw new Error(detail);
        }
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Bağlantı hatası");
  };

  const send = async (raw) => {
    if (!current) return;
    const t = String(raw || "").trim();
    if (!t) return;
    const uid = current.id;
    const umsg = { sender: "user", text: t };
    setChats((prev) =>
      prev.map((c) => (c.id === uid ? { ...c, messages: [...(c.messages || []), umsg] } : c))
    );
    setInput("");
    if (taRef.current) {
      taRef.current.style.height = "52px";
    }
    setLoading(true);
    setSideOpen(false);
    const payload = {
      message: t,
      context: mergedContext,
      chat_id: String(uid),
    };
    try {
      const data = await postAssistant(payload);
      const text = data?.reply || "Yanıt alınamadı.";
      const bot = { sender: "assistant", text };
      setChats((prev) => prev.map((c) => (c.id === uid ? { ...c, messages: [...(c.messages || []), bot] } : c)));
    } catch (e) {
      const bot = { sender: "assistant", text: `Yanıt alınamadı: ${e?.message || "Bilinmeyen hata"}` };
      setChats((prev) => prev.map((c) => (c.id === uid ? { ...c, messages: [...(c.messages || []), bot] } : c)));
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    const n = {
      id: Date.now(),
      name: `Sohbet ${chats.length + 1}`,
      date: trDate(),
      createdAt: Date.now(),
      messages: [],
    };
    setChats((p) => [n, ...p]);
    setCurrentChatId(n.id);
    if (narrow) setSideOpen(false);
  };

  const openRename = () => {
    if (!current) return;
    setNameDraft(current.name || "");
    setRenameOpen(true);
    setMenuOpen(false);
  };
  const doRename = () => {
    if (!current) return;
    const v = nameDraft.trim();
    if (v) setChats((p) => p.map((c) => (c.id === current.id ? { ...c, name: v } : c)));
    setRenameOpen(false);
  };

  const exportChat = () => {
    if (!current) return;
    const body = (current.messages || [])
      .map((m) => `${m.sender === "user" ? "Kullanici" : "Asistan"}: ${m.text || ""}`)
      .join("\n\n");
    const b = new Blob([body], { type: "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${(current.name || "Sohbet").replace(/[\\/:*?"<>|]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(u);
    setMenuOpen(false);
  };

  const onDelete = () => {
    setMenuOpen(false);
    setDeleteOpen(true);
  };
  const doDelete = () => {
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
    setDeleteOpen(false);
  };

  return (
    <motion.main
      className="flex w-full max-w-full flex-col overflow-x-hidden"
      style={{ minHeight: "calc(100dvh - 7.5rem)", maxHeight: "calc(100dvh - 7.5rem)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {narrow && (
        <div
          className="flex items-center justify-end border-b border-[#1e1e1e] bg-[#0a0a0a] py-1.5 pr-3 md:hidden"
          style={{ borderWidth: 0.5 }}
        >
          <button
            type="button"
            className="p-1.5"
            style={{ border: "0.5px solid #1e1e1e", borderRadius: 6, background: "#0a0a0a" }}
            onClick={() => setSideOpen(true)}
            aria-label="Menu"
          >
            <Menu size={16} color="#3a3a3a" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {narrow && sideOpen && (
            <motion.button
              type="button"
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.55)" }}
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
            overflow: narrow && !sideOpen ? "hidden" : "visible",
            position: narrow ? (sideOpen ? "fixed" : "static") : "relative",
            zIndex: narrow && sideOpen ? 50 : 1,
            height: narrow && sideOpen ? "100dvh" : "100%",
            top: 0,
            left: 0,
            boxShadow: narrow && sideOpen ? "8px 0 20px rgba(0,0,0,0.4)" : "none",
            transition: narrow ? "min-width 0.2s ease" : "none",
          }}
        >
          {narrow && sideOpen && (
            <button
              type="button"
              className="absolute right-2 top-2 z-50 p-0.5"
              style={{ background: "none", border: "none" }}
              onClick={() => setSideOpen(false)}
              aria-label="Kapat"
            >
              <X size={16} color="#3a3a3a" />
            </button>
          )}

          <div className="box-border flex h-full w-[260px] min-w-[260px] flex-col" style={{ padding: 16 }}>
            <div className="mb-2">
              <span
                className="inline-block"
                style={{ fontFamily: "Abril Fatface, serif", fontSize: 13, letterSpacing: "-0.01em" }}
              >
                <span className="text-white">Miron</span> <span style={{ color: "#FFD700" }}>AI</span>
              </span>
            </div>
            <button
              type="button"
              onClick={newChat}
              className="flex w-full items-center justify-center gap-1.5 border-0"
              style={{
                background: "#0a0a0a",
                border: "0.5px solid #1e1e1e",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#555",
                fontSize: 12,
                fontWeight: 400,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
              }}
            >
              <Plus size={14} color="#333" strokeWidth={1.5} />
              Yeni sohbet
            </button>

            <input
              className="mt-3 w-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara"
              style={{
                background: "#000",
                border: "0.5px solid #1e1e1e",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 11,
                color: "#888",
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                outline: "none",
              }}
            />

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5" style={{ marginTop: 8 }}>
              <p
                className="m-0 mb-2"
                style={{
                  fontSize: 10,
                  color: "#2a2a2a",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                }}
              >
                Geçmiş
              </p>
              {grouped.map((g, gi) => (
                <div key={g.key} className="mb-0">
                  <p
                    className="m-0"
                    style={{
                      fontSize: 10,
                      color: "#222",
                      textTransform: "uppercase",
                      marginTop: gi === 0 ? 0 : 16,
                      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    }}
                  >
                    {g.key}
                  </p>
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
                              padding: "7px 10px",
                              borderRadius: 8,
                              color: on ? "#ccc" : "#444",
                              background: on ? "#0d0d0d" : "transparent",
                              border: "none",
                              borderLeft: on ? "2px solid #FFD700" : "2px solid transparent",
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                            }}
                            title={c.name}
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

            <div
              className="mt-2"
              style={{ borderTop: "0.5px solid #1e1e1e", paddingTop: 14, marginTop: "auto", flexShrink: 0 }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex flex-shrink-0 items-center justify-center"
                  style={{ width: 28, height: 28, borderRadius: 999, background: "#FFD700", fontSize: 9, fontWeight: 700, color: "#000" }}
                >
                  {String(avukat.replace(/^Av\.\s*/i, "") || "A")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate" style={{ fontSize: 11, color: "#555", fontFamily: '"IBM Plex Sans", system-ui' }}>
                    {avukat}
                  </p>
                </div>
                <Link to="/settings" className="p-0.5 no-underline" aria-label="Ayarlar" style={{ lineHeight: 0 }}>
                  <Settings size={14} color="#2a2a2a" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ background: "#000", borderColor: "#1e1e1e" }}
        >
          <div
            className="flex flex-shrink-0 flex-col gap-1"
            style={{ borderBottom: "0.5px solid #1e1e1e", padding: "8px 16px 10px" }}
          >
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/dashboard/dava-merkezi"
                className="no-underline"
                style={{ fontSize: 11, color: "#3a3a3a", fontFamily: '"IBM Plex Sans", system-ui' }}
                onClick={(e) => e.stopPropagation()}
              >
                ← Dava Merkezine dön
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((m) => !m)}
                  className="px-1"
                  style={{ background: "none", border: "none", color: "#3a3a3a", fontSize: 14, letterSpacing: 2, lineHeight: 1 }}
                  aria-label="Daha"
                >
                  &middot;&middot;&middot;
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 z-20 mt-1 w-40"
                    style={{ background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "2px 0" }}
                  >
                    <button
                      type="button"
                      onClick={openRename}
                      className="w-full text-left"
                      style={{ border: "none", background: "none", color: "#888", fontSize: 11, padding: "6px 10px" }}
                    >
                      Yeniden adlandır
                    </button>
                    <button
                      type="button"
                      onClick={exportChat}
                      className="w-full text-left"
                      style={{ border: "none", background: "none", color: "#888", fontSize: 11, padding: "6px 10px" }}
                    >
                      Dışa aktar
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="w-full text-left"
                      style={{ border: "none", background: "none", color: "#888", fontSize: 11, padding: "6px 10px" }}
                    >
                      Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p
              className="m-0"
              style={{
                fontFamily: '"Libre Baskerville", "Georgia", serif',
                fontSize: 13,
                color: "#888",
                lineHeight: 1.45,
                fontStyle: "italic",
              }}
            >
              {greeting}, {avukat}
            </p>
          </div>

          <div
            ref={scRef}
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {empty ? (
              <div
                className="flex h-full min-h-full flex-col items-center justify-center px-4"
                style={{ paddingBottom: 160, paddingTop: 20 }}
              >
                <h1
                  className="m-0 p-0"
                  style={{ fontFamily: "Abril Fatface, serif", fontSize: 44, color: "#fff", letterSpacing: "-0.5px" }}
                >
                  Miron
                </h1>
                <p
                  className="m-0 p-0 text-center"
                  style={{ fontFamily: "Libre Baskerville, serif", fontSize: 16, color: "#333", fontStyle: "italic" }}
                >
                  {greeting}, {avukat}
                </p>
                <p
                  className="m-0 p-0 text-center"
                  style={{
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    fontSize: 14,
                    color: "#333",
                    marginTop: 6,
                    fontStyle: "italic",
                  }}
                >
                  Hukuki asistanınız.
                </p>
                <div
                  className="mt-8 grid w-full max-w-lg gap-2.5"
                  style={{ marginTop: 32, gridTemplateColumns: narrow ? "1fr" : "1fr 1fr" }}
                >
                  {SUGGEST.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => send(s.text)}
                      className="w-full text-left"
                      style={{
                        background: "#0a0a0a",
                        border: "0.5px solid #1e1e1e",
                        borderRadius: 10,
                        padding: "12px 14px",
                        color: "#888",
                        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#888" }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>{s.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="mx-auto w-full space-y-3 px-4 py-2"
                style={{ maxWidth: 720, paddingBottom: 24, paddingTop: 8 }}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className="flex w-full"
                    style={{ justifyContent: m.sender === "user" ? "flex-end" : "flex-start" }}
                  >
                    <div
                      style={
                        m.sender === "user"
                          ? {
                              maxWidth: 400,
                              background: "#0d0d0d",
                              border: "0.5px solid #1e1e1e",
                              borderRadius: 12,
                              padding: "10px 14px",
                              color: "#ccc",
                              fontSize: 13,
                              lineHeight: 1.65,
                              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }
                          : {
                              maxWidth: 560,
                              color: "#999",
                              fontSize: 14,
                              lineHeight: 1.75,
                              fontFamily: "Libre Baskerville, Georgia, serif",
                              borderLeft: "1px solid #1e1e1e",
                              paddingLeft: 12,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <p className="m-0 pl-3" style={{ color: "#333", fontSize: 11, fontFamily: "IBM Plex Sans" }}>
                    <span className="inline-block animate-pulse">Miron yazıyor...</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div
            className="w-full"
            style={{ background: "#000", borderTop: "0.5px solid #1e1e1e", padding: narrow ? "10px 12px" : "12px 20px" }}
          >
            <div className="mx-auto" style={{ maxWidth: 720 }}>
              <div
                className="w-full"
                style={{
                  display: "flex",
                  background: "#0a0a0a",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 10,
                  padding: "6px 8px",
                }}
              >
                <textarea
                  ref={taRef}
                  className="w-full"
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "0px";
                    el.style.height = `${Math.min(200, Math.max(44, el.scrollHeight))}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Hukuki sorunuzu yazın..."
                  style={{
                    minHeight: 44,
                    maxHeight: 200,
                    background: "transparent",
                    color: "#888",
                    fontSize: 14,
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    border: "none",
                    padding: "8px 4px",
                    outline: "none",
                    resize: "none",
                  }}
                />
                <button
                  type="button"
                  className="flex items-center justify-center"
                  onClick={() => send(input)}
                  disabled={loading}
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    alignSelf: "flex-end",
                    border: input.trim() ? "none" : "0.5px solid #1e1e1e",
                    borderRadius: 8,
                    background: input.trim() ? "#FFD700" : "#111",
                    color: input.trim() ? "#000" : "#3a3a3a",
                    marginBottom: 2,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && input.trim() ? 0.7 : 1,
                  }}
                  aria-label="Gönder"
                >
                  <ArrowUp size={16} color={input.trim() ? "#000" : "#3a3a3a"} />
                </button>
              </div>
              <p
                className="m-0 text-center"
                style={{ fontSize: 9, color: "#1a1a1a", marginTop: 8, fontFamily: '"IBM Plex Sans", system-ui' }}
              >
                Yapay zeka hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu kontrol edin.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {renameOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setRenameOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full p-4"
              style={{ maxWidth: 380, background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 10 }}
            >
              <p className="m-0" style={{ color: "#fff", fontSize: 15 }}>
                Sohbet adı
              </p>
              <input
                className="mt-2 w-full"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                style={{
                  background: "#000",
                  color: "#fff",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 13,
                }}
              />
              <div className="mt-2 flex justify-end" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  style={{ border: "0.5px solid #1e1e1e", background: "none", color: "#888", borderRadius: 6, padding: "4px 10px" }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={doRename}
                  style={{ background: "#FFD700", color: "#000", border: "none", fontWeight: 600, borderRadius: 6, padding: "4px 10px" }}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-2"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setDeleteOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full p-4"
              style={{ maxWidth: 380, background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 10 }}
            >
              <p className="m-0" style={{ color: "#fff", fontSize: 15 }}>
                Sohbet silinsin mi?
              </p>
              <p className="m-0 mt-1" style={{ color: "#666", fontSize: 12 }}>
                Bu sohbet yerel taslaktan kaldırılır.
              </p>
              <div className="mt-2 flex justify-end" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  style={{ border: "0.5px solid #1e1e1e", background: "none", color: "#888", borderRadius: 6, padding: "4px 10px" }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  style={{ background: "#5a1a1a", color: "#f0d0d0", border: "none", borderRadius: 6, padding: "4px 10px" }}
                >
                  Sil
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
