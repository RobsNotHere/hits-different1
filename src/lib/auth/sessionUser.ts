import type { Session } from 'next-auth'

/**
 * Security notes for Spotify-backed routes:
 * - Never accept a raw Spotify access token (or refresh token) from the client body/query to
 *   act as a user — always derive tokens via `auth()` / `getSpotifyAccessToken()` from the session cookie.
 * - For dynamic routes like `/api/.../[userId]/...`, never trust `userId` from the URL alone:
 *   compare to `sessionAccountId(session)` and return 403 on mismatch.
 */

/** Stable account id for the signed-in user (Spotify profile `id` → session `user.id`). */
export function sessionAccountId(session: Session | null): string | undefined {
  const id = session?.user?.id
  if (typeof id === 'string' && id.length > 0) return id
  return undefined
}

/** True if the client-supplied id does not match the signed-in user (treat as IDOR). */
export function isForeignUserId(session: Session | null, claimedUserId: string): boolean {
  const real = sessionAccountId(session)
  if (!real) return true
  return real !== claimedUserId
}
