import { motion } from 'framer-motion'
import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal, Stagger } from './Reveal'

const STEPS = [
  {
    num: '01',
    title: 'Okur & Anlar',
    desc: 'Her ifade bağlamı içinde çözümlenir. Taraf pozisyonları, yükümlülükler ve niyet birlikte değerlendirilir.',
  },
  {
    num: '02',
    title: 'Doğrular & Ölçer',
    desc: 'Her bulgu Yargıtay ve mevzuatla çapraz kontrol edilir. Sonuç sadece geçerli değil, gerekçeleriyle savunulabilir.',
  },
  {
    num: '03',
    title: 'Sorgular & Test Eder',
    desc: 'İki ayrı mantık süreci çalışır. Biri hüküm kurar, diğeri onu sorgular. Sonuç iç denetimden geçmiş karardır.',
  },
  {
    num: '04',
    title: 'Karar Verir & İzini Bırakır',
    desc: 'Her öneri mantık zincirini açıklar. Kaynaklar şeffaftır, adım adım denetlenebilir.',
  },
]

export function HowItWorks() {
  return (
    <section id="mimari" className="bg-surface border-y border-border py-[120px]">
      <Container>
        <Reveal>
          <SectionTag num="06" text="MİMARİ" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Sistem{' '}
            <span className="italic text-gold">nasıl düşünür?</span>
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Her analiz dört katmandan geçer. Her katman kendi içinde doğrulanır.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <Stagger className="grid grid-cols-1 md:grid-cols-4 gap-[1px] bg-border">
          {STEPS.map(({ num, title, desc }) => (
            <motion.div
              key={num}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
              className="bg-surface px-8 py-11 relative overflow-hidden group hover:bg-surface-3 transition-colors duration-200
                after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-gold
                after:transition-all after:duration-500 group-hover:after:w-full"
            >
              <p className="font-ui text-[10px] tracking-[0.22em] text-gold mb-7">{num}</p>
              <h3 className="font-sub font-bold text-[22px] mb-4 leading-tight">{title}</h3>
              <p className="font-ui text-[13px] text-muted leading-loose">{desc}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
