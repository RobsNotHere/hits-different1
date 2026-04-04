import { cn } from '@/lib/cn'

type HdWordmarkProps = {
  /** Compact two-line mark aligned with top-bar nav copy (`11px` mono). */
  variant?: 'default' | 'nav'
  /** When set with `variant="nav"`, renders as a button (e.g. return to setup home). */
  onNavClick?: () => void
}

export function HdWordmark({ variant = 'default', onNavClick }: HdWordmarkProps) {
  const className = cn(
    'm-0 shrink-0 font-[family-name:var(--font-bebas)] uppercase leading-none tracking-wide text-white',
    variant === 'nav'
      ? 'text-[11px]'
      : 'text-[clamp(1.35rem,4vw,2.125rem)] leading-[0.88]',
    variant === 'nav' && onNavClick && 'cursor-pointer',
  )

  const inner = (
    <>
      Hits
      <br />
      Different
    </>
  )

  if (variant === 'nav' && onNavClick) {
    return (
      <button
        type="button"
        className={cn(className, 'border-0 bg-transparent p-0 text-left')}
        onClick={onNavClick}
        aria-label="Home"
      >
        {inner}
      </button>
    )
  }

  return <p className={className}>{inner}</p>
}
