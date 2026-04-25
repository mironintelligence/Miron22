'use client'

import { motion } from 'framer-motion'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

const MESSAGES = [
  {
    side: 'right',
    label: null,
    labelClass: '',
    text: 'Bu davada en kritik risk nerede?',
    bgClass: 'bg-gold/10 border border-gold/20',
    delay: 0.3,
  },
  {
    side: 'left',
    label: 'Risk: Yüksek',
    labelClass: 'text-gold',
    text: 'İspat yükünde kritik zayıflık. Karşı tarafın 3. iddiası mevcut delil setiyle karşılanmıyor.',
    bgClass: 'bg-surface-3 border border-border',
    delay: 1.05,
  },
  {
    side: 'left',
    label: 'Alternatif Strateji',
    labelClass: 'text-gold',
    text: 'Yargıtay 11. HD 2022/4471 baz alınarak pozisyon yeniden çerçevelenebilir. Başarı olasılığı +34 puan.',
    bgClass: 'bg-surface-3 border border-border',
    delay: 1.8,
  },
  {
    side: 'left',
    label: 'Önerilen Aksiyon',
    labelClass: 'text-gold',
    text: 'Tanık ifadesi + bilirkişi raporu kombinasyonu. Taslak dilekçe hazır.',
    bgClass: 'bg-surface-3 border border-border',
    delay: 2.55,
  },
]

export function StrategyEngine() {
  return (
    <section className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag num="07" text="STRATEJİ" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Her dosyada{' '}
            <span className="italic text-gold">ikinci bir beyin</span>.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Hızlı olmak yetmez. Daha isabetli olmak gerekir.
          </p>
        </Reveal>

        <Reveal>
          <div className="max-w-[720px] mx-auto bg-surface border border-border rounded-lg overflow-hidden">

            {/* Header */}
            <div className="bg-surface-2 border-b border-border p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/10 border border-gold rounded-full flex items-center justify-center">
                <span className="font-display text-[14px] text-gold">M</span>
              </div>
              <span className="font-ui text-[13px] text-text">Miron — Strateji Motoru</span>
              <span className="ml-auto font-ui text-[11px] text-[#27ae60]">● Aktif</span>
            </div>

            {/* Messages */}
            <div className="p-7 flex flex-col gap-5">
              {MESSAGES.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: msg.delay, duration: 0.5 }}
                  className={`max-w-[85%] rounded-lg p-4 ${msg.bgClass} ${
                    msg.side === 'right' ? 'self-end' : 'self-start'
                  }`}
                >
                  {msg.label && (
                    <p className={`font-sub font-bold text-[13px] mb-2 ${msg.labelClass}`}>
                      {msg.label}
                    </p>
                  )}
                  <p className="font-ui text-[13px] text-muted leading-relaxed">{msg.text}</p>
                </motion.div>
              ))}
            </div>

          </div>
        </Reveal>
      </Container>
    </section>
  )
}
