'use client'

import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

export function EliteClub() {
  return (
    <section id="uygunluk" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag text="SEÇİM" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Bu sistem{' '}
            <span className="italic text-gold">herkese açık değil</span>.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[540px] mb-14">
            Yoğunluğu iyi yönetmeyen yapılar sistemin faydasını sınırlı görür; disiplinli avukatlar ise
            net kazanım görür.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">

          <Reveal variant="l">
            <div className="bg-surface border border-border p-[52px_44px] relative overflow-hidden group hover:border-gold/40 transition-all duration-[350ms] h-full">
              <h3 className="font-sub font-normal text-[22px] mb-5 leading-snug text-text">
                Kendi ofisinde sözü geçen avukatlar
              </h3>
              <p className="font-ui font-light text-[13px] text-muted leading-loose">
                Bölgesinde güvenilir ve düzenli çalışan meslektaşlar. İş yükünü dengelemek ve müvekkile
                süre kazandırmak için sistemi derinlemesine kullanmak isteyenler.
              </p>
            </div>
          </Reveal>

          <Reveal variant="r">
            <div className="bg-surface border border-border p-[52px_44px] relative overflow-hidden group hover:border-gold/40 transition-all duration-[350ms] h-full">
              <h3 className="font-sub font-normal text-[22px] mb-5 leading-snug text-text">
                Ülke çapında görünürlük hedefleyenler
              </h3>
              <p className="font-ui font-light text-[13px] text-muted leading-loose">
                Tek başına veya küçük ekiple ülke genelinde dosya yürüten avukatlar. Disiplin ve tekrar
                edilebilir süreç kurmanın önemini bilenler.
              </p>
            </div>
          </Reveal>

        </div>

        <div className="mt-[2px] bg-surface border border-border p-14 text-center">
          <p className="font-sub italic text-[20px] text-muted">
            Araç kullanmak yeter sanıyorsanız, bu sayfayı kapatın.
          </p>
          <p className="font-display italic font-light text-[clamp(26px,4vw,42px)] text-text mt-4">
            Sistem kurmaya hazır mısınız?
          </p>
        </div>
      </div>
    </section>
  )
}
