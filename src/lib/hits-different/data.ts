export const VIBES = [
  'LO-FI',
  'HYPE',
  'JAZZ',
  'EDM',
  'INDIE',
  'CLASSICAL',
  'PUNK',
  'ACOUSTIC',
] as const

export type Vibe = (typeof VIBES)[number]

export const VIBE_TRACKS: Record<string, string> = {
  'LO-FI': 'LO-FI BEATS MIX',
  HYPE: 'HYPE SPRINT MIX',
  JAZZ: 'JAZZ FLOW MIX',
  EDM: 'EDM FOCUS MIX',
  INDIE: 'INDIE STUDY MIX',
  CLASSICAL: 'CLASSICAL DEEP MIX',
  PUNK: 'PUNK SPRINT MIX',
  ACOUSTIC: 'ACOUSTIC CHILL MIX',
}

type VibePlaylistSample = {
  spotifyUrl: string
  youtubeMusicSearchQuery: string
}

/** Curated public Spotify playlists (editorial / widely used). */
export const VIBE_SAMPLE_PLAYLISTS: Record<Vibe, VibePlaylistSample> = {
  'LO-FI': {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn',
    youtubeMusicSearchQuery: 'lofi hip hop beats chill study mix',
  },
  HYPE: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP',
    youtubeMusicSearchQuery: 'workout hype motivation rap rock mix',
  },
  JAZZ: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT',
    youtubeMusicSearchQuery: 'jazz instrumental focus study cafe mix',
  },
  EDM: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6J5NfMJS675',
    youtubeMusicSearchQuery: 'techno edm focus deep work mix',
  },
  INDIE: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdbXrPNafg9d',
    youtubeMusicSearchQuery: 'indie alternative focus study mix',
  },
  CLASSICAL: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWEJlAGA9gs0',
    youtubeMusicSearchQuery: 'classical music focus concentration study',
  },
  PUNK: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX3LDIBRoaCDQ',
    youtubeMusicSearchQuery: 'punk rock energy workout mix',
  },
  ACOUSTIC: {
    spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX6ziVCJnEm59',
    youtubeMusicSearchQuery: 'acoustic coffeehouse mellow singer songwriter',
  },
}

export function youtubeMusicSearchUrlFor(vibe: Vibe): string {
  const q = VIBE_SAMPLE_PLAYLISTS[vibe].youtubeMusicSearchQuery
  return `https://music.youtube.com/search?q=${encodeURIComponent(q)}`
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

/** Session-only background loops (focus vs break) — wired in HitsDifferentApp (no UI). */
export const SESSION_DEMO_AUDIO = {
  focus:
    'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast%20-%20Elevator.mp3',
  break:
    'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3',
} as const
