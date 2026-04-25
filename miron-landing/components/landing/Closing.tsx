'use client'

import { Reveal } from '@/components/ui/Reveal'
import { Container } from '@/components/ui/Container'

export function Closing() {
  return (
    <section
      id="basvur"
      className="min-h-[80vh] flex items-center justify-center text-center relative overflow-hidden py-[120px] border-t border-border"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at center bottom, rgba(255,215,0,0.055), transparent 70%)',
        }}
      />

      <Container className="relative z-10">
        <Reveal>
          <p className="font-display text-[clamp(26px,3.8vw,50px)] font-light">
            Bazı bürolar önümüzdeki 3 yılda ayrılacak.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="font-display italic font-light text-[clamp(30px,5vw,68px)] text-gold mt-3">
            Bazıları geride kalacak.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="font-sub italic text-[20px] text-muted mt-10 mb-14">
            Soru şu: hangisi siz olacaksınız?
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#yatirim"
              className="bg-gold text-bg font-ui font-medium text-[11px] tracking-[0.18em] uppercase px-[34px] py-[15px] hover:opacity-85 transition-opacity"
            >
              Kurucu fiyatı kilitle →
            </a>
            <a
              href="#sistem"
              className="border border-border text-muted font-ui text-[11px] tracking-[0.18em] uppercase px-[34px] py-[15px] hover:border-text hover:text-text transition-all duration-200"
            >
              Sistemi incele
            </a>
          </div>
          <p className="font-ui text-[11px] tracking-[0.2em] uppercase text-danger mt-14">
            Bu ay için 4 büro kontenjanı kaldı.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
