const MARK_CLS =
  'm-0 min-w-0 shrink whitespace-nowrap text-left font-[family-name:var(--font-bebas)] text-[clamp(13px,5.2vw,26px)] uppercase leading-none tracking-[0.04em] text-white'

export function HdWordmark() {
  return (
    <p className={MARK_CLS} aria-label="Hits Different">
      Hits Different
    </p>
  )
}
