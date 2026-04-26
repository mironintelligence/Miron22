import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'
import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal } from './Reveal'

const STATUS = [
  'Dosya okunuyor...',
  'Hukuki bağlam kuruluyor...',
  'Yargıtay taranıyor...',
  'Strateji oluşturuluyor...',
]

const RESULTS = [
  {
    badge: 'KRİTİK',
    badgeClass: 'bg-danger/10 text-danger border border-danger/30',
    title: 'İspat Yükü Dağılımı',
    desc: '3. iddia için mevcut deliller yetersiz. Kritik boşluk.',
    delay: 0,
  },
  {
    badge: 'EMSAL',
    badgeClass: 'bg-gold/10 text-gold border border-gold/30',
    title: 'Yargıtay 11. HD 2022/4471',
    desc: 'Tam örtüşen karar. Dilekçeye eklenmeye hazır.',
    delay: 0.32,
  },
  {
    badge: 'STRATEJİ',
    badgeClass: 'bg-[#27ae60]/10 text-[#27ae60] border border-[#27ae60]/30',
    title: 'Pozisyon Yeniden Çerçeveleme',
    desc: 'TCK 388 yerine TBK 49 üzerinden yürütme. Başarı +34 puan.',
    delay: 0.64,
  },
  {
    badge: 'DİKKAT',
    badgeClass: 'bg-muted/10 text-muted border border-muted/20',
    title: 'Zamanaşımı 3 Günde',
    desc: 'Dava 847. günde. Yargıtay sınırı 850 gün.',
    delay: 0.96,
  },
]

export function Demo() {
  const [phase, setPhase] = useState('idle')
  const [statusIdx, setStatusIdx] = useState(0)
  const intervalRef = useRef(null)

  function startSimulation() {
    setPhase('loading')
    setStatusIdx(0)
    intervalRef.current = setInterval(() => {
      setStatusIdx((prev) => Math.min(prev + 1, STATUS.length - 1))
    }, 520)
    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPhase('result')
    }, 2500)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <section id="kanit" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag num="04" text="KANIT" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Sistemi{' '}
            <span className="italic text-gold">çalışırken</span>
            {' '}görün.
          </h2>
          <p className="font-ui text-[15px] text-muted max-w-[520px] mb-16">
            Saatler süren ön analiz, 90 saniyede bitiyor. Bu sadece yüzey katmanı.
          </p>
        </Reveal>

        <Reveal>
          <div className="max-w-[720px] mx-auto bg-surface border border-border overflow-hidden rounded-lg">

            <div className="bg-surface-2 border-b border-border py-3 px-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#cc3333]" />
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span className="w-2 h-2 rounded-full bg-[#27ae60]" />
              <span className="ml-auto font-ui text-[11px] text-muted">Miron — Canlı Analiz</span>
            </div>

            <div className="p-10">

              {phase === 'idle' && (
                <div className="border border-dashed border-border p-11 text-center hover:border-gold transition-colors duration-200 cursor-pointer">
                  <Upload size={24} className="text-muted opacity-30 mx-auto mb-4" />
                  <p className="font-ui text-[13px] text-muted mb-6">
                    Dosya yükleyin veya{' '}
                    <span className="text-gold">simülasyonu başlatın</span>
                  </p>
                  <button
                    onClick={startSimulation}
                    className="bg-gold text-bg font-ui text-[11px] tracking-[0.18em] uppercase font-medium px-7 py-3 hover:opacity-85 transition-opacity"
                  >
                    Simülasyonu Başlat
                  </button>
                </div>
              )}

              {phase === 'loading' && (
                <div>
                  <p className="font-ui text-[11px] tracking-[0.18em] uppercase text-muted mb-3">
                    ANALİZ EDİLİYOR
                  </p>
                  <div className="w-full h-[1px] bg-border relative overflow-hidden">
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '0%' }}
                      transition={{ duration: 2.3, ease: 'easeInOut' }}
                      className="absolute left-0 top-0 h-full w-full bg-gold"
                    />
                  </div>
                  <p className="font-ui text-[12px] text-muted mt-4">
                    {STATUS[statusIdx]}
                  </p>
                </div>
              )}

              {phase === 'result' && (
                <div className="flex flex-col gap-2.5">
                  {RESULTS.map((card) => (
                    <motion.div
                      key={card.badge}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: card.delay, duration: 0.5 }}
                      className="bg-surface-2 border border-border p-4 flex gap-4 items-start"
                    >
                      <span className={`px-2.5 py-1 rounded text-[10px] tracking-[0.14em] uppercase min-w-[80px] text-center font-medium shrink-0 ${card.badgeClass}`}>
                        {card.badge}
                      </span>
                      <div>
                        <p className="font-sub font-bold text-[14px] text-white mb-1">{card.title}</p>
                        <p className="font-ui text-[13px] text-muted">{card.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                  <p className="font-sub italic text-[16px] text-muted text-center mt-7">
                    Bu yüzey katmanı. Strateji motoru çok daha derinde çalışır.
                  </p>
                </div>
              )}

            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
