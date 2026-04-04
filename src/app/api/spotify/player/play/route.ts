import { NextResponse } from 'next/server'
import { getSpotifyAccessToken } from '@/lib/spotify/getSpotifyAccessToken'

type Body = {
  deviceId?: string
  contextUri?: string
}

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

  if (res.status === 204 || res.ok) {
    return NextResponse.json({ ok: true })
  }

  const detail = await res.text()
  return NextResponse.json(
    { error: 'Spotify play failed', detail },
    { status: res.status },
  )
}
