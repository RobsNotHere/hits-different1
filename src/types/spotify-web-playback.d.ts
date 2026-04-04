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
