import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { authFetch } from "../auth/api";
import { emitToast } from "../utils/toastBus";

export default function LegalAcceptanceModal({ open, pendingDocuments, onResolved }) {
  const [checks, setChecks] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const list = useMemo(() => (Array.isArray(pendingDocuments) ? pendingDocuments : []), [pendingDocuments]);

  useEffect(() => {
    if (!open) return;
    const init = {};
    list.forEach((d) => {
      init[d.type] = false;
    });
    setChecks(init);
  }, [open, list]);

  const allChecked = list.length > 0 && list.every((d) => checks[d.type]);

  const toggle = (t) => {
    setChecks((c) => ({ ...c, [t]: !c[t] }));
  };

  const submit = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    try {
      const types = list.map((d) => d.type);
      const res = await authFetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_types: types }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.detail || "Kabul kaydedilemedi");
      }
      emitToast("Hukuki metinler kabul edildi.", "success");
      onResolved?.();
    } catch (e) {
      emitToast(e?.message || "İşlem başarısız", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || list.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 text-white p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
        <div className="p-5 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-bold text-amber-400">Güncel hukuki metinler</h2>
          <p className="text-sm text-white/60 mt-1">
            Devam etmek için aşağıdaki belgeleri okuyup her biri için onay vermeniz gerekir.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          {list.map((d) => (
            <section key={d.type} className="space-y-3 border border-white/10 rounded-xl p-4 bg-black/40">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white">
                  {d.title} <span className="text-white/50 text-sm">(sürüm {d.version})</span>
                </h3>
                <a
                  className="text-sm text-amber-400 hover:underline shrink-0"
                  href={`/legal/${d.type === "ai_terms" ? "ai-terms" : d.type}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Yeni sekmede aç
                </a>
              </div>
              <div className="max-h-56 overflow-y-auto prose prose-invert prose-sm prose-headings:text-amber-200/90 border border-white/5 rounded-lg p-3 bg-black/30">
                <ReactMarkdown>{d.content || ""}</ReactMarkdown>
              </div>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!checks[d.type]}
                  onChange={() => toggle(d.type)}
                />
                <span>
                  Okudum ve kabul ediyorum — <strong>{d.title}</strong>
                </span>
              </label>
            </section>
          ))}
        </div>
        <div className="p-5 border-t border-white/10 shrink-0">
          <button
            type="button"
            disabled={!allChecked || submitting}
            onClick={submit}
            className="w-full py-3 rounded-xl font-bold bg-amber-500 text-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Kaydediliyor…" : "Onayla ve devam et"}
          </button>
        </div>
      </div>
    </div>
  );
}
