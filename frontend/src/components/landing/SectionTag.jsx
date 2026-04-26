export function SectionTag({ num, text, center }) {
  const label = num != null && num !== '' ? `${num} — ${text}` : text
  return (
    <div className={`font-ui text-[11px] tracking-[0.3em] uppercase text-gold mb-6 ${center ? 'text-center' : ''}`}>
      {label}
    </div>
  )
}
