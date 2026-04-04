/** `https://open.spotify.com/playlist/ID` → `spotify:playlist:ID` */
export function spotifyPlaylistContextUri(spotifyWebUrl: string): string | null {
  const m = spotifyWebUrl.match(/playlist\/([a-zA-Z0-9]+)/)
  return m ? `spotify:playlist:${m[1]}` : null
}
