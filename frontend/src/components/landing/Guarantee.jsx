import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal } from './Reveal'

const CHIPS = ['Daha hızlı analiz', 'Daha net karar', 'Daha az operasyon', 'Daha yüksek kontrol']

export function Guarantee() {
  return (
    <section className="py-[120px] border-t border-border text-center">
      <Container>
        <Reveal>
          <SectionTag text="TAAHHÜT" center />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4 text-white">
            İlk ayınıza özel:{' '}
            <span className="italic text-gold">30 gün içinde %100 iade</span>.
          </h2>
          <p className="font-ui text-[14px] text-muted max-w-[560px] mx-auto leading-relaxed">
            Bu iade hakkı yalnızca ilk abonelik ayınıza bağlıdır. İkinci ay ve sonrasında koşulsuz iade bulunmaz; devam eden
            dönemlerde yalnızca aboneliğinizi iptal edebilirsiniz.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="max-w-[720px] mx-auto mt-16 bg-surface border border-border p-16 relative text-left md:text-center">
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}
            />

            <h3 className="font-display text-[38px] font-light mb-4 text-white text-center">İlk ay: 30 günlük iade penceresi</h3>
            <p className="font-ui text-[13px] text-muted max-w-[520px] mx-auto mb-8 leading-relaxed text-center">
              Memnun kalmazsanız ilk 30 gün sonunda ücretinizin tamamı iade edilir. Sonraki aylarda aynı koşul geçerli
              değildir; yalnızca dönem iptali mümkündür.
            </p>

            <div className="flex flex-wrap gap-3 justify-center my-8">
              {CHIPS.map((c) => (
                <span
                  key={c}
                  className="font-ui text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 border border-border text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
