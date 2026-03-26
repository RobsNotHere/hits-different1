import type { Phase } from '@/lib/types'

const STORAGE_KEY = 'hits-different:v1'
const MAX_AGE_MS = 48 * 60 * 60 * 1000

export type PersistedSession = {
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
    const data = JSON.parse(raw) as PersistedSession
    if (data.version !== 1) return null
    if (Date.now() - data.updatedAt > MAX_AGE_MS) return null
    return data
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
  partial: Pick<PersistedSession, 'phase' | 'remaining' | 'task'> & {
    updatedAt?: number
  },
): void {
  const payload: PersistedSession = {
    version: 1,
    phase: partial.phase,
    remaining: partial.remaining,
    task: partial.task,
    updatedAt: partial.updatedAt ?? Date.now(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPersistedSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
