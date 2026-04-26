import { Reveal } from './Reveal'

export function Ataturk() {
  return (
    <section className="bg-surface border-y border-border min-h-[55vh] flex items-center justify-center text-center px-6 py-[120px]">
      <Reveal>
        <blockquote className="font-display text-[clamp(22px,3.2vw,42px)] italic max-w-[820px] mx-auto mb-6 leading-[1.55] text-white">
          &ldquo;Hukuk, sırf akıl ve mantığa dayalı eski teorik kurallardan ibaret olmayıp,
          zaman ve mekanın ihtiyacına göre{' '}
          <span className="not-italic text-gold relative inline-block">
            değişir
            <span className="absolute left-0 bottom-0 w-full h-[1px] bg-gold animate-gold-underline" />
          </span>
          .&rdquo;
        </blockquote>
        <p className="font-ui text-[11px] tracking-[0.22em] uppercase text-muted mb-14">— Mustafa Kemal Atatürk</p>
        <p className="font-ui font-light text-[14px] text-muted leading-relaxed max-w-[480px] mx-auto">
          Hukuk değişir. Çalışma biçimi de değişir.
          <br />
          Değişimi erken yakalayanlar 10 yıl sonra sektörü yönetir.
        </p>
      </Reveal>
    </section>
  )
}
