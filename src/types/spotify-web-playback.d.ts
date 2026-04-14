/** Minimal typings for https://sdk.scdn.co/spotify-player.js */

export type SpotifyPlaybackState = {
  paused: boolean
  position: number
  duration: number
  track_window?: { current_track: { uri: string; name: string } | null }
}

export type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (...args: unknown[]) => void) => void
  removeListener: (event: string, cb?: (...args: unknown[]) => void) => void
  activateElement?: () => Promise<void>
  /** Stops current Web Playback output before starting a new context (avoids brief overlap). */
  pause?: () => Promise<void>
  /** 0–1; medium–low default keeps first play audible without blasting. */
  setVolume?: (volume: number) => Promise<void>
}

type SpotifyPlayerCtor = new (options: {
  name: string
  getOAuthToken: (cb: (accessToken: string) => void) => void
  volume?: number
}) => SpotifyPlayerInstance

declare global {
  interface Window {
    Spotify?: { Player: SpotifyPlayerCtor }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

export {}
