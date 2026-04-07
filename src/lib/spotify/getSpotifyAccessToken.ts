import type { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { jsonUnauthorized } from '@/lib/auth/apiResponses'

/** Current session access token (JWT refreshed in `auth.ts` when expired). */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const session = await auth()
  return session?.accessToken ?? null
}

export type SpotifyAccessGuard =
  | { ok: true; token: string }
  | { ok: false; response: NextResponse }

/**
 * Use at the start of every sensitive Spotify API route: derives the token via `auth()` (same as
 * `getSpotifyAccessToken`) and returns a 401 `NextResponse` if missing.
 */
export async function requireSpotifyAccessToken(): Promise<SpotifyAccessGuard> {
  const token = await getSpotifyAccessToken()
  if (!token) return { ok: false, response: jsonUnauthorized() }
  return { ok: true, token }
}
