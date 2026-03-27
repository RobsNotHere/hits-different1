import type { Phase } from '@/lib/types'

const STORAGE_KEY = 'hits-different:v1'
const MAX_AGE_MS = 48 * 60 * 60 * 1000

export type PersistedSession = {
  version: 2
  phase: Phase
  remaining: number
  task: string
  /** Which focus block in the round (0–3). */
  focusIndex: number
  updatedAt: number
}

type StoredV1 = {
  version: 1
  phase: Phase
  remaining: number
  task: string
  updatedAt: number
}

function readStoredSession(): PersistedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedSession | StoredV1
    if (data.version === 2) {
      if (Date.now() - data.updatedAt > MAX_AGE_MS) return null
      if (data.focusIndex < 0 || data.focusIndex > 3) return null
      return data
    }
    if (data.version === 1) {
      if (Date.now() - data.updatedAt > MAX_AGE_MS) return null
      return {
        version: 2,
        phase: data.phase,
        remaining: data.remaining,
        task: data.task,
        focusIndex: 0,
        updatedAt: data.updatedAt,
      }
    }
    return null
  } catch {
    return null
  }
}

/** Stored session that can be resumed (focus/break with time left). */
export function loadResumableSession(): PersistedSession | null {
  const s = readStoredSession()
  if (!s) return null
  if (s.phase !== 'focus' && s.phase !== 'break') return null
  if (s.remaining <= 0) return null
  return s
}

export function savePersistedSession(
  partial: Pick<PersistedSession, 'phase' | 'remaining' | 'task' | 'focusIndex'> & {
    updatedAt?: number
  },
): void {
  const payload: PersistedSession = {
    version: 2,
    phase: partial.phase,
    remaining: partial.remaining,
    task: partial.task,
    focusIndex: partial.focusIndex,
    updatedAt: partial.updatedAt ?? Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPersistedSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
