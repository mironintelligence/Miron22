import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Menu, Plus, Settings, X } from "lucide-react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import {
  lawyerDisplayName,
  trGreeting,
  groupChatsForSidebar,
} from "../lib/assistantGreeting.js";

const SUGGEST = [
  {
    title: "İş akdi feshi için emsal ara",
    sub: "Yargıtay kararlarından güncel emsal bul",
    text: "İş akdi feshi için güncel Yargıtay emsal kararlarını maddeler halinde özetle; varsayımlarını açıkça yaz.",
  },
  {
    title: "Sözleşmedeki riskleri analiz et",
    sub: "Risk ve öneri raporu oluştur",
    text: "Taraflar, süre, fesih ve yaptırımlar bağlamında sözleşme metninde dikkat edilmesi gereken riskleri listele. Metin henüz yüklenmediyse varsayım söyle.",
  },
  {
    title: "Alacak davası dilekçesi yaz",
    sub: "Otomatik taslak oluştur",
    text: "Alacak davası için gerekçeli dilekçe iskeleti hazırla; açık noktaları soru olarak işaretle.",
  },
  {
    title: "Kazanma ihtimalimi hesapla",
    sub: "Strateji önerisi al",
    text: "Bir dava açıklaması verilmeden önce hangi adımlar atılmalı; delil, süre ve harç açısından maddelendir. Kanıt eksikliğini uyar.",
  },
];

const EMOJI_RANGES = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu;
const VARIATION_SELECTOR = /\uFE0F/g;
const HASH_BULLETS = /^#{1,4}\s+/gm;

