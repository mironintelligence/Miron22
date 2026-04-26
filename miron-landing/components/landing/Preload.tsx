'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'

export function Preload() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 3400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#070707] transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <Logo size="lg" withText={false} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="font-ui text-[11px] tracking-[0.3em] uppercase text-muted"
      >
        Sistem başlatılıyor
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="font-ui text-[11px] tracking-[0.3em] uppercase text-muted"
      >
        Modüller yükleniyor
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.5 }}
        className="font-ui text-[11px] tracking-[0.3em] uppercase text-muted"
      >
        Hazır
      </motion.p>

      <div className="relative mt-6 h-[1px] w-[100px] overflow-hidden bg-border">
        <motion.div
          className="absolute left-0 top-0 h-full w-full bg-gold"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ delay: 2.4, duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
