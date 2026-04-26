export function SectionTag({ text, center }) {
  return (
    <div className={`font-ui text-[11px] tracking-[0.3em] uppercase text-gold mb-6 ${center ? 'text-center' : ''}`}>
      {text}
    </div>
  )
}
