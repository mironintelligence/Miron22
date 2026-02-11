import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function LibraAssistant({ show = true, onClose, caseText = "" }) {
  const navigate = useNavigate();

  // -----------------------------
  // LocalStorage Keys
  // -----------------------------
  const LS_CHATS = "libraChats";
  const LS_CURRENT = "libraCurrentChatId";

  const trDate = () => new Date().toLocaleDateString("tr-TR");

  const [chats, setChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CHATS) || "[]");
    } catch {
      return [];
    }
  });

  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem(LS_CURRENT);
    return saved ? Number(saved) : null;
  });

  const currentChat = useMemo(
    () => chats.find((c) => c.id === currentChatId) || null,
    [chats, currentChatId]
  );

  useEffect(() => {
    localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (currentChatId) localStorage.setItem(LS_CURRENT, String(currentChatId));
  }, [currentChatId]);

  // -----------------------------
  // UI States
  // -----------------------------
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const chatScrollRef = useRef(null);
  const [showDownButton, setShowDownButton] = useState(false);

  // Menu + Modals
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);

  // -----------------------------
  // Boot: ensure at least 1 chat
  // -----------------------------
  useEffect(() => {
    if (!show) return;

    if (chats.length === 0 || currentChatId === null) {
      const newChat = {
        id: Date.now(),
        name: "Sohbet 1",
        date: trDate(),
        messages: [
          { sender: "assistant", text: "Merhaba! Size nasıl yardımcı olabilirim?" },
        ],
      };
      setChats([newChat]);
      setCurrentChatId(newChat.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // -----------------------------
  // Close outside menu
  // -----------------------------
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -----------------------------
  // Scroll helpers
  // -----------------------------
  const scrollToBottom = (smooth = true) => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(t);
  }, [currentChat?.messages?.length, loading]);

  const onChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    setShowDownButton(!nearBottom);
  };

  // -----------------------------
  // Filter chats
  // -----------------------------
  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const nameHit = (c.name || "").toLowerCase().includes(q);
      const lastText = c.messages?.slice(-1)[0]?.text || "";
      return nameHit || lastText.toLowerCase().includes(q);
    });
  }, [chats, query]);

  // -----------------------------
  // Actions: new / rename / export / delete
  // -----------------------------
  const createChat = () => {
    const nextIndex = chats.length + 1;

    const newChat = {
      id: Date.now(),
      name: `Sohbet ${nextIndex}`,
      date: trDate(),
      messages: [
        { sender: "assistant", text: "Merhaba! Size nasıl yardımcı olabilirim?" },
      ],
    };

    setChats((p) => [newChat, ...p]);
    setCurrentChatId(newChat.id);

    setNameDraft(newChat.name);
    setRenameOpen(true);
    setMenuOpen(false);
  };

  const openRename = () => {
    if (!currentChat) return;
    setNameDraft(currentChat.name || "");
    setRenameOpen(true);
    setMenuOpen(false);
  };

  const doRename = () => {
    if (!currentChat) return;
    const v = nameDraft.trim();
    if (!v) {
      setRenameOpen(false);
      return;
    }
    setChats((prev) =>
      prev.map((c) => (c.id === currentChat.id ? { ...c, name: v } : c))
    );
    setRenameOpen(false);
  };

  const exportChat = () => {
    if (!currentChat) return;

    const content = (currentChat.messages || [])
      .map((m) => `${m.sender === "user" ? "👤" : "🤖"} ${m.text}`)
      .join("\n\n");

    const safeName = (currentChat.name || "Sohbet").replace(/[\\/:*?"<>|]/g, "-");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setMenuOpen(false);
  };

  const openDelete = () => {
    setDeleteOpen(true);
    setMenuOpen(false);
  };

  const doDelete = () => {
    if (!currentChat) return;
    const deletingId = currentChat.id;

    setChats((prev) => prev.filter((c) => c.id !== deletingId));
    setDeleteOpen(false);

    setTimeout(() => {
      const remaining = chats.filter((c) => c.id !== deletingId);
      if (remaining.length > 0) setCurrentChatId(remaining[0].id);
      else createChat();
    }, 0);
  };

  // -----------------------------
  // Backend call: try routes (404 fallback)
  // -----------------------------
  const postAssistant = async (payload) => {
    const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
    const urls = [
      `${base}/assistant-chat`,
      `${base}/assistant/assistant-chat`,
    ];

    let lastErr = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 404) continue;

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail =
            data?.detail
              ? typeof data.detail === "string"
                ? data.detail
                : JSON.stringify(data.detail)
              : data?.reply
              ? String(data.reply)
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

  // -----------------------------
  // Send message
  // -----------------------------
  const sendMessage = async () => {
    if (!currentChat) return;

    const userText = input.trim();
    if (!userText) return;

    const userMsg = { sender: "user", text: userText };

    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChat.id ? { ...c, messages: [...c.messages, userMsg] } : c
      )
    );

    setInput("");
    setLoading(true);

    const payload = {
      message: userText,
      context: caseText || "",
      chat_id: String(currentChat.id), // 422 azaltır
    };

    try {
      const data = await postAssistant(payload);
      const replyText = data?.reply || "⚠️ Yanıt alınamadı.";

      const botMsg = { sender: "assistant", text: replyText };

      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChat.id ? { ...c, messages: [...c.messages, botMsg] } : c
        )
      );
    } catch (e) {
      const botMsg = {
        sender: "assistant",
        text: `⚠️ Yanıt alınamadı: ${e?.message || "Bilinmeyen hata"}`,
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChat.id ? { ...c, messages: [...c.messages, botMsg] } : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Close button
  // -----------------------------
  const closeAssistant = () => {
    if (onClose) onClose();
    else navigate("/home");
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-[96vw] max-w-6xl h-[86vh] md:h-[82vh] rounded-2xl shadow-2xl border border-white/15 overflow-hidden flex bg-white/10 backdrop-blur-2xl"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* SOL PANEL */}
          <div className="w-[320px] min-w-[280px] h-full border-r border-white/10 p-4 bg-white/5 backdrop-blur-2xl flex flex-col">
            <div className="flex gap-2 mb-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                onClick={createChat}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:scale-105 transition"
                title="Yeni sohbet"
              >
                +
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredChats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setCurrentChatId(c.id)}
                  className={`p-3 rounded-xl cursor-pointer transition border ${
                    c.id === currentChatId
                      ? "bg-cyan-500/20 border-cyan-400/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate text-white">{c.name}</span>
                    <span className="text-[11px] text-white/50">{c.date}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1 line-clamp-1">
                    {c.messages?.slice(-1)[0]?.text || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAĞ PANEL */}
          <div className="flex-1 min-w-0 h-full flex flex-col bg-black/10">
            {/* Header */}
            <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="min-w-0">
                <div className="text-cyan-300 font-semibold text-lg truncate">
                  ⚖️ Miron Assistant
                </div>
                <div className="text-xs text-white/50">
                  {currentChat?.date || trDate()}
                </div>
              </div>

              {/* Sağ üst: 3 nokta (solda) + kırmızı kapatma (sağda) */}
              <div className="flex items-center gap-3">
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((s) => !s)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition text-xl leading-none flex items-center justify-center"
                    title="Menü"
                  >
                    ⋮
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-56 rounded-xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <button
                          onClick={openRename}
                          className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                        >
                          ✏️ Yeniden adlandır
                        </button>
                        <button
                          onClick={exportChat}
                          className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                        >
                          📤 Dışa aktar
                        </button>
                        <button
                          onClick={openDelete}
                          className="w-full text-left px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 transition"
                        >
                          🗑 Sil
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={closeAssistant}
                  className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 border border-red-400 shadow"
                  title="Kapat"
                />
              </div>
            </div>

            {/* Messages */}
            <div
              ref={chatScrollRef}
              onScroll={onChatScroll}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3"
            >
              {currentChat?.messages?.map((m, i) => (
                <div
                  key={i}
                  className={`w-full flex min-w-0 ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={[
                      "min-w-0",
                      "max-w-[88%] md:max-w-[72%]",
                      "rounded-2xl px-4 py-3 text-sm",
                      "whitespace-pre-wrap break-words",
                      m.sender === "user"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        : "bg-white/10 text-white border border-white/10",
                    ].join(" ")}
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="w-full flex justify-start min-w-0">
                  <div className="min-w-0 max-w-[88%] md:max-w-[72%] bg-white/10 text-white/70 border border-white/10 rounded-2xl px-4 py-3 text-sm">
                    Asistan yazıyor<span className="ml-2 animate-pulse">...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll down */}
            <AnimatePresence>
              {showDownButton && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => scrollToBottom(true)}
                  className="absolute right-6 bottom-24 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition"
                >
                  ↓
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-5 py-4 border-t border-white/10">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 backdrop-blur-2xl">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-white/40 outline-none px-2"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:scale-[1.02] transition disabled:opacity-60"
                >
                  Gönder
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RENAME MODAL */}
        <AnimatePresence>
          {renameOpen && (
            <motion.div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenameOpen(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-[92%] max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl p-6"
              >
                <div className="text-white font-semibold text-lg">
                  Sohbet Adını Yeniden Adlandır
                </div>
                <div className="text-white/60 text-sm mt-1">Yeni sohbet adı:</div>

                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="mt-4 w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-cyan-400"
                />

                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={() => setRenameOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={doRename}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold"
                  >
                    Kaydet
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE MODAL */}
        <AnimatePresence>
          {deleteOpen && (
            <motion.div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteOpen(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-[92%] max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-2xl p-6"
              >
                <div className="text-white font-semibold text-lg">Sohbeti Sil</div>
                <div className="text-white/70 text-sm mt-2">
                  Bu sohbeti silmek istediğinizden emin misiniz?
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setDeleteOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={doDelete}
                    className="px-4 py-2 rounded-xl bg-red-500/80 border border-red-400/40 text-white hover:bg-red-500 transition"
                  >
                    Sil
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
