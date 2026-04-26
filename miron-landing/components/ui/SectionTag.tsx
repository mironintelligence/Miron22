interface SectionTagProps {
  text: string
  center?: boolean
  /** @deprecated Numaralar kaldırıldı; geriye dönük uyumluluk için opsiyonel. */
  num?: string
}

export function SectionTag({ text, center, num }: SectionTagProps) {
  const line = num ? `${num} — ${text}` : text
  return (
    <div
      className={`font-ui text-[11px] tracking-[0.3em] uppercase text-gold mb-6 ${
        center ? 'text-center' : ''
      }`}
    >
      {line}
    </div>
  )
}
