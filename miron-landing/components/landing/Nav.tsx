'use client'

import { useState, useEffect } from 'react'
import { appUrl } from '@/lib/appUrl'
import { LEGAL_PUBLIC_LINKS } from '@/lib/legalPublicLinks'

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
      style={{ maxWidth: '100%' }}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4">
        <a href="/" className="no-underline shrink-0" style={{ textDecoration: 'none' }}>
          <span className="font-sub font-bold text-[18px] tracking-[0.06em] inline-flex items-baseline gap-0">
            <span className="text-text">Miron</span>
            <span className="text-gold">AI</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-6 flex-1 justify-end mr-6">
          <a
            href={appUrl('/about')}
            className="font-ui text-[12px] text-muted hover:text-text transition-colors no-underline"
            style={{ textDecoration: 'none' }}
          >
            Biz Kimiz?
          </a>
          <div className="relative group">
            <button
              type="button"
              className="font-ui flex items-center gap-1 text-[12px] text-muted hover:text-text transition-colors bg-transparent border-0 cursor-pointer p-0"
            >
              Kurumsal
              <span className="text-[9px] opacity-70">▼</span>
            </button>
            <div
              className="absolute left-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] rounded-xl overflow-hidden border border-border bg-[#0a0a0a] py-1 shadow-xl"
            >
              {LEGAL_PUBLIC_LINKS.map(([slug, label]) => (
                <a
                  key={slug}
                  href={appUrl(`/legal/${slug}`)}
                  className="block font-ui text-[11px] text-muted hover:text-text hover:bg-surface-2 px-3.5 py-2 no-underline transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={appUrl('/kaydol')}
            className="hidden sm:inline-flex font-ui font-semibold text-[11px] items-center justify-center no-underline rounded-full px-3.5 py-1.5 bg-gold text-bg hover:opacity-85 transition-opacity"
            style={{ textDecoration: 'none' }}
          >
            Kayıt ol
          </a>
          <a
            href={appUrl('/login')}
            className="font-ui text-[12px] text-muted hover:text-text no-underline transition-colors hidden sm:inline"
            style={{ textDecoration: 'none' }}
          >
            Giriş Yap
          </a>
          <a
            href={appUrl('/kaydol')}
            className="font-ui font-semibold text-[12px] inline-flex items-center justify-center no-underline rounded-lg px-4 py-2 bg-white text-black hover:opacity-88 transition-opacity"
            style={{ textDecoration: 'none' }}
          >
            Kaydol
          </a>
        </div>
      </div>
    </nav>
  )
}
