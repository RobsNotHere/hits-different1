export const VIBES = [
  'LO-FI',
  'HYPE',
  'JAZZ',
  'EDM',
  'CLASSICAL',
  'ACOUSTIC',
] as const

export type Vibe = (typeof VIBES)[number]

export const VIBE_TRACKS: Record<string, string> = {
  'LO-FI': 'LO-FI · CALM STUDY',
  HYPE: 'HYPE SPRINT MIX',
  JAZZ: 'JAZZ FLOW MIX',
  EDM: 'EDM FOCUS MIX',
  CLASSICAL: 'CHOPIN · BALLADE NO. 2',
  ACOUSTIC: 'ACOUSTIC CHILL MIX',
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
}

export const DUR_OPTS = [15, 20, 25, 30, 45, 60]

export const BREAK_OPTS = [3, 5, 10, 15, 20]

export const SESSION_OPTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

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
export const LOFI_DEMO_FOCUS_MP3 = '/audio/lofi-study-calm-112191.mp3' as const
export const HYPE_DEMO_FOCUS_MP3 = '/audio/hype-drill-438398.mp3' as const
export const EDM_DEMO_FOCUS_MP3 = '/audio/edm-brazilian-phonk-505181.mp3' as const
export const JAZZ_DEMO_FOCUS_MP3 = '/audio/jazz-moment-14023.mp3' as const
export const CLASSICAL_DEMO_FOCUS_MP3 = '/audio/chopin-ballade-2-op38.mp3' as const
export const ACOUSTIC_DEMO_FOCUS_MP3 = '/audio/acoustic-summer-walk-152722.mp3' as const

/** Unsigned-session break loop (jazz demo) — focus URLs come from `sessionDemoFocusSrc`. */
export const SESSION_DEMO_AUDIO = {
  break: JAZZ_DEMO_FOCUS_MP3,
} as const

export function sessionDemoFocusSrc(vibe: Vibe): string {
  if (vibe === 'LO-FI') return LOFI_DEMO_FOCUS_MP3
  if (vibe === 'HYPE') return HYPE_DEMO_FOCUS_MP3
  if (vibe === 'JAZZ') return JAZZ_DEMO_FOCUS_MP3
  if (vibe === 'EDM') return EDM_DEMO_FOCUS_MP3
  if (vibe === 'CLASSICAL') return CLASSICAL_DEMO_FOCUS_MP3
  if (vibe === 'ACOUSTIC') return ACOUSTIC_DEMO_FOCUS_MP3
  return LOFI_DEMO_FOCUS_MP3
}
