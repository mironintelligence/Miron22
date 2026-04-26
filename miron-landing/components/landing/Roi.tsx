'use client'

import { SectionTag } from '@/components/ui/SectionTag'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

const BEFORE_ROWS = [
  { label: 'Dosya ön analizi', value: '8 saat/hafta' },
  { label: 'Emsal karar araştırması', value: '6 saat/hafta' },
  { label: 'Dilekçe taslaklama', value: '4 saat/hafta' },
  { label: 'Tekrarlayan operasyon', value: '4 saat/hafta' },
]

const AFTER_ROWS = [
  { label: 'Dosya ön analizi', value: '20 dakika' },
  { label: 'Emsal karar araştırması', value: '15 dakika' },
  { label: 'Dilekçe taslaklama', value: '10 dakika' },
  { label: 'Tekrarlayan operasyon', value: 'Yok' },
]

export function Roi() {
  return (
    <section className="bg-surface border-y border-border py-[120px]">
      <Container>
        <Reveal>
          <SectionTag text="HESAP" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4">
            Zamanınız{' '}
            <span className="italic text-gold">haftada 88.000₺ ediyor</span>.
            <br />
            Ne kadarını operasyona feda ediyorsunuz?
          </h2>
          <p className="font-ui font-light text-[14px] text-muted max-w-[580px] mb-16">
            Kıdemli bir avukatın saati 4.000₺ değerinde iş üretir. Operasyonda harcanan her saat, üretimden
            çalınan paradır. Aşağıdaki tablo örnek bir haftalık dağılımdır; rakamlar varsayımsaldır.
          </p>
        </Reveal>

        <Reveal>
          <div className="max-w-[860px] mx-auto bg-surface border border-border">
            <div className="border-b border-border p-5 flex items-center gap-3">
              <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
              <span className="font-ui text-[11px] tracking-[0.22em] uppercase text-gold">
                ÖRNEK ÇALIŞMA — HAFTALIK ZAMAN ANALİZİ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border">
              <div className="bg-surface p-10">
                <p className="font-ui text-[10px] tracking-[0.28em] uppercase text-danger mb-6">
                  SİSTEM OLMADAN
                </p>
                {BEFORE_ROWS.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center border-b border-border last:border-0 py-4"
                  >
                    <span className="font-ui text-[13px] text-muted">{label}</span>
                    <span className="font-ui text-[14px] text-text font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-3 pt-5 border-t-2 border-danger">
                  <span className="font-sub font-bold text-[13px] text-text">Haftalık kayıp</span>
                  <span className="font-display text-[32px] text-danger">22 saat</span>
                </div>
                <p className="font-ui text-[12px] text-muted mt-3">
                  22 saat × 4.000₺ ={' '}
                  <span className="text-danger font-medium">88.000₺ / hafta</span>
                </p>
              </div>

              <div className="bg-surface p-10">
                <p className="font-ui text-[10px] tracking-[0.28em] uppercase text-gold mb-6">
                  SİSTEM İLE
                </p>
                {AFTER_ROWS.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center border-b border-border last:border-0 py-4"
                  >
                    <span className="font-ui text-[13px] text-muted">{label}</span>
                    <span className="font-ui text-[14px] text-gold font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-3 pt-5 border-t-2 border-gold">
                  <span className="font-sub font-bold text-[13px] text-text">Haftalık kurtarılan zaman</span>
                  <span className="font-display text-[32px] text-gold">20+ saat</span>
                </div>
                <p className="font-ui text-[12px] text-muted mt-3">
                  Bu süre müvekkil işine, stratejiye ve dinlenmeye geri döner.
                </p>
              </div>
            </div>

            <div className="border-t border-border bg-surface-2 p-7 text-center">
              <p className="font-sub italic text-[16px] text-muted leading-relaxed">
                Sistem yatırımı{' '}
                <span className="not-italic text-gold font-semibold text-text">12.000₺/ay</span>
                {' '}ile haftalık kurtarılan onlarca saat, doğrudan üretkenliğe döner.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
