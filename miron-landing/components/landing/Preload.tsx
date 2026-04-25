'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'

const STATUS_LINES = [
  { text: 'Sistem başlatılıyor', delay: 600 },
  { text: 'Modüller yükleniyor', delay: 1400 },
  { text: 'Hazır', delay: 2200 },
]

export function Preload() {
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setVisible(false), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#070707] flex flex-col items-center justify-center gap-6 transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Logo size="lg" withText={false} />
      </motion.div>

      <div className="flex flex-col items-center gap-2 mt-2">
        {STATUS_LINES.map((line, i) => (
          <div
            key={line.text}
            className={`font-ui text-[11px] tracking-[0.3em] uppercase text-muted transition-all duration-500 ${
              phase > i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[10px]'
            }`}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="mt-6 w-[100px] h-[1px] bg-border relative overflow-hidden">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '0%' }}
          transition={{ duration: 1.8, delay: 0.4, ease: 'easeInOut' }}
          className="absolute top-0 left-0 h-full w-full bg-gold"
        />
      </div>
    </div>
  )
}
