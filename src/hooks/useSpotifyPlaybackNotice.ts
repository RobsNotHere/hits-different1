'use client'

import { useEffect, useState } from 'react'

export type SpotifyPlaybackNotice = 'nonPremium' | 'error' | null

/**
 * When the user is signed in with Spotify, fetches `/api/spotify/account` once per auth
 * transition to drive a small UX notice (Premium required for playback hints).
 */
export function useSpotifyPlaybackNotice(
  status: 'loading' | 'authenticated' | 'unauthenticated',
): SpotifyPlaybackNotice {
  const [fetchedNotice, setFetchedNotice] = useState<SpotifyPlaybackNotice>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
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
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  if (status !== 'authenticated') return null
  return fetchedNotice
}
