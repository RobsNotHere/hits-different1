import { cn } from '@/lib/cn'

/**
 * Global UI type (Inter, 16px). Use **one** of:
 * - `HD_TEXT_BODY` — default paragraphs, lists, toasts, most controls (`leading-snug`).
 * - `HD_NAV_TEXT` — top bar / wordmark (tighter line height + tracking).
 * - `cn(HD_FONT_UI, 'leading-none', …)` — single-line buttons, compact rows.
 */
export const HD_FONT_UI =
  'font-[family-name:var(--font-inter)] text-[16px] antialiased'

export const HD_TEXT_BODY = cn(HD_FONT_UI, 'leading-snug')

/** Top nav: wordmark, tagline, and actions (2-line cells). */
export const HD_NAV_TEXT = cn(
  HD_FONT_UI,
  'font-normal leading-[1.2] tracking-[0.08em]',
)

/** Task field: typed line (inherits `HD_TEXT_BODY`) + 18px placeholder token. */
export const HD_TASK_INPUT_VALUE = cn(HD_TEXT_BODY, 'text-white caret-white')

export const HD_TASK_INPUT_PLACEHOLDER =
  'placeholder:font-[family-name:var(--font-inter)] placeholder:text-[18px] placeholder:uppercase placeholder:leading-snug placeholder:tracking-[0.08em] placeholder:text-white/40'

/** Top bar CTA: column layout, matches `HD_NAV_TEXT`. */
export const HD_TOP_BAR_BTN =
  'inline-flex min-h-0 cursor-pointer flex-col items-end justify-start gap-1 border-0 bg-transparent p-0 text-right align-top text-white'

/** Vertical spacing between stage, labels, and inputs (setup + session left columns). */
export const HD_COLUMN_STACK_GAP = 'gap-4'

/** Euclid display: setup page title (`#hdPageTitle`) + session task line (`#s2Task`). */
export const HD_DISPLAY_TITLE =
  'font-[family-name:var(--font-euclid-flex)] text-[64px] leading-none tracking-[0.1em] text-white'

/** Lucide icons beside `HD_TEXT_BODY` / `HD_FONT_UI` (~1.25× 16px cap). */
export const HD_ICON = 'size-5 shrink-0'

/** Larger icons: headers, spinners, primary row actions (~24px). */
export const HD_ICON_LG = 'size-6 shrink-0'

/**
 * Session countdown (`#timerNum`): Euclid, scales with **container width** (`cqw`). Parent `#s2Left`
 * sets `@container` + `min-w-0` (same band as `HD_LEFT_STAGE_MAX`). Inline under task title when running.
 * `min(…cqw, …vmin)` keeps mobile / short viewports sane; cap matches previous 280px feel.
 */
export const HD_TIMER_DISPLAY =
  'font-[family-name:var(--font-euclid-flex)] block w-full min-w-0 max-w-full text-start text-[clamp(2.5rem,min(28cqw,34vmin),280px)] leading-none tracking-[0.05em] tabular-nums'

/**
 * Left column max width: task stack + inline timer + transport (`#s1Left` / `#s2Left` set `@container`).
 */
export const HD_LEFT_STAGE_MAX =
  'max-w-[min(100%,min(92cqw,40rem))]'

/** Setup / session copy + inputs: same horizontal cap as `HD_LEFT_STAGE_MAX`. */
export const HD_LEFT_STAGE_COLUMN = cn(
  'mx-auto flex w-full min-w-0 shrink-0 flex-col text-start',
  HD_LEFT_STAGE_MAX,
)

/** Session transport row: same width as timer + task column. */
export const HD_LEFT_TRANSPORT_STACK = cn(
  'relative z-[5] mx-auto flex w-full min-w-0 shrink-0 flex-col gap-2',
  HD_LEFT_STAGE_MAX,
)

/** © fixed to viewport bottom-right (full page), above main content, below toast. */
export const HD_VIEWPORT_COPYRIGHT = cn(
  'pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[100] sm:right-6 whitespace-nowrap leading-none tracking-wide',
  HD_FONT_UI,
)

/**
 * Desktop “golden radio” grid: two tracks only — major : minor = φ : 1 (≈ 61.8% : 38.2%).
 * Main task/timer lives in the wide band; the infinite vibe list sits in the narrow band (tuning strip).
 */
export const HD_MAIN_GRID_COLS_CLASS = 'lg:grid-cols-[5.562fr_3.438fr]'

/**
 * Viewport / padding model (reference layout, same weights as the main grid):
 *
 * - **Major track (5.562)** → horizontal inset from viewport edges: `5.562vmin` scaled to `clamp(1rem, 5.562vmin, 4rem)`.
 *   Use for page frame, top bar, and anything that should line up with the left “content rail”.
 * - **Minor track (3.438)** → vertical bottom inset / stage footroom: `3.438vmin` scaled to
 *   `clamp(0.75rem, 3.438vmin, 2.75rem)` so the big clock sits above the fold and safe-area.
 * - **Top breathing room** (lighter): `2.5vmin` cap for `lg:pt` so the header → title gap stays proportional.
 * - **Below `lg`**: `max-lg:pt-[…]` reserves space for the fixed `#hdTopBar` (wordmark + optional notice) and
 *   `env(safe-area-inset-top)` — padding only, no `h-*` / `min-h-*` changes on the shell.
 *
 * The grid columns remain `5.562fr | 3.438fr`; padding uses the *same numbers* so margins and columns feel unified.
 */
export const HD_PAGE_FRAME =
  'box-border max-lg:px-4 max-lg:pb-4 max-lg:pt-[max(8rem,calc(env(safe-area-inset-top)+5.5rem))] lg:px-[clamp(1rem,5.562vmin,4rem)] lg:pb-[clamp(0.75rem,3.438vmin,2.75rem)] lg:pt-[clamp(0.5rem,2.5vmin,1.75rem)]'

/** Match `#hdTopBar` horizontal inset to `HD_PAGE_FRAME` on large screens (no double margin). */
export const HD_TOP_BAR_INSET_X =
  'lg:left-[clamp(1rem,5.562vmin,4rem)] lg:right-[clamp(1rem,5.562vmin,4rem)]'

/** Below `lg`: same horizontal inset as `HD_PAGE_FRAME` (`max-lg:px-4`) so the wordmark lines up with the timer rail. */
export const HD_TOP_BAR_INSET_MAX_LG = 'max-lg:left-4 max-lg:right-4'

/**
 * Bottom padding inside the left stage where the ambient clock is bottom-aligned —
 * keeps `MM:SS` off the physical bottom + honors safe-area (minor-weight vmin).
 */
export const HD_SETUP_TIMER_STAGE_PAD_BOTTOM =
  'pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-[clamp(0.75rem,3.438vmin,2.75rem)]'

/** Vertical gap between setup title line and the input card (slightly looser than `HD_COLUMN_STACK_GAP`). */
export const HD_SETUP_TITLE_TO_INPUT_GAP = 'gap-[clamp(1rem,2.75vmin,1.35rem)]'

/** Minor column: horizontal vibe rail + “Deep focus” label. */
export const HD_TICKER_COLUMN_SHELL =
  'relative flex min-h-[8rem] min-w-0 w-full shrink-0 flex-col overflow-hidden py-2 max-lg:px-3 sm:max-lg:px-4 lg:h-full lg:min-h-0 lg:py-3 lg:pl-5 lg:pr-2'

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
