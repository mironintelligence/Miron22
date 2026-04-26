export function Footer() {
  return (
    <footer className="border-t border-border py-8 px-6 lg:px-[52px] flex flex-wrap justify-between items-center gap-4">
      <span className="font-sub font-bold text-[16px] tracking-[0.06em] text-text">
        Miron<span className="text-gold">.</span>
      </span>
      <span className="font-ui text-[11px] tracking-[0.1em] text-muted">
        &copy; 2026 Miron AI
      </span>
      <div className="flex items-center gap-4 font-ui text-[11px] text-muted">
        <a href="/kvkk" className="hover:text-text transition-colors duration-200">KVKK</a>
        <span className="text-muted-2">·</span>
        <a href="/gizlilik" className="hover:text-text transition-colors duration-200">Gizlilik</a>
        <span className="text-muted-2">·</span>
        <a href="/iletisim" className="hover:text-text transition-colors duration-200">İletişim</a>
      </div>
    </footer>
  )
}
