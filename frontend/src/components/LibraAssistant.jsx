import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ArrowUp, Menu, MoreHorizontal, Plus, Settings, X } from "lucide-react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { lawyerDisplayName, trGreeting, groupChatsForSidebar } from "../lib/assistantGreeting.js";
import AssistantMessageContent from "./AssistantMessageContent.jsx";

/* Yanıt tonu: Claude / ChatGPT açık okunabilirlik; modele gönderilen hafif yönerge. */
const ASSISTANT_CONTEXT_HINT = `
[Yanıt biçimi: Cevaplar ChatGPT veya Claude gibi açık ve düzenli olsun. Kısa paragraflar, gerektiğinde numaralı veya madde işaretli listeler, gereksiz süs cümle yok. Kritik terimler ve yasal/önemli noktalar cevabında **markdown kalın (önemli terim)** biçiminde vurgulansın.
Konu: Sadece hukukla sınırlı değil; avukatın günlük iş, iletişim, metin, plan, özet gibi tüm alanlarda aynı netliği uygula.]`;

const SUGGEST = [
  { title: "Dilekçe çerçevesi", sub: "Adım adım", text: "Belirteceğim türde bir dilekçe için madde madden iskelet; varsayımlarımı soru listesiyle sor." },
  { title: "E-posta taslağı", sub: "Profesyonel ton", text: "Aşağıdaki konuya münhasır, kısa, nazik ama sınırları açık bir e-posta taslağı; konu: müvekkile erteleme." },
  { title: "Toplantı maddeleri", sub: "Öncelikli liste", text: "10 dakikada bitecek dava toplantısı için konuşulacaklar listesi, öncelik sıralı, soru cümleleri ayrı." },
  { title: "Araştırma ipuçları", sub: "Emsal / Mevzuat", text: "Bir borçlunun temerrüdü davası için emsal ve mevzuat taramasına nereden başlayayım; 5 anahtar kelime öner." },
];

function trDate() {
  return new Date().toLocaleDateString("tr-TR");
}

function chatTitleFromFirstUserMessage(text) {
  const one = String(text).replace(/\s+/g, " ").trim();
  if (!one) return "Yeni sohbet";
  if (one.length > 48) return `${one.slice(0, 45).trim()}…`;
  return one;
}

const SIDEBAR_W = 264;

