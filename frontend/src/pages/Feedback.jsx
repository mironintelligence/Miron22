import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Feedback() {
  const API_BASE = useMemo(() => {
    return (
      (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE)) ||
      "http://127.0.0.1:8000"
    );
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    setSending(true);
    try {
      const r = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          meta: { source: "legal-ai-frontend" },
        }),
      });

      let payload = null;
      try {
        payload = await r.json();
      } catch {
        // ignore non-json
      }

      if (!r.ok) {
        const msg =
          (payload && (payload.detail || payload.message)) ||
          `HTTP ${r.status}`;
        throw new Error(msg);
      }

      alert("Feedback gönderildi. Teşekkürler.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert(`Feedback gönderilemedi: ${err?.message || "Bilinmeyen hata"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] to-[#17181b] text-gray-100 pt-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Geri Bildirim
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Hata, öneri veya isteklerini yaz. 
              </p>
            </div>

            <Link
              to="/home"
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition text-sm"
            >
              ← Ana Menü
            </Link>
          </div>

          <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ad Soyad"
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="E-posta"
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Konu"
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mesaj"
              rows={6}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />

            <button
              type="submit"
              disabled={sending}
              className="mt-2 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-95 transition disabled:opacity-60"
            >
              {sending ? "Gönderiliyor..." : "Gönder"}
            </button>

            <p className="text-xs text-gray-500 mt-1">
              
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}