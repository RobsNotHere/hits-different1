import type { Phase } from '@/lib/types'

/** Demo playlists — swap for API / Spotify / YouTube later. */
export const FOCUS_SECONDS = 25 * 60
export const BREAK_SECONDS = 5 * 60
/** After the 4th focus block, the final break is 30 minutes. */
export const LONG_BREAK_SECONDS = 30 * 60
/** Number of focus blocks per full round (each followed by a break). */
export const FOCUS_CYCLES = 4

const DEMO_FOCUS_TITLE = 'Focus stream'
const DEMO_BREAK_TITLE = 'Break'

/** Lofi study stream (demo focus). */
const DEMO_FOCUS_EMBED =
  'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0'

/** Break: single YouTube video (https://www.youtube.com/watch?v=28KRPhVzCus). */
const DEMO_BREAK_EMBED =
  'https://www.youtube-nocookie.com/embed/28KRPhVzCus?rel=0'

/**
 * Duration of the current block for progress UI.
 * `focusIndex` is 0–3 during a session; short breaks follow focus 0–2, long break follows focus 3.
 */
export function blockTotalSecondsForState(
  phase: Phase,
  focusIndex: number,
): number {
  if (phase === 'idle') return 0
  if (phase === 'focus') return FOCUS_SECONDS
  if (phase === 'break') {
    return focusIndex < FOCUS_CYCLES - 1 ? BREAK_SECONDS : LONG_BREAK_SECONDS
  }
  return 0
}

export function demoPlaylistForPhase(phase: Phase): {
  embedUrl: string
  title: string
} | null {
  if (phase === 'focus') {
    return { embedUrl: DEMO_FOCUS_EMBED, title: DEMO_FOCUS_TITLE }
  }
  if (phase === 'break') {
    return { embedUrl: DEMO_BREAK_EMBED, title: DEMO_BREAK_TITLE }
  }
  return null
}

/**
 * YouTube iframe: autoplay after load. Browsers allow this reliably when muted;
 * user can unmute in the player. `playsinline` helps mobile.
 */
export function embedUrlWithAutoplay(baseUrl: string): string {
  const u = new URL(baseUrl)
  u.searchParams.set('autoplay', '1')
  u.searchParams.set('mute', '1')
  u.searchParams.set('playsinline', '1')
  u.searchParams.set('rel', '0')
  return u.toString()
}
