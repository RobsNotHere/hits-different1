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
    'bg-amber-100 text-amber-900 dark:bg-sky-900/30 dark:text-sky-200',
  focus:
    'border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-200',
  break:
    'border border-amber-200 bg-amber-50 text-amber-900 dark:border-sky-600 dark:bg-sky-950/80 dark:text-sky-200',
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
    'rounded-xl border border-sky-200/90 bg-amber-50/80 p-5 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/40 dark:shadow-none'

  const btnPrimary =
    'inline-flex cursor-pointer rounded-lg border-2 border-sky-500/45 bg-sky-500/10 px-5 py-2.5 text-[15px] font-medium text-sky-950 shadow-sm transition hover:border-sky-500/70 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-50'

  const btnSecondary =
    'inline-flex cursor-pointer rounded-lg border-2 border-amber-200 bg-amber-100 px-5 py-2.5 text-[15px] font-medium text-sky-950 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-100 dark:hover:border-sky-600 dark:hover:bg-sky-900/50'

  return (
    <div className="relative flex flex-1 flex-col gap-6 px-5 py-8 pb-12 text-left sm:px-6">
      {resumeOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/60 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-dialog-title"
            className="w-full max-w-md rounded-xl border border-sky-200 bg-amber-50 p-6 shadow-xl dark:border-sky-900/60 dark:bg-sky-950/60"
          >
            <h2
              id="resume-dialog-title"
              className="text-lg font-semibold text-sky-950 dark:text-sky-50"
            >
              Last session
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-sky-800 dark:text-sky-200">
              {resumeOffer.phase === 'focus' ? (
                <>
                  You have{' '}
                  <strong className="text-sky-950 dark:text-sky-100">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left in your focus block. Resume where you left off?
                </>
              ) : (
                <>
                  You have{' '}
                  <strong className="text-sky-950 dark:text-sky-100">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left on your break. Continue?
                </>
              )}
            </p>
            {resumeOffer.task.trim() ? (
              <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">
                Task:{' '}
                <span className="font-medium text-sky-950 dark:text-sky-100">
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
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-500">
          Hits Different
        </p>
        <form onSubmit={onTaskSubmit} className="flex flex-col items-stretch gap-4">
          <h1
            id="task-hero"
            className="text-balance text-3xl font-semibold leading-tight tracking-tight text-sky-950 sm:text-4xl dark:text-sky-50"
          >
            {phase === 'idle' ? 'Current task' : task.trim() || 'Current task'}
          </h1>
          {(phase === 'idle' || resumeOffer !== null) && (
            <input
              id="task-input"
              name="task"
              type="text"
              aria-labelledby="task-hero"
              className="w-full rounded-xl border border-sky-200/90 bg-amber-50 px-4 py-3.5 text-center text-[17px] leading-snug text-sky-950 shadow-sm outline-none ring-0 transition placeholder:text-sky-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-amber-50 disabled:opacity-80 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:placeholder:text-sky-500 dark:disabled:bg-sky-900/80 dark:focus:border-sky-400 dark:focus:ring-sky-400/15 sm:py-4 sm:text-lg"
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
            <p className="text-sm leading-relaxed text-sky-700 dark:text-sky-500">
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
          className="mb-2 font-mono text-5xl font-medium tabular-nums tracking-tight text-sky-950 sm:text-6xl dark:text-sky-50"
          role="timer"
          aria-atomic="true"
        >
          {formatMmSs(remaining)}
        </div>

        {phase !== 'idle' && blockTotal > 0 && (
          <div className="mb-4 text-left">
            <div className="mb-1 flex justify-between text-xs font-medium text-sky-700 dark:text-sky-200">
              <span>Block slice</span>
              <span>
                {formatMmSs(blockTotal - remaining)} / {formatMmSs(blockTotal)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-sky-900/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliceProgress * 100)}
            >
              <div
                className="h-full rounded-full bg-sky-500 transition-[width] duration-1000 ease-linear dark:bg-sky-400"
                style={{ width: `${sliceProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        <p className="mb-6 text-[15px] leading-relaxed text-sky-800 dark:text-sky-200">
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
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-sky-950 dark:text-sky-100">
            {playlist.title}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-sky-800 dark:text-sky-200">
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
