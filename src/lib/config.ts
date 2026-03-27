import type { Phase } from '@/lib/types'

/** Demo playlists — swap for API / Spotify / YouTube later. */
export const FOCUS_SECONDS = 25 * 60
export const BREAK_SECONDS = 5 * 60

export const DEMO_FOCUS_TITLE = 'Focus stream'
export const DEMO_BREAK_TITLE = 'Break'

/** Lofi study stream (demo focus). */
export const DEMO_FOCUS_EMBED =
  'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?rel=0'

/** Break: single YouTube video (https://www.youtube.com/watch?v=4xDzrJKXOOY). */
export const DEMO_BREAK_EMBED =
  'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?rel=0'

export function blockSecondsForPhase(phase: Phase): number {
  if (phase === 'focus') return FOCUS_SECONDS
  if (phase === 'break') return BREAK_SECONDS
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
