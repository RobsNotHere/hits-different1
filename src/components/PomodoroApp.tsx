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
  FOCUS_CYCLES,
  FOCUS_SECONDS,
  LONG_BREAK_SECONDS,
  blockTotalSecondsForState,
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

function formatCycleOrdinal(cycle: number): string {
  const mod10 = cycle % 10
  const mod100 = cycle % 100
  if (mod10 === 1 && mod100 !== 11) return `${cycle}st`
  if (mod10 === 2 && mod100 !== 12) return `${cycle}nd`
  if (mod10 === 3 && mod100 !== 13) return `${cycle}rd`
  return `${cycle}th`
}

const phaseBadgeStyles: Record<Phase, string> = {
  idle:
    'border border-violet-200/80 bg-gradient-to-r from-violet-100/90 to-fuchsia-100/80 text-violet-950 shadow-sm shadow-violet-200/40',
  focus:
    'border border-indigo-200/90 bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-950 shadow-sm shadow-indigo-200/50',
  break:
    'border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-100 text-amber-950 shadow-sm shadow-amber-200/40',
}

const longBreakBadgeClass =
  'border border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-950 shadow-sm shadow-emerald-200/40'

export function PomodoroApp() {
  const [task, setTask] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [focusIndex, setFocusIndex] = useState(0)
  const [hasStartedSession, setHasStartedSession] = useState(false)
  const [remaining, setRemaining] = useState(FOCUS_SECONDS)
  const [hydrated, setHydrated] = useState(false)
  const [resumeOffer, setResumeOffer] = useState<PersistedSession | null>(null)

  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const focusIndexRef = useRef(focusIndex)
  useEffect(() => {
    focusIndexRef.current = focusIndex
  }, [focusIndex])

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
          const fi = focusIndexRef.current
          if (p === 'focus') {
            setPhase('break')
            return fi < FOCUS_CYCLES - 1 ? BREAK_SECONDS : LONG_BREAK_SECONDS
          }
          if (p === 'break') {
            if (fi < FOCUS_CYCLES - 1) {
              const next = fi + 1
              focusIndexRef.current = next
              setFocusIndex(next)
              setPhase('focus')
              return FOCUS_SECONDS
            }
            focusIndexRef.current = 0
            setFocusIndex(0)
            setPhase('idle')
            setTask('')
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
      savePersistedSession({ phase, remaining, task, focusIndex })
    } else {
      clearPersistedSession()
    }
  }, [phase, remaining, task, focusIndex, hydrated, resumeOffer])

  const handleResumeLastSession = useCallback(() => {
    if (!resumeOffer) return
    setTask(resumeOffer.task)
    setPhase(resumeOffer.phase)
    setHasStartedSession(true)
    setRemaining(resumeOffer.remaining)
    focusIndexRef.current = resumeOffer.focusIndex
    setFocusIndex(resumeOffer.focusIndex)
    setResumeOffer(null)
  }, [resumeOffer])

  const handleStartFresh = useCallback(() => {
    clearPersistedSession()
    setResumeOffer(null)
    setPhase('idle')
    setHasStartedSession(false)
    focusIndexRef.current = 0
    setFocusIndex(0)
    setRemaining(FOCUS_SECONDS)
    setTask('')
  }, [])

  const commitTaskAndStartFocus = useCallback(() => {
    if (phase !== 'idle' || resumeOffer !== null) return
    if (!task.trim()) return
    setHasStartedSession(true)
    focusIndexRef.current = 0
    setFocusIndex(0)
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
    const fi = focusIndexRef.current
    setPhase('break')
    setRemaining(fi < FOCUS_CYCLES - 1 ? BREAK_SECONDS : LONG_BREAK_SECONDS)
  }, [phase])

  const skipBreak = useCallback(() => {
    if (phase !== 'break') return
    const fi = focusIndexRef.current
    if (fi < FOCUS_CYCLES - 1) {
      const next = fi + 1
      focusIndexRef.current = next
      setFocusIndex(next)
      setPhase('focus')
      setRemaining(FOCUS_SECONDS)
      return
    }
    focusIndexRef.current = 0
    setFocusIndex(0)
    setPhase('idle')
    setTask('')
    setRemaining(FOCUS_SECONDS)
  }, [phase])

  const playlist = demoPlaylistForPhase(phase)

  const blockTotal = blockTotalSecondsForState(phase, focusIndex)
  const isLongBreak = phase === 'break' && focusIndex === FOCUS_CYCLES - 1
  const currentCycle = Math.min(focusIndex + 1, FOCUS_CYCLES)
  const cycleLabel = `${formatCycleOrdinal(currentCycle)} cycle`
  const sliceProgress =
    phase !== 'idle' && blockTotal > 0
      ? Math.min(1, Math.max(0, 1 - remaining / blockTotal))
      : 0
  const showLanding = hydrated && phase === 'idle' && !resumeOffer && !hasStartedSession

  useEffect(() => {
    if (phase === 'idle') {
      document.title = 'Hits Different — focus blocks'
      return
    }
    const label = phase === 'focus' ? 'Focus' : isLongBreak ? 'Long break' : 'Break'
    const phaseIcon = phase === 'focus' ? '🧑‍💻' : '🧘'
    const taskLabel = task.trim() ? task.trim() : 'Untitled task'
    document.title = `${phaseIcon} ${taskLabel} • ${formatMmSs(remaining)} • ${formatCycleOrdinal(currentCycle)} cycle • ${label}`
  }, [phase, remaining, isLongBreak, task, currentCycle])

  const panelClass = 'illustrative-panel'

  const btnPrimary =
    'inline-flex cursor-pointer rounded-xl border border-violet-700/30 bg-gradient-to-b from-violet-700 to-violet-900 px-5 py-2.5 text-[15px] font-medium text-white shadow-md shadow-violet-400/35 transition hover:from-violet-600 hover:to-violet-800 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600'

  const btnSecondary =
    'inline-flex cursor-pointer rounded-xl border-2 border-violet-200 bg-white/90 px-5 py-2.5 text-[15px] font-medium text-violet-950 shadow-sm shadow-violet-100 transition hover:border-violet-300 hover:bg-violet-50/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400'

  const waveBars = Array.from({ length: 12 }, (_, i) => i)
  const taskInputClass = showLanding
    ? 'w-full border-0 bg-transparent px-2 py-3 text-center text-2xl font-medium leading-snug tracking-wide text-zinc-900 outline-none ring-0 transition placeholder:text-violet-400/80 focus:ring-0 sm:text-3xl'
    : 'w-full rounded-2xl border border-violet-200/80 bg-white/90 px-4 py-3.5 text-center text-[17px] leading-snug text-zinc-900 shadow-md shadow-violet-100/50 outline-none ring-0 transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-300/40 disabled:cursor-not-allowed disabled:bg-violet-50/50 disabled:opacity-80 sm:py-4 sm:text-lg'

  return (
    <div className="relative flex flex-1 flex-col justify-center gap-6 px-5 py-8 pb-12 text-left sm:px-6">
      {resumeOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-dialog-title"
            className="illustrative-panel w-full max-w-md p-6 shadow-2xl shadow-violet-300/30"
          >
            <h2
              id="resume-dialog-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Last session
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
              {resumeOffer.phase === 'focus' ? (
                <>
                  You have{' '}
                  <strong className="text-zinc-900">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left in your focus block. Resume where you left off?
                </>
              ) : (
                <>
                  You have{' '}
                  <strong className="text-zinc-900">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left on your break. Continue?
                </>
              )}
            </p>
            {resumeOffer.task.trim() ? (
              <p className="mt-2 text-sm text-zinc-600">
                Task:{' '}
                <span className="font-medium text-zinc-900">
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
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-violet-600/90">
          Hits Different
        </p>
        <form onSubmit={onTaskSubmit} className="flex flex-col items-stretch gap-4">
          <h1
            id="task-hero"
            className="hero-flourish text-balance text-4xl font-semibold uppercase leading-tight tracking-[0.06em] text-zinc-900 sm:text-5xl"
          >
            {showLanding
              ? 'DEEP WORK, CHOREOGRAPHED BY YOU.'
              : phase === 'idle'
                ? 'CURRENT TASK'
                : (task.trim() || 'CURRENT TASK').toUpperCase()}
          </h1>
          {(phase === 'idle' || resumeOffer !== null) && (
            <input
              id="task-input"
              name="task"
              type="text"
              aria-labelledby="task-hero"
              className={taskInputClass}
              placeholder={
                showLanding
                  ? 'WHAT ARE YOU WORKING ON?'
                  : 'Name it, then press Enter…'
              }
              value={task}
              onChange={(e) => setTask(e.target.value)}
              disabled={phase !== 'idle' || resumeOffer !== null}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="go"
            />
          )}
          {phase === 'idle' && !resumeOffer && (
            <p className="text-sm leading-relaxed text-zinc-600">
              {showLanding
                ? 'Type a task to start your session.'
                : 'Timer and playlist start together when you press Enter.'}
            </p>
          )}
        </form>
      </section>

      {showLanding ? null : (
        <>
          <section className={`${panelClass} text-center`} aria-label="Quota">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/85">
              Quota
            </p>
            <div
              key={`quota-${currentCycle}`}
              className="quota-swipe-down mt-2 inline-block rounded-2xl border border-violet-200/90 bg-gradient-to-br from-white to-violet-50 px-5 py-2.5 text-base font-semibold text-violet-950 shadow-md shadow-violet-200/50"
            >
              {cycleLabel}
            </div>
          </section>

          <section className={`${panelClass} text-center`} aria-live="polite">
        <div
          className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isLongBreak ? longBreakBadgeClass : phaseBadgeStyles[phase]
          }`}
          data-phase={phase}
        >
          {phase === 'idle' && 'Ready'}
          {phase === 'focus' && 'Focus'}
          {phase === 'break' && (isLongBreak ? 'Long break' : 'Short break')}
        </div>
        {phase !== 'idle' && (
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Cycle {currentCycle} of {FOCUS_CYCLES}
            {phase === 'focus' ? ' · focus' : isLongBreak ? ' · long break' : ' · short break'}
          </p>
        )}
        <div
          className="mb-2 font-mono text-5xl font-medium tabular-nums tracking-tight text-zinc-900 sm:text-6xl"
          role="timer"
          aria-atomic="true"
        >
          {formatMmSs(remaining)}
        </div>

        {phase !== 'idle' && blockTotal > 0 && (
          <div className="mb-4 text-left">
            <div className="mb-1 flex justify-between text-xs font-medium text-zinc-600">
              <span>Block slice</span>
              <span>
                {formatMmSs(blockTotal - remaining)} / {formatMmSs(blockTotal)}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-violet-100 via-amber-100 to-emerald-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliceProgress * 100)}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 transition-[width] duration-1000 ease-linear"
                style={{ width: `${sliceProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        <p className="mb-6 text-[15px] leading-relaxed text-zinc-600">
          {phase === 'idle' &&
            `${FOCUS_CYCLES} focus blocks (${FOCUS_SECONDS / 60} min each). After blocks 1–3: ${BREAK_SECONDS / 60} min breaks. After block ${FOCUS_CYCLES}: a ${LONG_BREAK_SECONDS / 60} min long break — then name a new task for the next round.`}
          {phase === 'focus' && 'Stay on task until the timer ends or skip.'}
          {phase === 'break' &&
            (isLongBreak
              ? 'Long break — step away. When it ends, you’ll set a new task for the next round.'
              : 'Short break — break playlist plays below.')}
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
              {isLongBreak ? 'Skip long break' : 'Skip short break'}
            </button>
          )}
        </div>
          </section>

          {playlist && (
            <section className={panelClass} aria-label="Playlist player">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900">
            {playlist.title}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-600">
            Playback starts automatically; it may begin muted — use the player
            controls to unmute if needed.
          </p>
          <div className="mb-4 rounded-2xl border border-violet-100/90 bg-gradient-to-br from-white to-fuchsia-50/40 px-3 py-3 shadow-inner shadow-violet-100/60">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600/80">
              Sound wave
            </p>
            <div
              className="rainbow-wave"
              role="img"
              aria-label="Animated rainbow sound wave"
            >
              {waveBars.map((bar) => (
                <span
                  key={bar}
                  className="rainbow-wave__bar"
                  style={{ animationDelay: `${bar * 90}ms` }}
                />
              ))}
            </div>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner">
            <iframe
              key={`${phase}-${focusIndex}-${playlist.embedUrl}`}
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
        </>
      )}
    </div>
  )
}
