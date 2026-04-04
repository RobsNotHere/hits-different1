'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpotifyPlaybackState, SpotifyPlayerInstance } from '@/types/spotify-web-playback'

function loadSpotifySdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Spotify?.Player) return Promise.resolve()

  return new Promise((resolve) => {
    const w = window as Window & { onSpotifyWebPlaybackSDKReady?: () => void }
    const prev = w.onSpotifyWebPlaybackSDKReady
    w.onSpotifyWebPlaybackSDKReady = () => {
      try {
        prev?.()
      } finally {
        resolve()
      }
    }
    if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
      const s = document.createElement('script')
      s.src = 'https://sdk.scdn.co/spotify-player.js'
      s.async = true
      document.body.appendChild(s)
    }
  })
}

const BTN_CLS =
  'font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/55 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline'

type Props = {
  enabled: boolean
  contextUri: string | null
  onSdkPlayingChange: (playing: boolean) => void
  onError?: (message: string) => void
}

export function SpotifyWebPlayer({
  enabled,
  contextUri,
  onSdkPlayingChange,
  onError,
}: Props) {
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)
  const deviceIdRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSdkPlayingChangeRef = useRef(onSdkPlayingChange)
  onSdkPlayingChangeRef.current = onSdkPlayingChange

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (!enabled) {
      playerRef.current?.disconnect()
      playerRef.current = null
      deviceIdRef.current = null
      setReady(false)
      onSdkPlayingChangeRef.current(false)
      return
    }

    let cancelled = false

    const onReady = (payload: unknown) => {
      const d = payload as { device_id?: string }
      deviceIdRef.current = d.device_id ?? null
      if (!cancelled) setReady(true)
    }

    const onNotReady = () => {
      deviceIdRef.current = null
      if (!cancelled) setReady(false)
    }

    const onState = (data: unknown) => {
      const state = data as SpotifyPlaybackState | null
      const playing = Boolean(state && !state.paused)
      onSdkPlayingChangeRef.current(playing)
    }

    void (async () => {
      try {
        await loadSpotifySdk()
        if (cancelled || !window.Spotify?.Player) return

        const player = new window.Spotify.Player({
          name: 'Hits Different',
          getOAuthToken: (cb) => {
            void fetch('/api/spotify/token')
              .then((r) => {
                if (process.env.NODE_ENV === 'development') {
                  void r
                    .clone()
                    .json()
                    .then((body: { accessToken?: string; error?: string }) => {
                      console.log('[hits-different] GET /api/spotify/token', r.status, {
                        hasAccessToken: Boolean(body.accessToken),
                        error: body.error,
                      })
                    })
                    .catch(() => {
                      console.log('[hits-different] GET /api/spotify/token', r.status, '(non-JSON body)')
                    })
                }
                if (!r.ok) throw new Error('token')
                return r.json()
              })
              .then((j: { accessToken?: string }) => {
                if (!j.accessToken) throw new Error('token')
                cb(j.accessToken)
              })
              .catch(() => {
                onErrorRef.current?.('Could not refresh Spotify session')
              })
          },
          volume: 0.85,
        })

        player.addListener('ready', onReady)
        player.addListener('not_ready', onNotReady)
        player.addListener('player_state_changed', onState)

        playerRef.current = player
        const ok = await player.connect()
        if (!ok && !cancelled) onErrorRef.current?.('Could not connect Spotify in-browser player')
      } catch {
        if (!cancelled) onErrorRef.current?.('Spotify player failed to load')
      }
    })()

    return () => {
      cancelled = true
      const p = playerRef.current
      playerRef.current = null
      p?.disconnect()
      deviceIdRef.current = null
      setReady(false)
      onSdkPlayingChangeRef.current(false)
    }
  }, [enabled])

  const playInBrowser = useCallback(async () => {
    if (!contextUri || busy) return
    const deviceId = deviceIdRef.current
    const player = playerRef.current
    if (!deviceId || !player) {
      onErrorRef.current?.('Spotify player not ready yet')
      return
    }

    setBusy(true)
    try {
      await player.activateElement?.()
      const res = await fetch('/api/spotify/player/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, contextUri }),
      })
      if (process.env.NODE_ENV === 'development') {
        const peek = await res.clone().text()
        try {
          console.log(
            '[hits-different] POST /api/spotify/player/play',
            res.status,
            peek ? JSON.parse(peek) : '(empty)',
          )
        } catch {
          console.log('[hits-different] POST /api/spotify/player/play', res.status, peek.slice(0, 400))
        }
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { detail?: string; error?: string }
        throw new Error(j.detail || j.error || res.statusText)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Playback failed'
      onErrorRef.current?.(msg.length > 80 ? 'Could not start Spotify playback' : msg)
    } finally {
      setBusy(false)
    }
  }, [busy, contextUri])

  if (!contextUri) return null

  return (
    <button
      type="button"
      className={BTN_CLS}
      disabled={!ready || busy}
      onClick={() => void playInBrowser()}
    >
      {busy ? 'Starting…' : ready ? 'Play mix in browser' : 'Loading player…'}
    </button>
  )
}
