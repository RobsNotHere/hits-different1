export const VIBES = [
  'LO-FI',
  'HYPE',
  'JAZZ',
  'EDM',
  'CLASSICAL',
  'ACOUSTIC',
  'SPIRITUAL',
] as const

export type Vibe = (typeof VIBES)[number]

/** Selected vibe first — horizontal infinite rail keeps the active track at the leading edge. */
export function vibesRotatedFrom(selected: Vibe): Vibe[] {
  const i = VIBES.indexOf(selected)
  if (i < 0) return [...VIBES]
  return [...VIBES.slice(i), ...VIBES.slice(0, i)]
}

export const VIBE_TRACKS: Record<string, string> = {
  'LO-FI': 'LO-FI · CALM STUDY',
  HYPE: 'HYPE SPRINT MIX',
  JAZZ: 'JAZZ FLOW MIX',
  EDM: 'EDM FOCUS MIX',
  CLASSICAL: 'CHOPIN · BALLADE NO. 2',
  ACOUSTIC: 'ACOUSTIC CHILL MIX',
  SPIRITUAL: '432 HZ · ETHEREAL BRIDGE',
}

/** Curated public Spotify playlists (editorial / widely used). */
export const VIBE_SAMPLE_PLAYLISTS: Record<Vibe, { spotifyUrl: string }> = {
  'LO-FI': {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
  },
  HYPE: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP',
  },
  JAZZ: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT',
  },
  EDM: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6J5NfMJS675',
  },
  CLASSICAL: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWEJlAGA9gs0',
  },
  ACOUSTIC: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6ziVCJnEm59',
  },
  SPIRITUAL: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6GwdWRQMQpq',
  },
}

/** Combined focus + break + cycle presets (single “mode” in the UI). */
type TimerModePreset = {
  id: string
  label: string
  focusMins: number
  breakMins: number
  cycles: number
}

export const TIMER_MODE_PRESETS: readonly TimerModePreset[] = [
  { id: 'classic', label: 'Classic', focusMins: 25, breakMins: 5, cycles: 6 },
  { id: 'sprint', label: 'Sprint', focusMins: 15, breakMins: 3, cycles: 8 },
  { id: 'deep', label: 'Deep work', focusMins: 45, breakMins: 10, cycles: 4 },
  { id: 'marathon', label: 'Marathon', focusMins: 60, breakMins: 15, cycles: 3 },
  { id: 'light', label: 'Light session', focusMins: 20, breakMins: 5, cycles: 6 },
] as const

export type HistoryEntry = {
  task: string
  emoji: string
  vibe: string
  sessions: number
  duration: number
  date: string
  completed: boolean
}

export const HISTORY_KEY = 'hd_history'

/** Local MP3s in `public/audio/` — unsigned session demo audio in HitsDifferentApp. */
const LOFI_DEMO_FOCUS_MP3 = '/audio/lofi-study-calm-112191.mp3' as const
const HYPE_DEMO_FOCUS_MP3 = '/audio/hype-drill-438398.mp3' as const
const EDM_DEMO_FOCUS_MP3 = '/audio/edm-brazilian-phonk-505181.mp3' as const
const JAZZ_DEMO_FOCUS_MP3 = '/audio/jazz-moment-14023.mp3' as const
const CLASSICAL_DEMO_FOCUS_MP3 = '/audio/chopin-ballade-2-op38.mp3' as const
const ACOUSTIC_DEMO_FOCUS_MP3 = '/audio/acoustic-summer-walk-152722.mp3' as const
const SPIRITUAL_DEMO_FOCUS_MP3 =
  '/audio/gnosticbliss-432-hz-ethereal-bridge-331605.mp3' as const

export function sessionDemoFocusSrc(vibe: Vibe): string {
  if (vibe === 'LO-FI') return LOFI_DEMO_FOCUS_MP3
  if (vibe === 'HYPE') return HYPE_DEMO_FOCUS_MP3
  if (vibe === 'JAZZ') return JAZZ_DEMO_FOCUS_MP3
  if (vibe === 'EDM') return EDM_DEMO_FOCUS_MP3
  if (vibe === 'CLASSICAL') return CLASSICAL_DEMO_FOCUS_MP3
  if (vibe === 'ACOUSTIC') return ACOUSTIC_DEMO_FOCUS_MP3
  if (vibe === 'SPIRITUAL') return SPIRITUAL_DEMO_FOCUS_MP3
  return LOFI_DEMO_FOCUS_MP3
}

/** Unsigned-session break loop per vibe (same clips as focus until dedicated break assets exist). */
export function sessionDemoBreakSrc(vibe: Vibe): string {
  return sessionDemoFocusSrc(vibe)
}
