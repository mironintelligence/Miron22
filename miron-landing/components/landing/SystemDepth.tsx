'use client'

import { motion } from 'framer-motion'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal, Stagger } from '@/components/ui/Reveal'

const MODULES = [
  { num: '01', name: 'Dosya Analizi & UYAP Uyumlu Format Desteği' },
  { num: '02', name: 'Yargıtay & Danıştay Emsal Tarama' },
  { num: '03', name: 'Mevzuat Analizi & Güncel Takip' },
  { num: '04', name: '11 Farklı Hukuki Hesaplama Motoru' },
  { num: '05', name: 'Dilekçe Üretimi & Şablon Motoru' },
  { num: '06', name: 'Sözleşme Üretimi & Risk Haritası' },
  { num: '07', name: 'Strateji Motoru & Dava Simülasyonu' },
  { num: '08', name: 'Müvekkil Otomasyon Sistemi' },
  { num: '09', name: 'Süre & Duruşma Yönetimi' },
  { num: '10', name: 'Çoklu Dava & Ekip Koordinasyonu' },
]

export function SystemDepth() {
  return (
    <section id="sistem" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag num="05" text="MODÜLLER" />
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
          {MODULES.map(({ num, name }) => (
            <motion.div
              key={num}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
              className="bg-surface px-9 py-7 flex items-center gap-6 hover:bg-surface-3 transition-colors duration-200 group"
            >
              <span className="font-display text-[38px] font-light text-border group-hover:text-gold/35 transition-colors duration-300 leading-none shrink-0">
                {num}
              </span>
              <span className="font-ui text-[13px] text-muted group-hover:text-text transition-colors duration-200">
                {name}
              </span>
            </motion.div>
          ))}
        </Stagger>

        <p className="mt-14 text-center font-sub italic text-[15px] text-muted">
          Ayrı araçlarla çalışan bürolar, birleşik sistem kuranlara kaybediyor.
        </p>
      </div>
    </section>
  )
}
