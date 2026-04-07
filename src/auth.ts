import NextAuth from 'next-auth'
import Spotify from 'next-auth/providers/spotify'
import type { JWT } from 'next-auth/jwt'
import {
  middlewareAuthorized,
  type AuthorizedRequest,
} from '@/lib/auth/middlewareAuthorized'
import { refreshSpotifyAccessToken } from '@/lib/spotify/refreshSpotifyAccessToken'

/** Dev-only fallback so `/api/auth/session` works without `.env.local` (set AUTH_SECRET for stable local + prod). */
const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === 'development'
    ? 'dev-only-insecure-auth-secret-not-for-production'
    : undefined)

export const { handlers, auth } = NextAuth({
  trustHost: true,
  secret: authSecret,
  pages: {
    error: '/auth/error',
  },
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: [
            'user-read-email',
            'user-read-private',
            'user-read-currently-playing',
            'user-read-playback-state',
            'playlist-read-private',
            'streaming',
            'user-modify-playback-state',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    authorized({ request, auth }) {
      return middlewareAuthorized({
        request: request as AuthorizedRequest,
        auth,
      })
    },
    async jwt({ token, account }): Promise<JWT> {
      if (account?.access_token) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000 + 3600),
          error: undefined,
        }
      }

      if (token.error === 'RefreshAccessTokenError') {
        return token
      }

      const exp = token.expiresAt as number | undefined
      const nowSec = Math.floor(Date.now() / 1000)
      if (exp && nowSec < exp - 120) {
        return token
      }

      if (!token.refreshToken) {
        return { ...token, error: 'RefreshAccessTokenError' }
      }

      return refreshSpotifyAccessToken(token)
    },
    session({ session, token }) {
      if (token.error === 'RefreshAccessTokenError') {
        session.accessToken = undefined
        return session
      }
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
})
