'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  BREAK_SECONDS,
  FOCUS_SECONDS,
  blockSecondsForPhase,
  demoPlaylistForPhase,
  embedUrlWithAutoplay,
} from '@/lib/config'
import {
  clearPersistedSession,
  loadResumableSession,
  savePersistedSession,
  type PersistedSession,
} from '@/lib/persistedSession'
import type { Phase } from '@/lib/types'

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const phaseBadgeStyles: Record<Phase, string> = {
  idle:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  focus:
    'border border-violet-500/40 bg-violet-500/10 text-violet-700 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-200',
  break:
    'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-200',
}

export function PomodoroApp() {
  const [task, setTask] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(FOCUS_SECONDS)
  const [hydrated, setHydrated] = useState(false)
  const [resumeOffer, setResumeOffer] = useState<PersistedSession | null>(null)

  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    queueMicrotask(() => {
      const saved = loadResumableSession()
      if (saved) setResumeOffer(saved)
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          const p = phaseRef.current
          if (p === 'focus') {
            setPhase('break')
            return BREAK_SECONDS
          }
          if (p === 'break') {
            setPhase('idle')
            return FOCUS_SECONDS
          }
          return r
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (!hydrated || resumeOffer !== null) return
    if (phase === 'focus' || phase === 'break') {
      savePersistedSession({ phase, remaining, task })
    } else {
      clearPersistedSession()
    }
  }, [phase, remaining, task, hydrated, resumeOffer])

  const handleResumeLastSession = useCallback(() => {
    if (!resumeOffer) return
    setTask(resumeOffer.task)
    setPhase(resumeOffer.phase)
    setRemaining(resumeOffer.remaining)
    setResumeOffer(null)
  }, [resumeOffer])

  const handleStartFresh = useCallback(() => {
    clearPersistedSession()
    setResumeOffer(null)
    setPhase('idle')
    setRemaining(FOCUS_SECONDS)
    setTask('')
  }, [])

  const commitTaskAndStartFocus = useCallback(() => {
    if (phase !== 'idle' || resumeOffer !== null) return
    if (!task.trim()) return
    setPhase('focus')
    setRemaining(FOCUS_SECONDS)
  }, [phase, resumeOffer, task])

  const onTaskSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      commitTaskAndStartFocus()
    },
    [commitTaskAndStartFocus],
  )

  const skipToBreak = useCallback(() => {
    if (phase !== 'focus') return
    setPhase('break')
    setRemaining(BREAK_SECONDS)
  }, [phase])

  const skipBreak = useCallback(() => {
    if (phase !== 'break') return
    setPhase('idle')
    setRemaining(FOCUS_SECONDS)
  }, [phase])

  const playlist = demoPlaylistForPhase(phase)

  const blockTotal = blockSecondsForPhase(phase)
  const sliceProgress =
    phase !== 'idle' && blockTotal > 0
      ? Math.min(1, Math.max(0, 1 - remaining / blockTotal))
      : 0

  const panelClass =
    'rounded-xl border border-zinc-200/90 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-none'

  const btnPrimary =
    'inline-flex cursor-pointer rounded-lg border-2 border-violet-500/45 bg-violet-500/10 px-5 py-2.5 text-[15px] font-medium text-zinc-900 shadow-sm transition hover:border-violet-500/70 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-zinc-50'

  const btnSecondary =
    'inline-flex cursor-pointer rounded-lg border-2 border-zinc-200 bg-zinc-100 px-5 py-2.5 text-[15px] font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700'

  return (
    <div className="relative flex flex-1 flex-col gap-6 px-5 py-8 pb-12 text-left sm:px-6">
      {resumeOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-dialog-title"
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <h2
              id="resume-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Last session
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {resumeOffer.phase === 'focus' ? (
                <>
                  You have{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left in your focus block. Resume where you left off?
                </>
              ) : (
                <>
                  You have{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left on your break. Continue?
                </>
              )}
            </p>
            {resumeOffer.task.trim() ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Task:{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {resumeOffer.task.trim()}
                </span>
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${btnSecondary} sm:order-1`}
                onClick={handleStartFresh}
              >
                No, start fresh
              </button>
              <button
                type="button"
                className={`${btnPrimary} sm:order-2`}
                onClick={handleResumeLastSession}
              >
                Yes, resume
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-[36rem] px-1 pt-2 text-center" aria-labelledby="task-hero">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
          Hits Different
        </p>
        <form onSubmit={onTaskSubmit} className="flex flex-col items-stretch gap-4">
          <h1
            id="task-hero"
            className="text-balance text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50"
          >
            {phase === 'idle' ? 'Current task' : task.trim() || 'Current task'}
          </h1>
          {(phase === 'idle' || resumeOffer !== null) && (
            <input
              id="task-input"
              name="task"
              type="text"
              aria-labelledby="task-hero"
              className="w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-center text-[17px] leading-snug text-zinc-900 shadow-sm outline-none ring-0 transition placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-80 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-900/80 dark:focus:border-violet-400 dark:focus:ring-violet-400/15 sm:py-4 sm:text-lg"
              placeholder="Name it, then press Enter…"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={phase !== 'idle' || resumeOffer !== null}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="go"
            />
          )}
          {phase === 'idle' && !resumeOffer && (
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
              Timer and playlist start together when you press Enter.
            </p>
          )}
        </form>
      </section>

      <section className={`${panelClass} text-center`} aria-live="polite">
        <div
          className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${phaseBadgeStyles[phase]}`}
          data-phase={phase}
        >
          {phase === 'idle' && 'Ready'}
          {phase === 'focus' && 'Focus'}
          {phase === 'break' && 'Break'}
        </div>
        <div
          className="mb-2 font-mono text-5xl font-medium tabular-nums tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50"
          role="timer"
          aria-atomic="true"
        >
          {formatMmSs(remaining)}
        </div>

        {phase !== 'idle' && blockTotal > 0 && (
          <div className="mb-4 text-left">
            <div className="mb-1 flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Block slice</span>
              <span>
                {formatMmSs(blockTotal - remaining)} / {formatMmSs(blockTotal)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliceProgress * 100)}
            >
              <div
                className="h-full rounded-full bg-violet-500 transition-[width] duration-1000 ease-linear dark:bg-violet-400"
                style={{ width: `${sliceProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        <p className="mb-6 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {phase === 'idle' &&
            `${FOCUS_SECONDS / 60} min focus, then ${BREAK_SECONDS / 60} min break`}
          {phase === 'focus' && 'Stay on task until the timer ends or skip.'}
          {phase === 'break' && 'Step away — break playlist plays below.'}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {phase === 'focus' && (
            <button
              type="button"
              className={btnSecondary}
              onClick={skipToBreak}
            >
              End focus early
            </button>
          )}
          {phase === 'break' && (
            <button type="button" className={btnSecondary} onClick={skipBreak}>
              Skip break
            </button>
          )}
        </div>
      </section>

      {playlist && (
        <section className={panelClass} aria-label="Playlist player">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {playlist.title}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Playback starts automatically; it may begin muted — use the player
            controls to unmute if needed.
          </p>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner">
            <iframe
              key={`${phase}-${playlist.embedUrl}`}
              className="absolute inset-0 h-full w-full border-0"
              title={
                phase === 'focus'
                  ? 'Focus session music'
                  : 'Break session music'
              }
              src={embedUrlWithAutoplay(playlist.embedUrl)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </section>
      )}
    </div>
  )
}
