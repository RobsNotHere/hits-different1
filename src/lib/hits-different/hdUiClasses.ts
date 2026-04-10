import { cn } from '@/lib/cn'

/** Top bar: Session log + Spotify (identical type sizing; resets button UA styles). */
export const HD_TOP_BAR_BTN =
  'inline-flex min-h-0 cursor-pointer items-center border-0 bg-transparent p-0 align-middle font-[family-name:var(--font-space-mono)] text-[12px] font-normal leading-none tracking-wide text-white whitespace-nowrap antialiased'

/** Right column: preview + live timer stage (shared shell). */
export const HD_TIMER_STAGE_COLUMN =
  'relative flex min-h-[38svh] min-w-0 flex-1 flex-col items-start justify-center overflow-hidden bg-hd-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:min-h-0 lg:flex-none lg:pb-0'

/** Vertical spacing between album, labels, and inputs (setup + session left columns). */
export const HD_COLUMN_STACK_GAP = 'gap-4'

/** Bottom stack in timer column (pomodoro / session caption only). */
export const HD_STAGE_FOOTER_STACK =
  'pointer-events-none absolute bottom-[22px] left-4 z-[5] flex flex-col items-start gap-1 sm:left-6'

/** Pomodoro session / preview caption line. */
export const HD_STAGE_FOOTER_LINE =
  'whitespace-nowrap font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/20'

/** Gold left column: © pinned bottom-left (parent must be `relative`). */
export const HD_LEFT_COLUMN_COPYRIGHT =
  'pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-[3] sm:left-6 whitespace-nowrap font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide'

/**
 * Desktop main grid: three tracks with the center (ticker) fixed at 1/10 of the row.
 * The remaining 9/10 splits by the golden ratio φ so left:right ≈ φ:1 (55.6% : 34.4% of full width).
 * Fr weights sum to 10 so the ticker stays 10% like the previous 5:1:4 layout, but outer bands are golden.
 */
export const HD_MAIN_GRID_COLS_CLASS = 'lg:grid-cols-[5.562fr_1fr_3.438fr]'

export function hdMainGridShellClass(
  mode: 'setup' | 'session',
  view: 'setup' | 'session',
): string {
  const active = view === mode
  return cn(
    mode === 'setup' ? 'z-0' : 'z-[1]',
    'flex flex-col lg:absolute lg:inset-0 lg:grid lg:min-h-0',
    HD_MAIN_GRID_COLS_CLASS,
    active
      ? 'opacity-100'
      : 'pointer-events-none opacity-0 max-lg:hidden lg:pointer-events-none',
  )
}
