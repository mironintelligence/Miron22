import { useRef, useState, useEffect, useCallback } from 'react'
import { SectionTag } from './SectionTag'
import { Container } from './Container'
import { Reveal } from './Reveal'

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)

  const animate = useCallback(() => {
    const duration = 1600
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else setCount(target)
    }
    requestAnimationFrame(tick)
  }, [target])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { animate(); observer.disconnect() }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animate])

  return (
    <div ref={ref} className="font-display text-[54px] text-gold mb-3 leading-none">
      {count}{suffix}
    </div>
  )
}

const STATS = [
  { target: 73, suffix: '%', label: 'Daha hızlı analiz' },
  { target: 26, suffix: '', label: 'Katı ROI (ortalama)' },
  { target: 11, suffix: '', label: 'Hukuki hesaplama motoru' },
  { target: 100, suffix: '%', label: 'KVKK uyumlu altyapı' },
]

export function Stats() {
  return (
    <section className="py-[120px] border-t border-border">
      <Container>
        <Reveal>
          <SectionTag text="ÖLÇÜM" />
          <h2 className="font-display text-[clamp(28px,4vw,54px)] leading-[1.15] mb-12">
            Sistem{' '}
            <span className="italic text-gold">ölçülmüş sonuç</span>
            {' '}üretir.
          </h2>
        </Reveal>

      </Container>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-[52px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-border">
          {STATS.map(({ target, suffix, label }) => (
            <div
              key={label}
              className="bg-surface px-7 py-[52px] text-center relative overflow-hidden group
                after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[1px] after:bg-gold
                group-hover:after:w-[80%] after:transition-all after:duration-500"
            >
              <Counter target={target} suffix={suffix} />
              <p className="font-ui text-[11px] tracking-[0.12em] uppercase text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
