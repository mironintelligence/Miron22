interface SectionTagProps {
  num: string
  text: string
  center?: boolean
}

export function SectionTag({ num, text, center }: SectionTagProps) {
  return (
    <div
      className={`font-ui text-[11px] tracking-[0.3em] uppercase text-gold mb-6 ${
        center ? 'text-center' : ''
      }`}
    >
      {num} — {text}
    </div>
  )
}
