import { NextResponse } from 'next/server'

/**
 * Spotify Web Playback `device_id` (SDK “ready” payload). Allow hex / alnum
 * lengths seen in the wild; reject anything that could break query encoding.
 */
const DEVICE_ID_RE = /^[0-9A-Za-z]{16,128}$/

/** `context_uri` sent to Spotify’s play API — must not be an arbitrary URL. */
const CONTEXT_URI_RE =
  /^spotify:(playlist|album|artist|track|episode|show):[0-9A-Za-z]+$/u

export type SpotifyPlayBody = {
  deviceId?: string
  contextUri?: string
}

export function parseSpotifyPlayBody(
  body: SpotifyPlayBody,
):
  | { ok: true; deviceId: string; contextUri: string }
  | { ok: false; response: NextResponse } {
  const { deviceId, contextUri } = body
  if (!deviceId || !contextUri) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'deviceId and contextUri required' },
        { status: 400 },
      ),
    }
  }
  if (!DEVICE_ID_RE.test(deviceId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid deviceId' }, { status: 400 }),
    }
  }
  if (!CONTEXT_URI_RE.test(contextUri)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid contextUri' }, { status: 400 }),
    }
  }
  return { ok: true, deviceId, contextUri }
}
