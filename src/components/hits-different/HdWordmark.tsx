type HdWordmarkProps = {
  /** Return to setup home (renders as a text button in the top bar). */
  onNavClick: () => void
}

const BTN_CLS =
  'm-0 shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left font-[family-name:var(--font-bebas)] text-[11px] uppercase leading-none tracking-wide text-white'

export function HdWordmark({ onNavClick }: HdWordmarkProps) {
  return (
    <button type="button" className={BTN_CLS} onClick={onNavClick} aria-label="Home">
      Hits
      <br />
      Different
    </button>
  )
}
