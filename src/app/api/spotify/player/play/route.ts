import { NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'
import {
  parseSpotifyPlayBody,
  type SpotifyPlayBody,
} from '@/lib/spotify/validateSpotifyPlayRequest'

/**
 * Start playback on the Web Playback device (`spotify:playlist:…` or album URI).
 * Spotify access token is taken only from the session — never from the request body.
 */
export async function POST(req: Request) {
  const guard = await requireSpotifyAccessToken()
  if (!guard.ok) return guard.response
  const { token } = guard

  let body: SpotifyPlayBody
  try {
    body = (await req.json()) as SpotifyPlayBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseSpotifyPlayBody(body)
  if (!parsed.ok) return parsed.response
  const { deviceId, contextUri } = parsed

  const url = new URL('https://api.spotify.com/v1/me/player/play')
  url.searchParams.set('device_id', deviceId)

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context_uri: contextUri }),
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] Spotify PUT /me/player/play →', res.status)
  }

  if (res.status === 204 || res.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[hits-different] /api/spotify/player/play → client:', { ok: true })
    }
    return NextResponse.json({ ok: true })
  }

  const detail = await res.text()
  if (process.env.NODE_ENV === 'development') {
    console.log('[hits-different] Spotify play error:', detail.slice(0, 500))
  }
  return NextResponse.json(
    { error: 'Spotify play failed', detail },
    { status: res.status },
  )
}