function stripEmojis(text) {
  return String(text || "")
    .replace(EMOJI_RANGES, "")
    .replace(VARIATION_SELECTOR, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function trDate() {
  return new Date().toLocaleDateString("tr-TR");
}

const ACTIVITY_TIMEOUT_MS = 30_000;
const STREAM_ABORT_MS = 180_000;

const FONT_SANS = '"IBM Plex Sans", system-ui, sans-serif';
const FONT_SERIF = '"Libre Baskerville", Georgia, serif';
const FONT_DISPLAY = '"Abril Fatface", serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

const markdownComponents = {
  h1: ({ node, ...props }) => (
    <h3
      style={{
        fontFamily: FONT_SANS,
        fontSize: 14,
        fontWeight: 500,
        color: "#cccccc",
        marginTop: 22,
        marginBottom: 8,
      }}
      {...props}
    />
  ),
  h2: ({ node, ...props }) => (
    <h3
      style={{
        fontFamily: FONT_SANS,
        fontSize: 13,
        fontWeight: 500,
        color: "#cccccc",
        marginTop: 20,
        marginBottom: 8,
      }}
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3
      style={{
        fontFamily: FONT_SANS,
        fontSize: 13,
        fontWeight: 500,
        color: "#cccccc",
        marginTop: 20,
        marginBottom: 8,
      }}
      {...props}
    />
  ),
  h4: ({ node, ...props }) => (
    <h4
      style={{
        fontFamily: FONT_SANS,
        fontSize: 12,
        fontWeight: 500,
        color: "#bbb",
        marginTop: 16,
        marginBottom: 6,
      }}
      {...props}
    />
  ),
  p: ({ node, ...props }) => (
    <p
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 14,
        color: "#888",
        lineHeight: 1.85,
        margin: "0 0 12px",
      }}
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul style={{ margin: "0 0 12px", paddingLeft: 16, listStyle: "disc" }} {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol style={{ margin: "0 0 12px", paddingLeft: 18 }} {...props} />
  ),
  li: ({ node, ...props }) => (
    <li
      style={{
        fontFamily: FONT_SERIF,
        fontSize: 14,
        color: "#666",
        lineHeight: 1.85,
        marginBottom: 4,
      }}
      {...props}
    />
  ),
  strong: ({ node, ...props }) => (
    <strong style={{ color: "#bbb", fontWeight: 600 }} {...props} />
  ),
  em: ({ node, ...props }) => <em style={{ color: "#888" }} {...props} />,
  a: ({ node, ...props }) => (
    <a style={{ color: "#FFD700", textDecoration: "none" }} {...props} />
  ),
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            background: "#0a0a0a",
            padding: "2px 6px",
            borderRadius: 4,
            color: "#c9a84c",
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre
        style={{
          background: "#0a0a0a",
          border: "0.5px solid #1e1e1e",
          padding: 16,
          borderRadius: 8,
          overflowX: "auto",
          margin: "0 0 12px",
        }}
      >
        <code style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#c9a84c" }} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  blockquote: ({ node, ...props }) => (
    <blockquote
      style={{
        borderLeft: "2px solid #2a2a2a",
        paddingLeft: 12,
        margin: "0 0 12px",
        color: "#777",
        fontStyle: "italic",
        fontFamily: FONT_SERIF,
      }}
      {...props}
    />
  ),
};

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
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
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

  const current = useMemo(
    () => chats.find((c) => c.id === currentChatId) || null,
    [chats, currentChatId]
  );
  const messages = current?.messages || [];
  const empty = messages.length === 0 && !streaming;

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
        name: "Yeni sohbet",
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
  }, [messages.length, streamText, streaming]);

  const generateTitle = async (chatId, firstMessage) => {
    try {
      const r = await authFetch("/assistant-chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstMessage.slice(0, 800) }),
      });
      if (!r.ok) return;
      const data = await r.json().catch(() => ({}));
      let title = stripEmojis(String(data?.title || "").trim());
      if (!title) return;
      if (title.length > 32) title = title.slice(0, 32).trimEnd() + "…";
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, name: title } : c)));
    } catch {
      /* ignore */
    }
  };

  const sendFallback = async (uid, t, payload) => {
    const paths = ["/assistant-chat", "/api/assistant-chat"];
    let lastErr = null;
    for (const p of paths) {
      try {
        const r = await authFetch(p, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (r.status === 404) continue;
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
        return stripEmojis(String(data?.reply || "")) || "Yanıt alınamadı.";
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Bağlantı hatası");
  };

  const send = async (raw) => {
    if (!current || streaming) return;
    const t = String(raw || "").trim();
    if (!t) return;
    const uid = current.id;
    const isFirstMessage = (current.messages || []).length === 0;

    setChats((prev) =>
      prev.map((c) =>
        c.id === uid ? { ...c, messages: [...(c.messages || []), { sender: "user", text: t }] } : c
      )
    );
    setInput("");
    if (taRef.current) taRef.current.style.height = "52px";
    setStreaming(true);
    setStreamText("");
    setSideOpen(false);

    if (isFirstMessage) generateTitle(uid, t);

    const payload = {
      message: t.slice(0, 8000),
      context: mergedContext.slice(0, 10000),
      chat_id: String(uid),
    };

    let finalText = "";
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), STREAM_ABORT_MS);

    try {
      const res = await authFetch("/assistant-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(payload),
        signal: abortCtrl.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 404 || res.status === 405) {
          finalText = await sendFallback(uid, t, payload);
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || `HTTP ${res.status}`);
        }
      } else {
        let accumulated = "";
        let errorMessage = "";
        let lastActivity = Date.now();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        const activityInterval = setInterval(() => {
          if (Date.now() - lastActivity > ACTIVITY_TIMEOUT_MS) {
            clearInterval(activityInterval);
            abortCtrl.abort();
          }
        }, 5000);

        try {
          while (true) {
            let done, value;
            try {
              ({ done, value } = await reader.read());
            } catch {
              break;
            }
            if (done) break;
            lastActivity = Date.now();
            buf += decoder.decode(value, { stream: true });
            const events = buf.split("\n\n");
            buf = events.pop() || "";
            for (const ev of events) {
              const line = ev.split("\n").find((l) => l.startsWith("data:"));
              if (!line) continue;
              const raw = line.slice(5).trim();
              if (!raw) continue;
              try {
                const obj = JSON.parse(raw);
                if (obj.error) { errorMessage = obj.error; }
                if (obj.done && errorMessage) break;
                if (obj.content) {
                  accumulated += obj.content;
                  setStreamText(stripEmojis(accumulated));
                }
              } catch { /* ignore */ }
            }
          }
        } finally {
          clearInterval(activityInterval);
        }

        if (errorMessage && !accumulated) {
          try {
            finalText = await sendFallback(uid, t, payload);
          } catch {
            finalText = `Yanıt alınamadı: ${errorMessage}`;
          }
        } else {
          finalText = stripEmojis(accumulated) || "Yanıt alınamadı.";
        }
      }
    } catch (e) {
      if (abortCtrl.signal.aborted && !streamText) {
        try {
          finalText = await sendFallback(uid, t, payload);
        } catch {
          finalText = `Yanıt alınamadı: ${e?.message || "Bağlantı hatası"}`;
        }
      } else {
        finalText = `Yanıt alınamadı: ${e?.message || "Bağlantı hatası"}`;
      }
    } finally {
      clearTimeout(abortTimer);
    }

    setChats((prev) =>
      prev.map((c) =>
        c.id === uid
          ? { ...c, messages: [...(c.messages || []), { sender: "assistant", text: finalText }] }
          : c
      )
    );
    setStreamText("");
    setStreaming(false);
  };

  const newChat = () => {
    const n = {
      id: Date.now(),
      name: "Yeni sohbet",
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
      const n = {
        id: Date.now(),
        name: "Yeni sohbet",
        date: trDate(),
        createdAt: Date.now(),
        messages: [],
      };
      setChats([n]);
      setCurrentChatId(n.id);
    }
    setDeleteOpen(false);
  };

  const cleanedStream = stripEmojis(streamText);

  return (
    <>
      <motion.div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          background: "#000000",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {narrow && (
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            aria-label="Menü"
            style={{
              position: "fixed",
              top: 12,
              left: 12,
              zIndex: 60,
              border: "0.5px solid #1e1e1e",
              background: "#0a0a0a",
              borderRadius: 6,
              padding: 6,
              display: sideOpen ? "none" : "block",
            }}
          >
            <Menu size={16} color="#3a3a3a" strokeWidth={1.5} />
          </button>
        )}

        <AnimatePresence>
          {narrow && sideOpen && (
            <motion.button
              type="button"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
                background: "rgba(0,0,0,0.55)",
                border: "none",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideOpen(false)}
              aria-label="Kapat"
            />
          )}
        </AnimatePresence>

        <aside
          style={{
            width: 260,
            minWidth: 260,
            height: "100vh",
            overflowY: "auto",
            flexShrink: 0,
            background: "#0a0a0a",
            borderRight: "0.5px solid #1e1e1e",
            display: "flex",
            flexDirection: "column",
            position: narrow ? "fixed" : "relative",
            left: narrow ? (sideOpen ? 0 : -280) : 0,
            top: 0,
            zIndex: 50,
            transition: narrow ? "left 0.2s ease" : "none",
            boxShadow: narrow && sideOpen ? "8px 0 20px rgba(0,0,0,0.4)" : "none",
            padding: 16,
            boxSizing: "border-box",
          }}
        >
          {narrow && sideOpen && (
            <button
              type="button"
              onClick={() => setSideOpen(false)}
              aria-label="Kapat"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "none",
                border: "none",
                padding: 4,
              }}
            >
              <X size={16} color="#3a3a3a" />
            </button>
          )}

          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ color: "#ffffff" }}>Miron</span>{" "}
              <span style={{ color: "#FFD700" }}>AI</span>
            </span>
          </div>

          <Link
            to="/dashboard"
            style={{
              fontFamily: FONT_SANS,
              fontSize: 11,
              color: "#333",
              textDecoration: "none",
              marginBottom: 14,
              display: "inline-block",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#777")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
          >
            ← Ana Sayfaya Dön
          </Link>

          <button
            type="button"
            onClick={newChat}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              background: "#0a0a0a",
              border: "0.5px solid #1e1e1e",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#666",
              fontSize: 12,
              fontWeight: 400,
              fontFamily: FONT_SANS,
              cursor: "pointer",
            }}
          >
            <Plus size={14} color="#666" strokeWidth={1.5} />
            Yeni sohbet
          </button>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara"
            style={{
              marginTop: 12,
              width: "100%",
              boxSizing: "border-box",
              background: "#000",
              border: "0.5px solid #1e1e1e",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 11,
              color: "#888",
              fontFamily: FONT_SANS,
              outline: "none",
            }}
          />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              marginTop: 12,
              paddingRight: 2,
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 10,
                color: "#2a2a2a",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontFamily: FONT_SANS,
              }}
            >
              Geçmiş
            </p>
            {grouped.map((g, gi) => (
              <div key={g.key}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    color: "#222",
                    textTransform: "uppercase",
                    marginTop: gi === 0 ? 0 : 14,
                    fontFamily: FONT_SANS,
                  }}
                >
                  {g.key}
                </p>
                <ul style={{ margin: "6px 0 0", listStyle: "none", padding: 0 }}>
                  {g.items.map((c) => {
                    const on = c.id === currentChatId;
                    return (
                      <li key={c.id} style={{ margin: 0, padding: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentChatId(c.id);
                            if (narrow) setSideOpen(false);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
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
                            fontFamily: FONT_SANS,
                            cursor: "pointer",
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
            style={{
              borderTop: "0.5px solid #1e1e1e",
              paddingTop: 12,
              marginTop: "auto",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontFamily: FONT_SANS,
                fontSize: 11,
                color: "#2a2a2a",
                fontStyle: "italic",
              }}
            >
              {greeting}, {avukat}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: "#FFD700",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {String(avukat.replace(/^Av\.\s*/i, "") || "A").slice(0, 2).toUpperCase()}
              </div>
              <p
                style={{
                  margin: 0,
                  flex: 1,
                  fontSize: 11,
                  color: "#555",
                  fontFamily: FONT_SANS,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {avukat}
              </p>
              <Link
                to="/settings"
                aria-label="Ayarlar"
                style={{ padding: 2, lineHeight: 0, textDecoration: "none" }}
              >
                <Settings size={14} color="#2a2a2a" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </aside>

        <div
          style={{
            flex: 1,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#000",
            minWidth: 0,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-end",
              padding: "8px 16px",
              borderBottom: "0.5px solid #1e1e1e",
            }}
          >
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((m) => !m)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3a3a3a",
                  fontSize: 14,
                  letterSpacing: 2,
                  lineHeight: 1,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
                aria-label="Daha"
              >
                &middot;&middot;&middot;
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    width: 160,
                    background: "#0a0a0a",
                    border: "0.5px solid #1e1e1e",
                    borderRadius: 8,
                    padding: "2px 0",
                    zIndex: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={openRename}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      color: "#888",
                      fontSize: 11,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Yeniden adlandır
                  </button>
                  <button
                    type="button"
                    onClick={exportChat}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      color: "#888",
                      fontSize: 11,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Dışa aktar
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "none",
                      color: "#888",
                      fontSize: 11,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            ref={scRef}
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {empty ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  padding: "24px 24px 80px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 48,
                    color: "#fff",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Miron
                </h1>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontFamily: FONT_SERIF,
                    fontSize: 18,
                    color: "#333",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  Yasal çerçevede sorularınıza yanıt verir.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: narrow ? "1fr" : "1fr 1fr",
                    gap: 10,
                    marginTop: 36,
                    width: "100%",
                    maxWidth: 500,
                  }}
                >
                  {SUGGEST.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => send(s.text)}
                      style={{
                        background: "#0a0a0a",
                        border: "0.5px solid #1e1e1e",
                        borderRadius: 10,
                        padding: "14px 16px",
                        color: "#888",
                        fontFamily: FONT_SANS,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#2e2e2e";
                        const h = e.currentTarget.querySelector(".miron-sugg-title");
                        if (h) h.style.color = "#aaa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1e1e1e";
                        const h = e.currentTarget.querySelector(".miron-sugg-title");
                        if (h) h.style.color = "#777";
                      }}
                    >
                      <div
                        className="miron-sugg-title"
                        style={{ fontSize: 13, fontWeight: 500, color: "#777" }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 4 }}>{s.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  margin: "0 auto",
                  width: "100%",
                  maxWidth: 720,
                  padding: "16px 24px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 32,
                }}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      width: "100%",
                      justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {m.sender === "user" ? (
                      <div
                        style={{
                          maxWidth: 480,
                          background: "#0d0d0d",
                          border: "0.5px solid #1e1e1e",
                          borderRadius: 12,
                          padding: "12px 16px",
                          color: "#cccccc",
                          fontSize: 14,
                          lineHeight: 1.7,
                          fontFamily: FONT_SANS,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {m.text}
                      </div>
                    ) : (
                      <div
                        className="miron-msg"
                        style={{
                          maxWidth: 660,
                          color: "#777",
                          fontSize: 14,
                          lineHeight: 1.85,
                          fontFamily: FONT_SERIF,
                          borderLeft: "1px solid #1e1e1e",
                          paddingLeft: 20,
                          marginRight: 20,
                          overflowWrap: "anywhere",
                        }}
                      >
                        <ReactMarkdown components={markdownComponents}>
                          {stripEmojis(m.text)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}

                {streaming && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      className="miron-msg"
                      style={{
                        maxWidth: 660,
                        color: "#777",
                        fontSize: 14,
                        lineHeight: 1.85,
                        fontFamily: FONT_SERIF,
                        borderLeft: "1px solid #1e1e1e",
                        paddingLeft: 20,
                        marginRight: 20,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {cleanedStream ? (
                        <>
                          <ReactMarkdown components={markdownComponents}>
                            {cleanedStream}
                          </ReactMarkdown>
                          <span className="miron-cursor" />
                        </>
                      ) : (
                        <span className="miron-typing-dots" aria-label="Yazıyor">
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              background: "#000",
              borderTop: "0.5px solid #1e1e1e",
              padding: narrow ? "12px 16px" : "16px 32px",
            }}
          >
            <div style={{ maxWidth: 720, width: "100%", margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  background: "#0a0a0a",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 12,
                  padding: "6px 8px",
                  transition: "border-color 150ms ease",
                }}
              >
                <textarea
                  ref={taRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "0px";
                    el.style.height = `${Math.min(180, Math.max(52, el.scrollHeight))}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  onFocus={(e) => {
                    e.target.parentElement.style.borderColor = "#2e2e2e";
                  }}
                  onBlur={(e) => {
                    e.target.parentElement.style.borderColor = "#1e1e1e";
                  }}
                  placeholder="Sorunuzu yazın..."
                  disabled={streaming}
                  style={{
                    flex: 1,
                    minHeight: 52,
                    maxHeight: 180,
                    background: "transparent",
                    color: "#888",
                    fontSize: 14,
                    fontFamily: FONT_SANS,
                    border: "none",
                    padding: "10px 8px",
                    outline: "none",
                    resize: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={streaming || !input.trim()}
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    alignSelf: "flex-end",
                    border: input.trim() ? "none" : "0.5px solid #1e1e1e",
                    borderRadius: 8,
                    background: input.trim() ? "#FFD700" : "#111",
                    color: input.trim() ? "#000" : "#333",
                    marginBottom: 2,
                    cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
                    transition: "all 150ms ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: streaming ? 0.6 : 1,
                  }}
                  aria-label="Gönder"
                >
                  <ArrowUp size={16} color={input.trim() ? "#000" : "#333"} />
                </button>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 10,
                  color: "#1a1a1a",
                  textAlign: "center",
                  fontFamily: FONT_SANS,
                }}
              >
                Yapay zeka hatalı bilgi verebilir. Önemli kararlar öncesi doğruluğu kontrol edin.
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {renameOpen && (
            <motion.div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.45)",
              }}
              onClick={() => setRenameOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 380,
                  background: "#0a0a0a",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <p style={{ margin: 0, color: "#fff", fontSize: 15, fontFamily: FONT_SANS }}>
                  Sohbet adı
                </p>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#000",
                    color: "#fff",
                    border: "0.5px solid #1e1e1e",
                    borderRadius: 6,
                    padding: 8,
                    fontSize: 13,
                    fontFamily: FONT_SANS,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setRenameOpen(false)}
                    style={{
                      border: "0.5px solid #1e1e1e",
                      background: "none",
                      color: "#888",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={doRename}
                    style={{
                      background: "#FFD700",
                      color: "#000",
                      border: "none",
                      fontWeight: 600,
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
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
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.45)",
                padding: 12,
              }}
              onClick={() => setDeleteOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 380,
                  background: "#0a0a0a",
                  border: "0.5px solid #1e1e1e",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <p style={{ margin: 0, color: "#fff", fontSize: 15, fontFamily: FONT_SANS }}>
                  Sohbet silinsin mi?
                </p>
                <p style={{ margin: "4px 0 0", color: "#666", fontSize: 12, fontFamily: FONT_SANS }}>
                  Bu sohbet yerel taslaktan kaldırılır.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    style={{
                      border: "0.5px solid #1e1e1e",
                      background: "none",
                      color: "#888",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={doDelete}
                    style={{
                      background: "#5a1a1a",
                      color: "#f0d0d0",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_SANS,
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
