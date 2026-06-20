import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal } from './Reveal'
import { ShieldCheck, Lock, Server, FileCheck } from 'lucide-react'

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'KVKK & GDPR Uyumlu',
    desc: "Tüm veriler Türkiye'de şifrelenmiş sunucularda işlenir. Kişisel veri yükümlülüklerini tamamen karşılar.",
  },
  {
    icon: Lock,
    title: 'Uçtan Uca Şifreleme',
    desc: 'Belgeler ve müvekkil bilgileri aktarım ve depolamada şifrelenmiş kalır. Üçüncü tarafla paylaşım yapılmaz.',
  },
  {
    icon: Server,
    title: '%99,9 Çalışma Süresi',
    desc: 'Kurumsal altyapı, çoklu yedek sunucu ve otomatik hata kurtarma. Duruş süresi sıfıra yakın.',
  },
  {
    icon: FileCheck,
    title: 'Rol Tabanlı Erişim',
    desc: 'Her kullanıcı yalnızca yetkili olduğu verilere ulaşır. İzin hiyerarşisi ve erişim günlükleri dahil.',
  },
]

export function Guarantee() {
  return (
    <section className="py-[120px] border-t border-border text-center">
      <Container>
        <Reveal>
          <SectionTag text="GÜVENLİK" center />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-4 text-white">
            Verileriniz{' '}
            <span className="italic text-gold">kasanızda kalır</span>.
          </h2>
          <p className="font-ui text-[14px] text-muted max-w-[560px] mx-auto leading-relaxed">
            Miron AI, hukuki verilerin hassasiyetini bilerek inşa edildi. Güvenlik bir özellik değil, sistemin temelidir.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="max-w-[860px] mx-auto mt-16 bg-surface border border-border p-12 relative">
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {TRUST_ITEMS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="shrink-0 mt-0.5">
                    <Icon size={18} className="text-gold" />
                  </div>
                  <div>
                    <h3 className="font-ui text-[13px] font-semibold text-white mb-1 tracking-wide">{title}</h3>
                    <p className="font-ui text-[12px] text-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-3 justify-center">
              {['Argon2id şifreleme', 'JWT + Refresh Token', 'CSRF koruması', 'Rate limiting', 'Audit log'].map((c) => (
                <span
                  key={c}
                  className="font-ui text-[11px] tracking-[0.12em] uppercase px-5 py-2.5 border border-border text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
