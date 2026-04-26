'use client'

import { motion } from 'framer-motion'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal, Stagger } from '@/components/ui/Reveal'

const MODULES = [
  'Dosya Analizi & resmi mahkeme evrak formatları desteği',
  'Yargıtay & Danıştay Emsal Tarama',
  'Mevzuat Analizi & Güncel Takip',
  '11 Farklı Hukuki Hesaplama Motoru',
  'Dilekçe Üretimi & Şablon Motoru',
  'Sözleşme Üretimi & Risk Haritası',
  'Strateji Motoru & Dava Simülasyonu',
  'Müvekkil Otomasyon Sistemi',
  'Süre & Duruşma Yönetimi',
  'Çoklu Dava & Ekip Koordinasyonu',
]

export function SystemDepth() {
  return (
    <section id="sistem" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag text="MODÜLLER" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            10 ayrı araç yerine{' '}
            <br />
            <span className="italic text-gold">tek sistem</span>.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Dosya açıldığı anda tüm katmanlar devreye girer.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border mt-0">
          {MODULES.map((name) => (
            <motion.div
              key={name}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
              className="bg-surface px-9 py-7 flex items-center gap-4 hover:bg-surface-3 transition-colors duration-200 group"
            >
              <span className="h-8 w-[2px] shrink-0 rounded-full bg-border group-hover:bg-gold/40 transition-colors duration-300" />
              <span className="font-ui text-[13px] text-muted group-hover:text-text transition-colors duration-200">
                {name}
              </span>
            </motion.div>
          ))}
        </Stagger>

        <p className="mt-14 text-center font-sub italic text-[15px] text-muted">
          Ayrı araçlarla çalışanlar, birleşik sistem kuranlara göre yavaş kalıyor.
        </p>
      </div>
    </section>
  )
}
