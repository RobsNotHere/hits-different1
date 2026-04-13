import { cn } from '@/lib/cn'

/** Top bar: Session log + Spotify (identical type sizing; resets button UA styles). */
export const HD_TOP_BAR_BTN =
  'inline-flex min-h-0 cursor-pointer items-center border-0 bg-transparent p-0 align-middle font-[family-name:var(--font-space-mono)] text-[12px] font-normal leading-none tracking-wide text-white whitespace-nowrap antialiased'

/** Vertical spacing between stage, labels, and inputs (setup + session left columns). */
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
 * Desktop “golden radio” grid: two tracks only — major : minor = φ : 1 (≈ 61.8% : 38.2%).
 * Main task/timer lives in the wide band; the infinite vibe list sits in the narrow band (tuning strip).
 */
export const HD_MAIN_GRID_COLS_CLASS = 'lg:grid-cols-[5.562fr_3.438fr]'

/** Minor (ticker) column: dial strip layout (no chrome — spacing only). */
export const HD_TICKER_COLUMN_SHELL =
  'relative flex h-24 min-h-0 min-w-0 shrink-0 flex-col overflow-hidden px-2 py-2 sm:px-3 lg:h-full lg:py-4'

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
