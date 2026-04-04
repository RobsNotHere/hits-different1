import { cn } from '@/lib/cn'

type HdWordmarkProps = {
  /** Compact two-line mark aligned with top-bar nav copy (`11px` mono). */
  variant?: 'default' | 'nav'
}

export function HdWordmark({ variant = 'default' }: HdWordmarkProps) {
  return (
    <p
      className={cn(
        'm-0 shrink-0 font-[family-name:var(--font-bebas)] uppercase leading-none tracking-wide text-white',
        variant === 'nav'
          ? 'text-[11px]'
          : 'text-[clamp(1.35rem,4vw,2.125rem)] leading-[0.88]',
      )}
    >
      Hits
      <br />
      Different
    </p>
  )
}