export default function LibraAssistant({ caseText: caseTextProp = "" }) {
  const { user } = useAuth();
  const location = useLocation();
  const stateCtx =
    location.state && typeof location.state === "object" && location.state.caseText
      ? String(location.state.caseText)
      : "";
  const mergedContext = [caseTextProp, stateCtx, ASSISTANT_CONTEXT_HINT].filter(Boolean).join("\n\n");

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
    () => typeof window !== "undefined" && window.innerWidth < 1024
  );

  const scRef = useRef(null);
  const taRef = useRef(null);
  const menuRef = useRef(null);
  const streamTimerRef = useRef(null);

  useEffect(() => {
    const f = () => setNarrow(window.innerWidth < 1024);
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

  useEffect(() => {
    const b = document.body;
    const prev = b.style.overflow;
    b.style.overflow = "hidden";
    return () => {
      b.style.overflow = prev;
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
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
  }, [messages.length, loading]);

  const runAssistantTypewriter = (uid, msgId, full) => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    let i = 0;
    const step = 2;
    const tick = 14;
    const run = () => {
      i = Math.min(i + step, full.length);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== uid) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msgId ? { ...m, text: full.slice(0, i), streaming: i < full.length } : m
            ),
          };
        })
      );
      requestAnimationFrame(() => {
        if (scRef.current) {
          scRef.current.scrollTo({ top: scRef.current.scrollHeight, behavior: "auto" });
        }
      });
      if (i < full.length) {
        streamTimerRef.current = setTimeout(run, tick);
      } else {
        streamTimerRef.current = null;
      }
    };
    run();
  };

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
    if (loading) return;
    const t = String(raw || "").trim();
    if (!t) return;
    const uid = current.id;
    const wasEmpty = !(current.messages && current.messages.length);
    const umsg = { id: `u-${Date.now()}`, sender: "user", text: t };
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== uid) return c;
        return {
          ...c,
          ...(wasEmpty ? { name: chatTitleFromFirstUserMessage(t) } : {}),
          messages: [...(c.messages || []), umsg],
        };
      })
    );
    setInput("");
    if (taRef.current) {
      taRef.current.style.height = "52px";
    }
    setLoading(true);
    setSideOpen(false);
    const payload = { message: t, context: mergedContext, chat_id: String(uid) };
    try {
      const data = await postAssistant(payload);
      const text = data?.reply || "Yanıt alınamadı.";
      const msgId = `a-${Date.now()}`;
      setChats((prev) =>
        prev.map((c) =>
          c.id === uid ? { ...c, messages: [...(c.messages || []), { id: msgId, sender: "assistant", text: "", streaming: true }] } : c
        )
      );
      setLoading(false);
      runAssistantTypewriter(uid, msgId, text);
    } catch (e) {
      const errText = `Yanıt alınamadı: ${e?.message || "Bilinmeyen hata"}`;
      setChats((prev) =>
        prev.map((c) =>
          c.id === uid ? { ...c, messages: [...(c.messages || []), { id: `a-${Date.now()}`, sender: "assistant", text: errText, streaming: false }] } : c
        )
      );
      setLoading(false);
    }
  };

  const newChat = () => {
    const n = { id: Date.now(), name: "Yeni sohbet", date: trDate(), createdAt: Date.now(), messages: [] };
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
      const n = { id: Date.now(), name: "Yeni sohbet", date: trDate(), createdAt: Date.now(), messages: [] };
      setChats([n]);
      setCurrentChatId(n.id);
    }
    setDeleteOpen(false);
  };

  const showSidebar = !narrow || sideOpen;

  return (
    <motion.main
      className="z-30 flex w-full max-w-full flex-col overflow-hidden bg-[var(--miron-bg)] font-body"
      style={{ position: "fixed", top: "5rem", left: 0, right: 0, bottom: "5rem" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {narrow && sideOpen && (
            <motion.button
              type="button"
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className="flex min-h-0 flex-col border-r border-[var(--miron-border)]"
          style={{
            width: showSidebar && narrow ? "min(100vw, 20rem)" : !narrow ? SIDEBAR_W : 0,
            minWidth: showSidebar && narrow ? "min(100vw, 20rem)" : !narrow ? SIDEBAR_W : 0,
            flexShrink: 0,
            overflow: narrow && !sideOpen ? "hidden" : "visible",
            position: narrow && sideOpen ? "fixed" : "relative",
            zIndex: narrow && sideOpen ? 50 : 1,
            height: narrow && sideOpen ? "100dvh" : "100%",
            top: 0,
            left: 0,
            maxWidth: narrow && sideOpen ? "min(100vw, 20rem)" : "none",
            background: "rgba(10,10,10,0.95)",
            boxShadow: narrow && sideOpen ? "4px 0 24px rgba(0,0,0,0.5)" : "none",
            transition: narrow ? "min-width 0.2s ease" : "none",
          }}
        >
          {narrow && sideOpen && (
            <button
              type="button"
              className="absolute right-3 top-3 z-[60] flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
              onClick={() => setSideOpen(false)}
              aria-label="Kapat"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}

          <div
            className="box-border flex h-full min-h-0 flex-col gap-0 px-2.5 pb-3 pt-2.5 sm:px-3"
            style={{ width: showSidebar && narrow ? "min(100vw, 20rem)" : !narrow ? SIDEBAR_W : 0, minWidth: "100%" }}
          >
            <div className="min-h-0 flex-1">
              <div className="mb-3">
                <span className="font-heading text-base tracking-tight text-[var(--miron-text)]">
                  Miron <span className="text-[var(--miron-gold)]">AI</span>
                </span>
                <p className="m-0 mt-1.5 text-[0.7rem] leading-tight text-[var(--miron-text-subtle)]">
                  {greeting}, {avukat}
                </p>
              </div>
              <Link
                to="/dashboard/dava-merkezi"
                className="text-muted mb-3 block text-xs no-underline transition hover:text-[var(--miron-gold)]"
                onClick={() => narrow && setSideOpen(false)}
              >
                ← Dava merkezine dön
              </Link>
              <button
                type="button"
                onClick={newChat}
                className="btn-primary mb-2 flex w-full items-center justify-center gap-2 !rounded-xl !px-3 !py-2.5 !text-sm"
              >
                <Plus size={16} strokeWidth={2.2} />
                Yeni sohbet
              </button>
              <input
                className="input !mb-3 !px-2.5 !py-1.5 !text-xs placeholder:text-subtle"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara"
              />
              <p className="text-subtle m-0 mb-1.5 text-[0.6rem] font-medium uppercase tracking-[0.12em]">Sohbetler</p>
              <div className="min-h-0 max-h-[calc(100dvh-18rem)] space-y-3 overflow-y-auto pr-0.5" style={{ WebkitOverflowScrolling: "touch" }}>
                {grouped.map((g, gi) => (
                  <div key={g.key} className="m-0">
                    <p className="text-subtle m-0 text-[0.6rem] font-semibold uppercase tracking-wider" style={{ marginTop: gi === 0 ? 0 : 10 }}>
                      {g.key}
                    </p>
                    <ul className="m-0 mt-1.5 list-none p-0">
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
                              className="w-full cursor-pointer rounded-lg border-0 text-left text-[0.8rem] transition"
                              style={{
                                padding: "0.4rem 0.55rem",
                                color: on ? "var(--miron-text)" : "var(--miron-text-subtle)",
                                background: on ? "rgba(255,255,255,0.06)" : "transparent",
                                boxShadow: on ? "inset 2px 0 0 var(--miron-gold)" : "none",
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
            </div>
            <div
              className="mt-auto flex min-w-0 items-center gap-2 border-t border-[var(--miron-border)] pt-3"
              style={{ flexShrink: 0 }}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold"
                style={{ background: "var(--miron-gold)", color: "#000" }}
              >
                {String(avukat.replace(/^Av\.\s*/i, "") || "A")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-muted m-0 truncate text-xs">{avukat}</p>
              </div>
              <Link to="/settings" className="p-1 text-subtle no-underline hover:text-[var(--miron-gold)]" aria-label="Ayarlar">
                <Settings size={16} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </aside>

        <div
          className="miron-assistant-messages flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ minWidth: 0, background: "var(--miron-bg)" }}
        >
          <header className="flex h-12 shrink-0 items-center border-b border-[var(--miron-border)] bg-black/50 px-2 backdrop-blur-md sm:px-3">
            {narrow && (
              <button
                type="button"
                onClick={() => setSideOpen(true)}
                className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/5"
                aria-label="Menü"
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
            )}
            <div className="min-w-0 flex-1 text-center sm:pl-0">
              <h1
                className="m-0 max-w-full truncate text-center text-sm font-semibold tracking-tight"
                style={{ color: "var(--miron-text)" }}
                title={current?.name}
              >
                {current?.name || "Miron AI"}
              </h1>
              <p className="text-subtle m-0 mt-0.5 line-clamp-1 text-center text-[0.65rem]">
                {empty ? "Yeni sohbet" : `${greeting} · `}
                {avukat}
              </p>
            </div>
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-end" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((m) => !m)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Daha"
              >
                <MoreHorizontal size={20} strokeWidth={1.5} />
              </button>
              {menuOpen && (
                <div
                  className="card absolute right-0 z-20 mt-1.5 w-40 py-0.5 !p-0"
                  style={{ maxWidth: "10rem" }}
                >
                  <button type="button" onClick={openRename} className="w-full text-left text-xs text-white/80 hover:bg-white/5" style={{ padding: "0.4rem 0.65rem" }}>
                    Yeniden adlandır
                  </button>
                  <button type="button" onClick={exportChat} className="w-full text-left text-xs text-white/80 hover:bg-white/5" style={{ padding: "0.4rem 0.65rem" }}>
                    Dışa aktar
                  </button>
                  <button type="button" onClick={onDelete} className="w-full text-left text-xs text-red-200/80 hover:bg-white/5" style={{ padding: "0.4rem 0.65rem" }}>
                    Sil
                  </button>
                </div>
              )}
            </div>
          </header>

          <div ref={scRef} className="min-h-0 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            {empty ? (
              <div className="flex min-h-full flex-col items-center justify-center px-3 py-6 sm:px-6" style={{ paddingBottom: 140 }}>
                <div className="w-full max-w-[42rem] text-center">
                  <h2 className="font-heading m-0 text-2xl text-[var(--miron-text)] sm:text-3xl">Miron</h2>
                  <p className="m-0 mt-1.5 text-base font-medium text-[#FFD700] sm:text-lg">Yapay zekâ asistan</p>
                  <p className="text-muted m-0 mt-6 text-lg font-medium leading-snug sm:text-xl">Size nasıl yardımcı olabilirim?</p>
                  <p className="text-subtle m-0 mt-2 text-sm" style={{ lineHeight: 1.5 }}>
                    Hukuk, taslak, toplantı notu, e-posta veya günlük ofis — sorunuzu yazın, net ve sade yanıt alın.
                  </p>
                </div>
                <div className="mt-8 grid w-full max-w-3xl gap-2.5 sm:grid-cols-2" style={{ gap: "0.6rem" }}>
                  {SUGGEST.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => send(s.text)}
                      className="card w-full !rounded-2xl border border-[var(--miron-border)] text-left !shadow-none transition hover:border-[#FFD700]/35 hover:bg-white/[0.04]"
                      style={{ padding: "0.85rem 1rem" }}
                    >
                      <p className="m-0 text-sm font-medium text-white/90">{s.title}</p>
                      <p className="text-subtle m-0 mt-1 text-xs" style={{ lineHeight: 1.45 }}>
                        {s.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-6 px-3 py-5 sm:px-5 sm:py-6">
                {messages.map((m, i) =>
                  m.sender === "user" ? (
                    <div key={m.id || `msg-${i}`} className="flex w-full justify-end">
                      <div
                        className="max-w-[min(100%,28rem)] rounded-3xl border text-[0.95rem] leading-[1.65] shadow-sm"
                        style={{
                          background: "var(--miron-panel-2)",
                          borderColor: "rgba(255,215,0,0.22)",
                          color: "var(--miron-text)",
                          padding: "0.65rem 1rem 0.75rem",
                        }}
                      >
                        <p className="m-0 whitespace-pre-wrap" style={{ wordBreak: "break-word" }}>
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id || `msg-${i}`} className="flex w-full min-w-0 justify-start gap-2.5 sm:gap-3.5">
                      <div
                        className="mt-0.5 flex h-8 w-8 flex-shrink-0 select-none items-center justify-center self-start rounded-sm text-sm font-bold sm:h-9 sm:w-9"
                        style={{
                          background: "linear-gradient(160deg, #f6e27a, #d4a700)",
                          color: "#111",
                        }}
                        aria-hidden
                      >
                        M
                      </div>
                      <div
                        className="min-w-0 flex-1 pt-0.5 text-sm sm:text-base"
                        style={{ color: "var(--miron-text-muted)" }}
                      >
                        <div className="miron-ai-markdown">
                          <AssistantMessageContent text={m.text || ""} streaming={!!m.streaming} />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div
            className="z-10 w-full border-t border-[var(--miron-border)]"
            style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0.88))" }}
          >
            <div className="mx-auto w-full max-w-3xl px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="miron-ai-composer flex w-full min-w-0 items-end gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
                <textarea
                  ref={taRef}
                  className="min-w-0 flex-1 bg-transparent pl-0.5 text-sm leading-relaxed"
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "0px";
                    el.style.height = `${Math.min(200, Math.max(40, el.scrollHeight))}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Bir mesaj gönderin…"
                  style={{
                    minHeight: 40,
                    maxHeight: 200,
                    color: "var(--miron-text)",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    fontSize: 15,
                  }}
                />
                <button
                  type="button"
                  className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center self-end sm:h-9 sm:w-9"
                  onClick={() => send(input)}
                  disabled={loading}
                  style={{
                    borderRadius: "9999px",
                    background: input.trim() ? "var(--miron-gold)" : "rgba(255,255,255,0.06)",
                    color: input.trim() ? "#000" : "rgba(255,255,255,0.25)",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && input.trim() ? 0.6 : 1,
                  }}
                  aria-label="Gönder"
                >
                  <ArrowUp size={18} strokeWidth={2.2} className="translate-y-[0.5px]" />
                </button>
              </div>
              <p className="text-subtle m-0 py-1.5 text-center text-[0.65rem] sm:text-xs">Miron AI hatalı bilgi verebilir. Önemli adımlarda kendi incelemenizi ekleyin.</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {renameOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-2"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setRenameOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-sm !p-4"
            >
              <p className="m-0 text-sm font-medium text-white">Sohbet adı</p>
              <input
                className="input mt-2.5 w-full"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameOpen(false)}
                  className="btn-secondary !rounded-lg !px-3 !py-1.5 !text-sm"
                >
                  Vazgeç
                </button>
                <button type="button" onClick={doRename} className="btn-primary !rounded-lg !px-3 !py-1.5 !text-sm">
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
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setDeleteOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm !p-4">
              <p className="m-0 text-sm font-medium text-white">Sohbet silinsin mi?</p>
              <p className="text-subtle m-0 mt-1.5 text-xs">Bu sohbet yalnızca bu cihazdaki geçici kayıttan silinir.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="btn-secondary !rounded-lg !px-3 !py-1.5 !text-sm"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={doDelete}
                  className="rounded-lg border border-red-500/50 bg-red-900/30 px-3 py-1.5 text-sm text-red-100"
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
