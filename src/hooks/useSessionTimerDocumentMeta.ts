'use client'

import { useEffect } from 'react'

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DEFAULT_TITLE = 'Hits Different — Pomodoro'
const DEFAULT_ICON = '/favicon.svg'

/**
 * While a session timer is active, sets `document.title` and a small canvas
 * favicon showing MM:SS. Restores defaults when inactive.
 */
export function useSessionTimerDocumentMeta(
  active: boolean,
  remainingSeconds: number,
) {
  useEffect(() => {
    if (!active) {
      document.title = DEFAULT_TITLE
      const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
      if (link) link.href = DEFAULT_ICON
      return
    }

    const t = formatClock(remainingSeconds)
    document.title = `${t} · Hits Different`

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) return

    const canvas = document.createElement('canvas')
    const size = 64
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0c0c0c'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t, size / 2, size / 2)

    const url = canvas.toDataURL('image/png')
    link.href = url

    return () => {
      document.title = DEFAULT_TITLE
      link.href = DEFAULT_ICON
    }
  }, [active, remainingSeconds])
}
