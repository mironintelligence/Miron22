import { LandingLogo } from './LandingLogo'

export function LandingFooter() {
  return (
    <footer className="border-t border-border py-8 px-6 lg:px-[52px] flex flex-wrap justify-between items-center gap-4">
      <LandingLogo size="sm" />
      <span className="font-ui text-[11px] tracking-[0.1em] text-muted">
        &copy; 2026 Miron AI
      </span>
      <div className="flex items-center gap-4 font-ui text-[11px] text-muted">
        <a href="/legal/kvkk" className="hover:text-white transition-colors duration-200">KVKK</a>
        <span className="text-white/25">·</span>
        <a href="/legal/privacy" className="hover:text-white transition-colors duration-200">Gizlilik</a>
        <span className="text-white/25">·</span>
        <a href="/about" className="hover:text-white transition-colors duration-200">İletişim</a>
      </div>
    </footer>
  )
}
