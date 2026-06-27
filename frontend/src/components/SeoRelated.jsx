import { Link } from "react-router-dom";

const ALL_PAGES = [
  { href: "/miron-ai-nedir", label: "Miron AI Nedir?", desc: "Ürün ve teknoloji detayları" },
  { href: "/avukat-icin-en-iyi-yapay-zeka", label: "En İyi Hukuk AI", desc: "Araç karşılaştırması 2026" },
  { href: "/chatgpt-mi-miron-ai-mi", label: "ChatGPT vs Miron AI", desc: "Hangi AI avukatlara uygun?" },
  { href: "/hukuk-yapay-zeka", label: "Hukuk Yapay Zekası", desc: "RAG teknolojisi ve avantajları" },
  { href: "/ictihat-arama", label: "İçtihat Arama", desc: "700K+ karar, semantik arama" },
  { href: "/yargitay-karar-arama", label: "Yargıtay Karar Arama", desc: "Emsal araştırması AI ile" },
  { href: "/avukat-yapay-zeka-asistani", label: "Avukat AI Asistanı", desc: "Dilekçe, analiz, hesaplama" },
  { href: "/hukuki-arastirma", label: "Hukuki Araştırma", desc: "AI destekli mevzuat analizi" },
  { href: "/hukuk-burosu-yapay-zeka", label: "Hukuk Bürosu AI", desc: "Büro verimliliği için yapay zeka" },
];

export function SeoRelated({ current, source }) {
  const pages = ALL_PAGES.filter((p) => p.href !== current).slice(0, 6);
  return (
    <div className="mt-20 border-t border-white/10 pt-12">
      <h2 className="text-lg font-bold text-white/70 mb-6 uppercase tracking-wider text-xs">İlgili İçerikler</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {pages.map((p) => (
          <Link key={p.href} to={p.href}
            className="border border-white/10 rounded-lg px-4 py-3 hover:border-yellow-500/40 hover:bg-white/3 transition-all group">
            <p className="text-sm font-semibold text-white group-hover:text-yellow-400 transition-colors">{p.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{p.desc}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-white/30">
        <span>Son güncelleme: Haziran 2026</span>
        {source && <span>· Kaynak: {source}</span>}
        <span>· <Link to="/miron-ai-nedir" className="underline hover:text-white/60">Miron AI hakkında</Link></span>
      </div>
    </div>
  );
}
