'use client'

import { Check } from 'lucide-react'
import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

const FEATURES = [
  'Sınırsız kullanıcı (büro genelinde)',
  '10 modülün tamamı, sınırsız kullanım',
  'Sınırsız dosya ve analiz hakkı',
  'Yargıtay & Danıştay emsal tarama',
  '11 hukuki hesaplama motoru',
  'Strateji motoru ve dava simülasyonu',
  'Özel onboarding ve eğitim (2 hafta)',
  'Haftalık 1:1 strateji oturumu',
]

export function Pricing() {
  return (
    <section id="yatirim" className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag num="15" text="YATIRIM" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Bu bir abonelik değil.
            <br />
            <span className="italic text-gold">Rekabet bariyeri</span>.
          </h2>
          <p className="font-ui font-light text-[14px] text-muted max-w-[580px] mb-12">
            Rakiplerinizden ayrılmak, rakiplerinizin satın alamayacağı disiplini edinmekten başlar.
          </p>
        </Reveal>

        {/* Urgency strip */}
        <Reveal delay={0.1}>
          <div className="max-w-[580px] mx-auto bg-danger/5 border border-danger/30 px-5 py-3 text-center mb-4">
            <p className="font-ui text-[11px] tracking-[0.18em] uppercase text-danger">
              SINIRLI SÜRE · SADECE BU AY
            </p>
          </div>
        </Reveal>

        {/* Pricing card */}
        <Reveal delay={0.15}>
          <div className="max-w-[580px] mx-auto bg-surface border border-border p-12 relative">

            {/* Top gold gradient */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}
            />

            {/* Badge */}
            <div className="inline-block px-3 py-1 bg-gold/10 border border-gold/30 text-gold font-ui text-[10px] tracking-[0.2em] uppercase mb-6">
              KURUCU FİYAT
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-display text-[28px] text-muted line-through opacity-60">
                24.000₺
              </span>
              <span className="font-display text-[64px] text-text leading-none">12.000</span>
              <span className="font-ui text-[18px] text-muted">₺</span>
              <span className="font-ui text-[14px] text-muted">/ ay</span>
            </div>
            <p className="font-ui text-[11px] text-muted mb-6">KDV dahil. Tek paket, taahhütsüz.</p>

            {/* Critical advantage */}
            <div className="p-4 border border-gold/30 bg-gold/5 mb-8">
              <p className="font-ui text-[12px] text-text leading-relaxed">
                <span className="text-gold font-medium">
                  Bu fiyatı bu ay kilitleyenler, fiyat 24.000₺'ye çıktığında da 12.000₺ ödemeye devam eder.
                </span>{' '}
                Ömür boyu kurucu fiyat.
              </p>
            </div>

            <div className="border-t border-border mb-7" />

            {/* ROI summary */}
            <div className="grid grid-cols-2 gap-[1px] bg-border mb-8">
              <div className="bg-surface-2 p-4">
                <p className="font-ui text-[10px] tracking-[0.2em] uppercase text-muted mb-2">
                  AYLIK YATIRIM
                </p>
                <p className="font-display text-[28px] text-text">12.000₺</p>
              </div>
              <div className="bg-surface-2 p-4">
                <p className="font-ui text-[10px] tracking-[0.2em] uppercase text-gold mb-2">
                  AYLIK GERİ DÖNÜŞ
                </p>
                <p className="font-display text-[28px] text-gold">320.000₺</p>
              </div>
            </div>

            {/* Features */}
            <p className="font-ui text-[11px] tracking-[0.2em] uppercase text-gold mb-5">
              TÜM ÖZELLİKLER DAHİL
            </p>
            <ul className="flex flex-col mb-10">
              {FEATURES.map((f) => (
                <li key={f} className="flex gap-3 items-start py-2">
                  <Check size={14} className="text-gold shrink-0 mt-0.5" />
                  <span className="font-ui text-[13px] text-text-soft">{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="#basvur"
              className="block w-full bg-gold text-bg py-4 font-ui text-[11px] tracking-[0.18em] uppercase font-medium text-center hover:opacity-85 transition-opacity"
            >
              Kurucu fiyatı kilitle →
            </a>
          </div>
        </Reveal>

        {/* Footnote */}
        <Reveal delay={0.2}>
          <p className="max-w-[580px] mx-auto mt-8 text-center font-ui text-[11px] text-muted leading-relaxed">
            Her başvuru değerlendirilir. Kabul oranı %22. Kabul edilmeyen bürolara
            başvuru süreci boyunca ücret alınmaz.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
