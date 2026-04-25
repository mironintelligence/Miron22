'use client'

import { useRef, useState, useEffect } from 'react'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { useTypewriter } from '@/lib/useTypewriter'

const SEGMENTS = [
  { text: 'Müvekkiliniz size\nşunun için gelir:', pauseAfter: 350 },
  { text: '\n→  Hız', pauseAfter: 350 },
  { text: '\n→  Netlik', pauseAfter: 350 },
  { text: '\n→  Sonuç', pauseAfter: 600 },
  { text: '\n\nAma siz hâlâ\noperasyonun altında nefes alamıyorsunuz.', pauseAfter: 0 },
]

export function Gap() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const { typed } = useTypewriter({ segments: SEGMENTS, started })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.45 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-surface border-y border-border py-[120px] text-center">
      <Container>
        <SectionTag num="03" text="KIRILMA NOKTASI" center />

        <div
          ref={ref}
          className="min-h-[280px] font-display text-[clamp(26px,3.2vw,44px)] font-light whitespace-pre-line max-w-[720px] mx-auto"
        >
          {typed}
          <span className="inline-block w-[2px] h-[1em] bg-gold ml-1 align-middle animate-blink" />
        </div>

        <div className="inline-block border border-border px-7 py-3 mt-16">
          <p className="font-ui text-[13px] text-muted">
            Bu{' '}
            <span className="text-text font-medium">yetkinlik</span>
            {' '}değil.{' '}
            <span className="text-text font-medium">Sistem</span>
            {' '}eksikliğidir.
          </p>
        </div>
      </Container>
    </section>
  )
}
