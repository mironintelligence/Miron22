'use client'

import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

export function Ambition() {
  return (
    <section className="bg-surface border-t border-border py-[120px] text-center">
      <Container>
        <Reveal>
          <SectionTag num="14" text="VİZYON" center />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Bölgesel liderlik{' '}
            <span className="italic text-gold">bir başlangıçtır</span>.
          </h2>
          <p className="font-ui font-light text-[14px] text-muted max-w-[520px] mx-auto mb-12">
            Ulusal ölçekte tanınan bir büro olmak farklı bir disiplin ister. Sistem kuran ekipler, 5 yıl sonra rakiplerini hatırlamaz.
          </p>
        </Reveal>

        <div className="max-w-[480px] mx-auto">
          <Reveal delay={0.15}>
            <p className="font-display italic text-[28px] text-muted">
              En iyi bürolar daha çok çalışmaz.
            </p>
          </Reveal>
          <div className="w-14 h-[1px] bg-border mx-auto my-5" />
          <Reveal delay={0.2}>
            <p className="font-display italic font-light text-[34px] text-text">
              Daha iyi işletir.
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
