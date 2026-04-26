'use client'

import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

const TIMELINE = [
  {
    label: 'Süreler',
    title: 'Otomatik Süre Takibi',
    desc: 'Tüm yasal süreler otomatik hesaplanır. Kritik tarihler önceden uyarılır.',
  },
  {
    label: 'Duruşmalar',
    title: 'Duruşma Takvimi',
    desc: 'Tüm duruşmalar, hazırlık notları ve beklenen gelişmeler tek ekranda.',
  },
  {
    label: 'Belgeler',
    title: 'Belge Zinciri',
    desc: 'Revizyon geçmişi kayıt altında. Hiçbir değişiklik kaybolmaz.',
  },
  {
    label: 'Ekip',
    title: 'Rol Bazlı Erişim',
    desc: 'Stajyerden kıdemli avukata, her kullanıcı yetkisi dahilinde dosyalara erişir.',
  },
]

export function Control() {
  return (
    <section className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag text="KONTROL" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Hız değil,{' '}
            <span className="italic text-gold">hata sıfırı</span>.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Süreler, duruşmalar, belgeler — hiçbiri gözden kaçmıyor.
          </p>
        </Reveal>

        <div className="flex flex-col mt-0">
          {TIMELINE.map(({ label, title, desc }, i) => (
            <Reveal key={label} delay={i * 0.1}>
              <div
                className="py-[30px] border-b border-border first:border-t
                  grid grid-cols-[140px_1fr] gap-9 hover:pl-3.5 transition-all duration-300"
              >
                <span className="font-ui text-[10px] tracking-[0.22em] uppercase text-gold pt-1">
                  {label}
                </span>
                <div>
                  <p className="font-ui text-[14px] text-text mb-1">{title}</p>
                  <p className="font-ui text-[13px] text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
