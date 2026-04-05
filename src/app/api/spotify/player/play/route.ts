import { NextResponse } from 'next/server'
import { getSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'

type Body = {
  deviceId?: string
  contextUri?: string
}

const CONTEXT_URI = /^spotify:(playlist|album):[a-zA-Z0-9]+$/u
const DEVICE_ID = /^[a-f0-9]{40}$/i

/**
 * Start playback on the Web Playback device (`spotify:playlist:…` or album URI).
 */
export async function POST(req: Request) {
  const token = await getSpotifyAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { deviceId, contextUri } = body
  if (!deviceId || !contextUri) {
    return NextResponse.json(
      { error: 'deviceId and contextUri required' },
      { status: 400 },
    )
  }

  if (!CONTEXT_URI.test(contextUri) || !DEVICE_ID.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid deviceId or contextUri' }, { status: 400 })
  }

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
  const dev = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    dev ? { error: 'Spotify play failed', detail } : { error: 'Spotify play failed' },
    { status: res.status },
  )
}
