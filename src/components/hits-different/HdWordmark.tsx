import { cn } from '@/lib/cn'
import { HD_NAV_TEXT } from '@/lib/hits-different/hdUiClasses'

type HdWordmarkProps = {
  onClick: () => void
}

export function HdWordmark({ onClick }: HdWordmarkProps) {
  return (
    <button
      type="button"
      className={cn(
        'm-0 min-w-0 shrink cursor-pointer border-0 bg-transparent p-0 text-left',
        HD_NAV_TEXT,
        'rounded-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
      )}
      aria-label="Hits Different — reset session"
      onClick={onClick}
    >
      <span className="block text-white">Hits</span>
      <span className="block text-white">Different</span>
    </button>
  )
}
