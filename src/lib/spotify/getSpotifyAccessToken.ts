import { auth } from '@/auth'

/** Current session access token (JWT refreshed in `auth.ts` when expired). */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const session = await auth()
  return session?.accessToken ?? null
}
