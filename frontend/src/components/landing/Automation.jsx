import { motion } from 'framer-motion'
import { FileText, ScrollText, AlertTriangle, Shield } from 'lucide-react'
import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal, Stagger } from './Reveal'

const CARDS = [
  {
    Icon: FileText,
    title: 'Dilekçeler saniyelerde',
    desc: 'Dosya bilgileri girildi mi, içtihat destekli taslak hazır. Şablon değil, davaya özel içerik.',
  },
  {
    Icon: ScrollText,
    title: 'Sözleşmeler otomatik',
    desc: 'Standart maddeler üretilir, riskler ve boşluklar işaretlenir. Okumadan değil, analiz ederek.',
  },
  {
    Icon: AlertTriangle,
    title: 'Kritik risk haritası',
    desc: 'Herhangi bir belgede risk, yükümlülük ve kritik tarih tek ekranda.',
  },
  {
    Icon: Shield,
    title: 'Tamamen bir kasa',
    desc: 'Hiçbir dosya kalıcı kaydedilmez; LLM eğitimi için kullanılmaz. İçerik kısa süreli bellekte tutulur, işlem sonunda silinir.',
  },
]

export function Automation() {
  return (
    <section className="bg-surface border-y border-border py-[120px]">
      <Container>
        <Reveal>
          <SectionTag text="OTOMASYON" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Operasyon avukatı yavaşlatmamalı.
            <br />
            <span className="italic text-gold">Sistem onu yok eder.</span>
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Siz üretmiyorsunuz. Yön veriyorsunuz.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border">
          {CARDS.map(({ Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
              }}
              className="bg-surface p-11 relative overflow-hidden group hover:bg-surface-3 transition-colors duration-200
                after:content-[''] after:w-[2px] after:h-0 after:bg-gold after:absolute after:left-0 after:top-0
                group-hover:after:h-full after:transition-all after:duration-[450ms]"
            >
              <Icon size={20} className="text-muted opacity-50 mb-5" />
              <h3 className="font-sub font-bold text-[15px] mb-2 text-white">{title}</h3>
              <p className="font-ui text-[13px] text-muted leading-loose">{desc}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
