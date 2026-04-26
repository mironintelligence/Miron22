import { motion } from 'framer-motion'

const WORDS = ['Rakibiniz', 'şu', 'an', 'sizden', 'daha', 'hızlı', 'karar', 'veriyor.']
const GOLD_WORDS = new Set(['karar', 'veriyor.'])

const wordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.6 } },
}

const wordVariant = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const fadeIn = (delay) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
})

export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center text-center relative overflow-hidden">

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,215,0,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,215,0,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at center, black, transparent)',
          maskImage: 'radial-gradient(ellipse 80% 80% at center, black, transparent)',
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none z-0 animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.055), transparent 65%)' }}
      />

      {/* Orbits */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[500px] h-[500px] rounded-full border border-[rgba(255,215,0,0.07)] animate-spin-slow" />
        <div className="absolute w-[720px] h-[720px] rounded-full border border-[rgba(255,215,0,0.04)] animate-spin-reverse" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">

        <motion.p
          {...fadeIn(0.4)}
          className="font-ui text-[11px] tracking-[0.3em] uppercase text-gold"
        >
          MİRON — TÜRKİYE'NİN EN AGRESİF HUKUK BÜROLARININ SİSTEMİ
        </motion.p>

        <motion.h1
          variants={wordContainer}
          initial="hidden"
          animate="show"
          className="font-display text-[clamp(38px,5.5vw,76px)] leading-[1.1] mt-7"
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={i}
              variants={wordVariant}
              className={`inline-block mr-[0.25em] ${GOLD_WORDS.has(word) ? 'italic text-gold' : ''}`}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          {...fadeIn(1.1)}
          className="font-ui font-light text-[clamp(14px,1.5vw,17px)] text-muted max-w-[580px] mx-auto leading-[1.7] mt-7"
        >
          Üst düzey bürolar artık saatlerce dosya okumuyor.
          <br />
          Sistem kurdular. Kazanıyorlar.
        </motion.p>

        <motion.div
          {...fadeIn(1.3)}
          className="border border-border px-[28px] py-[22px] max-w-[620px] mx-auto mt-9"
        >
          <p className="font-ui text-[13px] text-muted leading-relaxed">
            Bu sistem sıradan bürolar için değil.{' '}
            <span className="text-white font-medium">Bölgesinde rakiplerini bıraktırmış</span>
            {' '}ve{' '}
            <span className="text-white font-medium">
              Türkiye'nin üst 100'ü içinde yer almayı hedefleyen
            </span>
            {' '}ekipler için tasarlandı.
          </p>
        </motion.div>

        <motion.div
          {...fadeIn(1.5)}
          className="flex gap-4 justify-center flex-wrap mt-12"
        >
          <a
            href="#uygunluk"
            className="bg-gold text-bg font-ui font-medium text-[11px] tracking-[0.18em] uppercase px-[34px] py-[15px] hover:opacity-85 transition-opacity"
          >
            Uygunluğumu görüntüle →
          </a>
          <a
            href="#sistem"
            className="border border-border text-muted font-ui text-[11px] tracking-[0.18em] uppercase px-[34px] py-[15px] hover:border-white hover:text-white transition-all duration-200"
          >
            Sistemi incele
          </a>
        </motion.div>

      </div>
    </section>
  )
}
