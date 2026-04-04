'use client'

import { useEffect, useState } from 'react'

export type SpotifyPlaybackNotice = 'nonPremium' | 'error' | null

export type SpotifyPlaybackNoticeState = {
  notice: SpotifyPlaybackNotice
  /** True after `/api/spotify/account` finished for this authenticated session (success or error). */
  accountVerified: boolean
}

/**
 * When the user is signed in with Spotify, fetches `/api/spotify/account` once per auth
 * transition to drive a small UX notice (Premium required for playback hints).
 */
export function useSpotifyPlaybackNotice(
  status: 'loading' | 'authenticated' | 'unauthenticated',
): SpotifyPlaybackNoticeState {
  const [fetchedNotice, setFetchedNotice] = useState<SpotifyPlaybackNotice>(null)
  const [accountVerified, setAccountVerified] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') {
      setAccountVerified(false)
      return
    }

    let cancelled = false
    setAccountVerified(false)
    void Promise.resolve().then(() => {
      if (!cancelled) setFetchedNotice(null)
    })
    void (async () => {
      try {
        const r = await fetch('/api/spotify/account')
        if (!r.ok) {
          if (!cancelled) setFetchedNotice('error')
          return
        }
        const j = (await r.json()) as { product?: string }
        if (cancelled) return
        const p = j.product?.toLowerCase()
        if (p === 'premium') setFetchedNotice(null)
        else setFetchedNotice('nonPremium')
      } catch {
        if (!cancelled) setFetchedNotice('error')
      } finally {
        if (!cancelled) setAccountVerified(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  if (status !== 'authenticated') {
    return { notice: null, accountVerified: false }
  }
  return { notice: fetchedNotice, accountVerified }
}
