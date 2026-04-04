import type { JWT } from 'next-auth/jwt'

/**
 * Spotify OAuth refresh. Called from Auth.js `jwt` when `expiresAt` is near/past.
 */
export async function refreshSpotifyAccessToken(token: JWT): Promise<JWT> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const refreshToken = token.refreshToken
  if (!clientId || !clientSecret || !refreshToken) {
    return { ...token, error: 'RefreshAccessTokenError' }
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const json = (await res.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
      error?: string
    }

    if (!res.ok || !json.access_token) {
      return { ...token, error: 'RefreshAccessTokenError' }
    }

    return {
      ...token,
      accessToken: json.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + (json.expires_in ?? 3600)),
      refreshToken: json.refresh_token ?? refreshToken,
      error: undefined,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}
