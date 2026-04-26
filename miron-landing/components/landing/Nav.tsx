'use client'

import { useState, useEffect } from 'react'

const LINKS = [
  { label: 'Sistem', href: '#sistem' },
  { label: 'Mimari', href: '#mimari' },
  { label: 'Güvenlik', href: '#guvenlik' },
  { label: 'Yatırım', href: '#yatirim' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between py-[18px] px-6 lg:px-[52px] bg-black/85 backdrop-blur-xl border-b transition-colors duration-300 ${
        scrolled ? 'border-border' : 'border-transparent'
      }`}
    >
      <a href="/" className="font-sub font-bold text-[18px] tracking-[0.06em] text-text no-underline">
        Miron<span className="text-gold">.</span>
      </a>

      <div className="hidden lg:flex items-center gap-9">
        {LINKS.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="font-ui text-[11px] tracking-[0.18em] uppercase text-muted hover:text-text transition-colors duration-200"
          >
            {label}
          </a>
        ))}
      </div>

      <a
        href="#uygunluk"
        className="font-ui text-[11px] tracking-[0.18em] uppercase border border-gold/40 text-gold px-[22px] py-2 hover:bg-gold hover:text-bg transition-all duration-200"
      >
        Uygunluk
      </a>
    </nav>
  )
}
