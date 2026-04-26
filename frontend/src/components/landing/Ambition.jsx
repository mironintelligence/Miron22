import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal } from './Reveal'

export function Ambition() {
  return (
    <section className="bg-surface border-t border-border py-[120px] text-center">
      <Container>
        <Reveal>
          <SectionTag text="VİZYON" center />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4 text-white">
            Bölgesel liderlik <span className="italic text-gold">bir başlangıçtır</span>.
          </h2>
          <p className="font-ui font-light text-[14px] text-muted max-w-[520px] mx-auto mb-12 leading-relaxed">
            Ulusal ölçekte tanınan bir avukat olmak farklı bir disiplin ister. Sistem kuranlar, 5 yıl sonra rakiplerini
            hatırlamaz.
          </p>
        </Reveal>

        <div className="max-w-[480px] mx-auto">
          <Reveal delay={0.15}>
            <p className="font-display italic text-[28px] text-muted">En iyi avukatlar daha çok çalışmaz.</p>
          </Reveal>
          <div className="w-14 h-[1px] bg-border mx-auto my-5" />
          <Reveal delay={0.2}>
            <p className="font-display italic font-light text-[34px] text-white">Daha iyi işletir.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
