import { NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'

/** Short-lived access token for Web Playback SDK `getOAuthToken` (JWT refreshed server-side). Never read tokens from the request body. */
export async function GET() {
  const guard = await requireSpotifyAccessToken()
  if (!guard.ok) return guard.response
  const { token: accessToken } = guard
  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] /api/spotify/token → client: { accessToken: <redacted> }')
  }
  return NextResponse.json({ accessToken })
}
