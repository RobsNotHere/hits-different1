import NextAuth from 'next-auth'
import Spotify from 'next-auth/providers/spotify'

/** Dev-only fallback so `/api/auth/session` works without `.env.local` (set AUTH_SECRET for stable local + prod). */
const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === 'development'
    ? 'dev-only-insecure-auth-secret-not-for-production'
    : undefined)

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: authSecret,
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
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token
      }
      if (account?.expires_at) {
        token.expiresAt = account.expires_at
      }
      return token
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
})
