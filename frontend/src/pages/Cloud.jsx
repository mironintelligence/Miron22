import React, { useEffect, useMemo, useState, useRef } from "react";

const API = "http://127.0.0.1:8000";

// 🔹 Çoklu satın alan kullanıcı örnek listesi (backend’e entegre edilebilir)
const MULTI_USERS = ["kerim.aydemir", "tolga.erdogan", "zekican.boz", "ahmet.kaya"];

export default function Cloud() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);

  // Modals
  const [shareModal, setShareModal] = useState(false);
  const [assistantModal, setAssistantModal] = useState(false);
  const [analysisModal, setAnalysisModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // States
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [notFoundModal, setNotFoundModal] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("libraUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const first = user?.first_name || "";
  const last = user?.last_name || "";
  const usernameKey = `${first.toLowerCase()}.${last.toLowerCase()}`;
  const queryUser = `first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}`;

  // =============================
  // 📂 Dosya Listesi Çekme
  // =============================
  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API}/cloud/list?${queryUser}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchList();
  }, [user]);

  // =============================
  // 🗑️ Silme (Cam efektli onay)
  // =============================
  const openDelete = (filename) => {
    setSelectedFile(filename);
    setDeleteModal(true);
    setMenuOpen(null);
  };

  const confirmDelete = async () => {
    if (!selectedFile) return;
    const res = await fetch(`${API}/cloud/delete/${encodeURIComponent(selectedFile)}?${queryUser}`, { method: "DELETE" });
    setDeleteModal(false);
    setSelectedFile(null);
    if (res.ok) fetchList();
  };

  // =============================
  // ✏️ Yeniden Adlandırma (Cam efektli)
  // =============================
  const openRename = (oldName) => {
    setSelectedFile(oldName);
    setRenameDraft(oldName);
    setRenameModal(true);
    setMenuOpen(null);
  };

  const applyRename = async () => {
    if (!selectedFile) return setRenameModal(false);
    const newName = renameDraft?.trim();
    if (!newName || newName === selectedFile) return setRenameModal(false);
    const url = `${API}/cloud/rename?${queryUser}&old_name=${encodeURIComponent(selectedFile)}&new_name=${encodeURIComponent(newName)}`;
    const res = await fetch(url, { method: "POST" });
    setRenameModal(false);
    setSelectedFile(null);
    if (res.ok) {
      fetchList();
    } else {
      // Hata olursa minimal uyarı
      console.error("Rename failed", await res.text());
    }
  };

  // =============================
  // 💾 Dışa Aktar (indir)
  // =============================
  const handleExport = (filename) => {
    const link = document.createElement("a");
    link.href = `${API}/cloud/download/${encodeURIComponent(filename)}?${queryUser}`;
    link.download = filename;
    link.click();
  };

  // =============================
  // 💬 Libra Assistant’a Sor (popup)
  // =============================
  const handleAskAssistant = async (filename) => {
    setAssistantModal(true);
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch(`${API}/assistant-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: `${usernameKey}_assistant`,
          message: `Bu dosyayı analiz et: ${filename}`,
          context: `Kullanıcı ${usernameKey} dosyası: ${filename}`,
        }),
      });
      const data = await res.json();
      setAiResponse(data.reply || "Yanıt alınamadı.");
    } catch (err) {
      setAiResponse("Hata oluştu: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // =============================
  // 📄 Evrak Analizi (gerçek backend flow)
  // =============================
  const handleAnalyze = async (filename) => {
    setAnalysisModal(true);
    setAiLoading(true);
    setAiResponse("");
    try {
      // Risk analizi (gerçek dosya içeriğiyle)
      const q = `first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(`${API}/risk/analyze-cloud-file?${q}`, { method: "POST" });
      const data = await res.json();

      const txt =
        `📌 Kaynak: ${data.source} ` +
        `\n⚖️ Tür (tahmin): ${data.case_type_guess}` +
        `\n📏 Uzunluk: ${data.length} karakter` +
        `\n\n🧭 Risk Skoru: ${data.risk_score}/100` +
        `\n🏆 Kazanma Olasılığı: %${data.winning_probability}` +
        `\n\n🔍 Öne Çıkan Riskler:\n${(data.key_issues || []).map((x,i)=>`  ${i+1}. ${x}`).join("\n")}` +
        `\n\n✅ Önerilen Aksiyonlar:\n${(data.recommended_actions || []).map((x,i)=>`  ${i+1}. ${x}`).join("\n")}`;

      setAiResponse(txt);
    } catch (err) {
      setAiResponse("Analiz hatası: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // =============================
  // 📤 Libra AI Üzerinden Gönder
  // =============================
  const handleShare = (filename) => {
    setSelectedFile(filename);
    setRecipient("");
    setShareModal(true);
    setMenuOpen(null);
  };

  const handleSend = async () => {
    if (!recipient.trim()) return;
    const key = recipient.trim().toLowerCase().replace(/\s+/g, ".");
    if (!MULTI_USERS.includes(key)) {
      setShareModal(false);
      setNotFoundModal(true);
      return;
    }
    const q = `sender_first=${encodeURIComponent(first)}&sender_last=${encodeURIComponent(last)}&receiver_key=${encodeURIComponent(key)}&filename=${encodeURIComponent(selectedFile)}`;
    const res = await fetch(`${API}/cloud/share?${q}`, { method: "POST" });
    setShareModal(false);
    setRecipient("");
    if (!res.ok) {
      console.error("Share failed");
    }
  };

  // =============================
  // ⬆️ Dosya Yükleme (backend’e bağlı) — alert yok
  // =============================
  const fileInputRef = useRef(null);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChosen = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    form.append("first_name", first);
    form.append("last_name", last);
    try {
      await fetch(`${API}/cloud/upload`, { method: "POST", body: form });
      // Sessizce listeyi güncelle
      fetchList();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      // input temizle ki aynı dosya tekrar seçilirse onChange tetiklensin
      e.target.value = "";
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  if (!user)
    return <div className="text-center py-20 text-gray-400">🔒 Lütfen önce giriş yapın.</div>;

  return (
    <div className="min-h-screen px-8 py-10">
      {/* Üst Menü */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          ☁️ Libra Cloud
        </h2>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChosen}
            accept=".pdf,.docx,.txt,.rtf,.odt"
          />
          <button
            onClick={onPickFile}
            className="cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 backdrop-blur-xl border border-white/10"
          >
            + Dosya Ekle
          </button>
        </div>
      </div>

      {/* Dosya Listesi */}
      {loading ? (
        <p className="text-gray-400 animate-pulse">Dosyalar yükleniyor...</p>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : files.length === 0 ? (
        <p className="text-gray-400">Henüz dosya yok.</p>
      ) : (
        <ul className="space-y-3">
          {files.map((f, i) => (
            <li
              key={i}
              className="relative p-3 rounded-xl border border-white/10 bg-white/5 flex justify-between items-center"
            >
              <div>
                <span>{f.name}</span>
                <span className="ml-3 text-xs text-gray-400">{f.size_kb} KB</span>
              </div>

              <div
                onClick={() => setMenuOpen(menuOpen === i ? null : i)}
                className="cursor-pointer text-xl px-3 hover:text-cyan-400"
              >
                ⋮
              </div>

              {menuOpen === i && (
                <div className="absolute right-10 top-10 z-10 bg-gray-900/80 border border-white/10 rounded-xl p-3 grid grid-cols-2 gap-3 text-sm text-white w-80 shadow-2xl backdrop-blur-2xl">
                  {/* Sol taraf */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openDelete(f.name)}
                      className="hover:text-red-400 text-left"
                    >
                      🗑️ Sil
                    </button>
                    <button
                      onClick={() => openRename(f.name)}
                      className="hover:text-yellow-400 text-left"
                    >
                      ✏️ Yeniden Adlandır
                    </button>
                    <button
                      onClick={() => handleExport(f.name)}
                      className="hover:text-blue-400 text-left"
                    >
                      💾 Dışa Aktar (İndir)
                    </button>
                  </div>
                  {/* Sağ taraf */}
                  <div className="flex flex-col gap-2 border-l border-white/10 pl-3">
                    <button
                      onClick={() => handleAnalyze(f.name)}
                      className="hover:text-purple-300 text-left"
                    >
                      📄 Evrak Analizi
                    </button>
                    <button
                      onClick={() => handleAskAssistant(f.name)}
                      className="hover:text-cyan-300 text-left"
                    >
                      
                    </button>
                    <button
                      onClick={() => handleShare(f.name)}
                      className="hover:text-green-400 text-left"
                    >
                      📤 Libra AI Üzerinden Gönder
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* —— Modallar —— */}

      {/* Yeniden Adlandır (Cam efektli) */}
      {renameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-gray-900/85 border border-white/10 rounded-2xl p-6 w-[420px] text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">✏️ Dosyayı Yeniden Adlandır</h3>
            <div className="text-sm text-gray-300 mb-3">
              Eski: <span className="font-semibold">{selectedFile}</span>
            </div>
            <input
              type="text"
              value={renameDraft}
              autoFocus
              onChange={(e) => setRenameDraft(e.target.value)}
              className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setRenameModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={applyRename}
                className="px-4 py-2 rounded bg-gradient-to-r from-yellow-500 to-amber-500 hover:opacity-90"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onayı (Cam efektli) */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-gray-900/85 border border-white/10 rounded-2xl p-6 w-[420px] text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-red-400">🗑️ Silinsin mi?</h3>
            <p className="text-gray-300">
              <span className="font-semibold">{selectedFile}</span> kalıcı olarak silinecek.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded bg-gradient-to-r from-red-500 to-pink-600 hover:opacity-90"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gönderim Modalı */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-gray-900/85 border border-white/10 rounded-2xl p-6 w-[420px] text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">📤 Libra AI Üzerinden Gönder</h3>
            <p className="text-gray-300 mb-3">
              Dosya: <span className="font-semibold">{selectedFile}</span>
            </p>
            <input
              type="text"
              placeholder="Alıcı adı ve soyadı (örn: Zekican Boz)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full p-2 rounded bg-white/10 border border-white/20 text-white mb-5"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShareModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kullanıcı Bulunamadı Modalı */}
      {notFoundModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-gray-900/90 border border-white/10 rounded-xl p-6 w-[420px] text-center text-white shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-2">❌ Kullanıcı Bulunamadı</h3>
            <p className="text-gray-300 mb-3">
              Sadece çoklu satın alımlarda geçerlidir.<br />
              Çoklu satın alan kişilerin arasında yapılır dosya transferi.
            </p>
            <button
              onClick={() => setNotFoundModal(false)}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:opacity-90"
            >
              Tamam
            </button>
          </div>
        </div>
      )}


      {/* Evrak Analizi Popup */}
      {analysisModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-[600px] text-white max-h-[80vh] overflow-y-auto shadow-2xl backdrop-blur-2xl">
            <h3 className="text-lg font-bold mb-3">📄 Evrak Analizi</h3>
            {aiLoading ? (
              <p className="animate-pulse text-gray-400">Analiz ediliyor...</p>
            ) : (
              <pre className="text-gray-300 whitespace-pre-wrap">{aiResponse}</pre>
            )}
            <div className="flex justify-end mt-3">
              <button
                onClick={() => setAnalysisModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
