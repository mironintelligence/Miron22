import { motion } from 'framer-motion'
import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal, Stagger } from './Reveal'

const CARDS = [
  {
    title: 'Uçtan Uca Şifreleme',
    desc: 'Belge platforma ulaştığı anda maskelenir. Sistem mimarisi gereği hiçbir çalışanımız verilerinize erişemez.',
    badges: ['AES-256', 'ZERO-ACCESS', 'E2E'],
  },
  {
    title: 'KVKK Tam Uyum',
    desc: 'Altyapı KVKK standartlarıyla tam uyum içinde. Uyum bağımsız denetçiler tarafından periyodik olarak doğrulanır.',
    badges: ['KVKK', 'DENETİMLİ', 'SERTİFİKALI'],
  },
  {
    title: 'Tamamen bir kasa',
    desc: 'Hiçbir dosya kalıcı kaydedilmez; LLM eğitimi için kullanılmaz. İçerik kısa süreli bellekte tutulur, işlem sonunda silinir.',
    badges: ['ZERO-TRAIN', 'RAM', 'AUTO-DELETE'],
  },
]

const META = [
  { label: 'Sunucu Lokasyonu', value: 'Yalnızca Türkiye' },
  { label: 'Erişim Modeli', value: 'Rol bazlı, denetimli' },
  { label: 'Saklama & eğitim', value: 'Kalıcı kayıt yok; model eğitmez; RAM sonra silinir' },
]

export function Security() {
  return (
    <section id="guvenlik" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag text="GÜVENLİK" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Avukatlık sırrı için{' '}
            <span className="italic text-gold">inşa edildi</span>.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Müvekkil verisi sistemin merkezinde değil. Temelidir.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border">
          {CARDS.map(({ title, desc, badges }) => (
            <motion.div
              key={title}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
              className="bg-surface px-10 py-[52px] group hover:bg-surface-3 transition-colors duration-200"
            >
              <h3 className="font-sub font-bold text-[14px] mb-4 text-white">{title}</h3>
              <p className="font-ui text-[13px] text-muted leading-relaxed mb-5">{desc}</p>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span key={b} className="font-ui text-[10px] tracking-[0.14em] uppercase px-2.5 py-1 border border-border text-muted">
                    {b}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </Stagger>

        <div className="mt-[2px] grid grid-cols-1 md:grid-cols-3 border border-border">
          {META.map(({ label, value }, i) => (
            <div
              key={label}
              className={`p-7 text-center ${i < META.length - 1 ? 'border-b md:border-b-0 md:border-r border-border' : ''}`}
            >
              <p className="font-ui text-[10px] tracking-[0.2em] uppercase text-muted">{label}</p>
              <p className="font-ui text-[14px] text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
