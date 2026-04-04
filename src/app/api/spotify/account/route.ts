import { NextResponse } from 'next/server'
import { getSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'

/**
 * Returns the signed-in user's Spotify `product` (e.g. premium, free) for client UX.
 */
export async function GET() {
  const token = await getSpotifyAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] Spotify GET /v1/me →', res.status)
  }

  if (!res.ok) {
    const text = await res.text()
    if (process.env.NODE_ENV === 'development') {
      console.log('[hits-different] Spotify /v1/me error body:', text.slice(0, 400))
    }
    return NextResponse.json(
      { error: 'Spotify API error', detail: text },
      { status: res.status },
    )
  }

  const data = (await res.json()) as { product?: string }
  const out = { product: data.product ?? 'unknown' }
  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] /api/spotify/account response:', out)
  }
  return NextResponse.json(out)
}
