import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ArrowUp, Menu, MoreHorizontal, Plus, Settings, X } from "lucide-react";
import { authFetch } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { lawyerDisplayName, trGreeting, groupChatsForSidebar } from "../lib/assistantGreeting.js";
import AssistantMessageContent from "./AssistantMessageContent.jsx";

/* Sistem yönergesi: üretim sohbet asistanı (Claude/ChatGPT seviyesi) */
const ASSISTANT_CONTEXT_HINT = `
[Sen, Miron AI adlı üretim sohbet asistanısın. Davranış: ChatGPT ve Claude gibi doğal, sakin, net; robotik kalıp ve fazla tekrar yok. Okunabilirlik: kısa paragraflar, boş satırla nefes, gerekirse maddeler ve numaralar. Önce doğrudan cevap, sonra ayrıntı. Önemli hukuki/teknik/anahtar kavramları cevabında **markdown kalın** ile vurgula. Gerekirse kısa bir "Özet" veya "Dikkat" cümlesi ekle. Türkçe dilbilgisine dikkat et, resmi ama anlaşılır üslup. Konu sadece hukuk değil; ofis, metin, plan, müvekkil iletişimi ve günlük iş de dahil. Bilmediğini söyle, uydurma. Her cevabı tam ve bitmiş tut.]`;

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

const SIDEBAR_W = 280;

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

  useEffect(
    () => () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    },
    []
  );

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
    const run = () => {
      i = Math.min(i + 1, full.length);
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
        const d = 16 + (Math.random() * 24 | 0);
        streamTimerRef.current = setTimeout(run, d);
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
      className="miron-chatgpt-shell fixed inset-0 z-[70] flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col bg-[#0f0f0f] text-[#ececec]"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className="flex min-h-0 w-full min-w-0 flex-1 overflow-hidden"
        style={{ minHeight: 0, maxHeight: "100%" }}
      >
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
          className="flex min-h-0 flex-col"
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
            background: "var(--chat-sidebar)",
            borderRight: "1px solid var(--chat-hairline)",
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
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] py-2.5 text-sm font-medium text-white/90 transition hover:border-[#FFD700]/45 hover:bg-white/[0.08]"
              >
                <Plus size={17} strokeWidth={2.2} className="text-[#FFD700]/90" />
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
          style={{ minWidth: 0, background: "var(--chat-main)" }}
        >
          <header
            className="flex h-11 shrink-0 items-center border-b px-2 sm:h-12 sm:px-3"
            style={{ borderColor: "var(--chat-hairline)", background: "var(--chat-main)" }}
          >
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
            <div className="min-w-0 flex-1 self-center sm:pl-0">
              <h1
                className="m-0 line-clamp-1 max-w-full truncate text-center text-sm font-semibold tracking-tight"
                style={{ color: "var(--miron-text)" }}
                title={current?.name}
              >
                {current?.name || "Miron AI"}
              </h1>
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

          <div
            ref={scRef}
            className="min-h-0 flex-1 overflow-y-auto [overscroll-behavior:contain]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {empty ? (
              <div className="flex min-h-full flex-col items-center justify-center px-3 py-5 sm:px-8" style={{ paddingBottom: 130 }}>
                <div className="w-full max-w-2xl text-center">
                  <h2 className="m-0 font-heading text-3xl text-white sm:text-4xl">
                    Miron <span className="text-[#FFD700]">AI</span>
                  </h2>
                  <p className="m-0 mt-2 text-sm text-white/45">{greeting}, {avukat}</p>
                  <p className="m-0 mt-10 text-2xl font-medium leading-tight text-white/95 sm:text-3xl">Nasıl yardımcı olabilirim?</p>
                  <p className="m-0 mt-2 text-[15px] text-white/50" style={{ lineHeight: 1.5 }}>
                    Sorunuzu yazın — net, paragraflar halinde, okunaklı cevaplar. Vurgu önemli noktalar.
                  </p>
                </div>
                <div className="mt-10 w-full max-w-3xl grid-cols-1 gap-2.5 sm:grid sm:grid-cols-2" style={{ gap: "0.6rem" }}>
                  {SUGGEST.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => send(s.text)}
                      className="miron-gpt-suggest w-full cursor-pointer p-3.5 text-left"
                    >
                      <p className="m-0 text-sm font-medium text-white/90">{s.title}</p>
                      <p className="m-0 mt-1 text-xs leading-snug text-white/45">{s.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-0 px-3 py-2 sm:px-5 sm:py-4">
                {messages.map((m, i) =>
                  m.sender === "user" ? (
                    <div key={m.id || `msg-${i}`} className="flex w-full justify-end py-3 sm:py-4">
                      <div
                        className="max-w-[min(100%,85%)] rounded-2xl text-[0.95rem] leading-[1.65] sm:max-w-[32rem] sm:rounded-3xl sm:text-[1rem] sm:leading-7"
                        style={{
                          background: "var(--chat-bubble-user)",
                          color: "rgba(255,255,255,0.92)",
                          padding: "0.75rem 1rem 0.85rem",
                        }}
                      >
                        <p className="m-0 whitespace-pre-wrap" style={{ wordBreak: "break-word" }}>
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id || `msg-${i}`} className="group flex w-full min-w-0 border-b border-white/[0.06] py-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="mt-0.5 flex w-full min-w-0 gap-2.5 sm:gap-4">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 select-none items-center justify-center self-start rounded-md text-xs font-extrabold sm:h-8 sm:w-8"
                          style={{
                            background: "linear-gradient(145deg, #f7e17a, #b8860b)",
                            color: "#0a0a0a",
                          }}
                          aria-hidden
                        >
                          M
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5" style={{ color: "var(--miron-text-muted)" }}>
                          <p className="m-0 mb-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-[#FFD700]/90">Miron AI</p>
                          <div className="miron-ai-markdown text-base leading-7 [font-family:var(--font-chat-ui)] sm:text-base">
                            <AssistantMessageContent text={m.text || ""} streaming={!!m.streaming} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="z-10 w-full border-t" style={{ borderColor: "var(--chat-hairline)", background: "var(--chat-main)" }}>
            <div className="mx-auto w-full max-w-3xl px-2.5 py-2.5 sm:px-3 sm:py-3">
              <div className="miron-chatgpt-composer flex w-full min-w-0 items-end gap-2 pl-2.5 pr-1.5 sm:pl-3 sm:pr-2">
                <textarea
                  ref={taRef}
                  className="min-w-0 flex-1 max-h-[200px] min-h-[40px] resize-none border-0 bg-transparent py-2.5 pl-0.5 text-[0.95rem] leading-6 sm:text-base sm:leading-7"
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
                  placeholder="Mesajınızı buraya yazın"
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    outline: "none",
                    fontFamily: "var(--font-chat-ui)",
                  }}
                />
                <button
                  type="button"
                  className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center self-end sm:h-9 sm:w-9"
                  onClick={() => send(input)}
                  disabled={loading}
                  style={{
                    borderRadius: "9999px",
                    background: input.trim() ? "#FFD700" : "rgba(255,255,255,0.08)",
                    color: input.trim() ? "#111" : "rgba(255,255,255,0.2)",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && input.trim() ? 0.6 : 1,
                  }}
                  aria-label="Gönder"
                >
                  <ArrowUp size={18} strokeWidth={2.2} className="translate-y-[0.5px]" />
                </button>
              </div>
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
