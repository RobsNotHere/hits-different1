import { NextResponse } from 'next/server'
import { getSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'

/** Short-lived access token for Web Playback SDK `getOAuthToken` (JWT refreshed server-side). */
export async function GET() {
  const accessToken = await getSpotifyAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] /api/spotify/token → client: { accessToken: <redacted> }')
  }
  return NextResponse.json({ accessToken })
}
