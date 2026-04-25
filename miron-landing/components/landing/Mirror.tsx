'use client'

import { motion } from 'framer-motion'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal, Stagger } from '@/components/ui/Reveal'

const WINNERS = [
  'Dosya bir dakikada özetlenir',
  'Kritik noktalar anında işaretlenir',
  'Emsal karar saniyelerde bulunur',
  'Strateji önerisi hazır gelir',
  'Operasyon sistemi çalıştırır, avukat değil',
]

const LOSERS = [
  'Saatlerce dosya inceler',
  'Bilgi parçalı, bağlantı kurulamıyor',
  'Araştırma günler alıyor',
  'Kritik detay gözden kaçıyor',
  'Avukat operasyonun altında eziliyor',
]

export function Mirror() {
  return (
    <section className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag num="02" text="AYNA" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-6">
            Sıradan bürolar dosya okuyor.
            <br />
            Kazanan bürolar{' '}
            <span className="italic text-gold">sistem işletiyor</span>.
          </h2>
          <p className="font-sub italic text-[15px] text-muted max-w-[640px] mb-16">
            Müvekkil size zamanınız için değil, karar kaliteniz için ödeme yapar.
          </p>
        </Reveal>
      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px] bg-border">

          {/* Winners */}
          <Reveal variant="l">
            <div className="bg-surface border-t-2 border-gold p-[48px_44px] h-full">
              <p className="font-ui text-[10px] tracking-[0.28em] uppercase text-gold mb-8">
                SİSTEM KURANLAR
              </p>
              <div className="flex flex-col">
                {WINNERS.map((item) => (
                  <div
                    key={item}
                    className="border-b border-border last:border-0 py-4 flex gap-4 items-start"
                  >
                    <span className="text-gold font-bold shrink-0 mt-[1px]">→</span>
                    <span className="font-ui text-[14px] text-muted">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Losers */}
          <Reveal variant="r">
            <div className="bg-surface border-t-2 border-danger p-[48px_44px] h-full">
              <p className="font-ui text-[10px] tracking-[0.28em] uppercase text-danger mb-8">
                HÂLÂ ELLE ÇALIŞANLAR
              </p>
              <div className="flex flex-col">
                {LOSERS.map((item) => (
                  <div
                    key={item}
                    className="border-b border-border last:border-0 py-4 flex gap-4 items-start"
                  >
                    <span className="text-danger font-bold shrink-0 mt-[1px]">×</span>
                    <span className="font-ui text-[14px] text-muted line-through opacity-60">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

        </div>

        {/* Bottom strip */}
        <div className="mt-[2px] bg-surface border-t border-border p-10 text-center">
          <p className="font-sub italic text-[20px] text-muted">
            Hangi tarafta durmak istediğiniz 18 ayda rakamlara yansır.
          </p>
        </div>
      </div>
    </section>
  )
}
