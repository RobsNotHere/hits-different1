import { cn } from '@/lib/cn'

/** Top bar: Spotify / History text buttons */
export const HD_TOP_BAR_BTN =
  'cursor-pointer border-0 bg-transparent font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-white'

/** Right column: preview + live timer stage (shared shell). */
export const HD_TIMER_STAGE_COLUMN =
  'relative flex min-h-[38svh] flex-1 flex-col items-center justify-center overflow-hidden bg-hd-bg pb-[max(1rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:flex-none lg:pb-0'

/** Bottom caption under dots on timer stage columns. */
export const HD_STAGE_FOOTER_LABEL =
  'absolute bottom-[22px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/20'

export function hdMainGridShellClass(
  mode: 'setup' | 'session',
  view: 'setup' | 'session',
): string {
  const active = view === mode
  return cn(
    mode === 'setup' ? 'z-0' : 'z-[1]',
    'flex flex-col lg:absolute lg:inset-0 lg:grid lg:min-h-0 lg:grid-cols-[1fr_160px_1fr]',
    active
      ? 'opacity-100'
      : 'pointer-events-none opacity-0 max-lg:hidden lg:pointer-events-none',
  )
}
