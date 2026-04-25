'use client'

import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

const CHIPS = [
  'Daha hızlı analiz',
  'Daha net karar',
  'Daha az operasyon',
  'Daha yüksek kontrol',
]

export function Guarantee() {
  return (
    <section className="py-[120px] border-t border-border text-center">
      <Container>
        <Reveal>
          <SectionTag num="16" text="TAAHHÜT" center />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-16">
            30 günde{' '}
            <span className="italic text-gold">fark görmezseniz</span>, tam iade.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="max-w-[720px] mx-auto bg-surface border border-border p-16 relative">
            {/* Top gold gradient */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}
            />

            <h3 className="font-display text-[38px] font-light mb-7">
              30 Gün Koşulsuz Garanti
            </h3>

            <div className="flex flex-wrap gap-3 justify-center my-8">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="font-ui text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 border border-border text-muted"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="border-t border-border pt-7 mt-7">
              <p className="font-ui font-light text-[13px] text-muted leading-loose">
                Bunları ölçülebilir biçimde sağlamazsak:{' '}
                <em className="not-italic text-gold font-medium">tam ücret iadesi</em>
                {' '}veya{' '}
                <em className="not-italic text-gold font-medium">ücretsiz devam</em>.
                <br />
                Taahhüt kağıt üzerinde değil, sözleşmenin içinde.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
