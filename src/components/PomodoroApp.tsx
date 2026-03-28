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

type AboutTab = 'hitsDifferent' | 'pomodoro' | 'customization'

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

const HITS_DIFFERENT_COPY = [
  'Hits Different introduces a gimmick for distracted adults by combining event features and focus block with your Spotify playlist. Inspired by the success of short-form videos, Hits Different derives your media addiction into a productive task.',
  'The concept is a productivity tool that connects to Spotify or YouTube, takes an existing playlist, and turns it into a roughly 25-minute Pomodoro-style focus block. After the focus block ends, the product would automatically switch the user to a designated break playlist. This gives the project a clear product concept with a behavior loop, user value, and room for future feature expansion.',
]

const phaseBadgeStyles: Record<Phase, string> = {
  idle: 'bg-zinc-200 text-zinc-800',
  focus: 'bg-zinc-300 text-zinc-900',
  break: 'bg-zinc-200 text-zinc-800',
}

const longBreakBadgeClass = 'bg-zinc-300 text-zinc-900'

export function PomodoroApp() {
  const [aboutTab, setAboutTab] = useState<AboutTab>('hitsDifferent')
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

  const btnPrimary =
    'inline-flex cursor-pointer border border-black bg-black px-5 py-2.5 text-sm font-normal text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

  const btnSecondary =
    'inline-flex cursor-pointer border border-zinc-400 bg-white px-5 py-2.5 text-sm font-normal text-black transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500'

  const aboutNavPill =
    'rounded-full border border-black px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
  const aboutNavPillActive = 'bg-black text-white'
  const aboutNavPillIdle =
    'bg-transparent text-black hover:bg-black/[0.04] active:bg-black/[0.08]'

  const gradientMode: 'idle' | 'focus' | 'break' | 'long-break' =
    phase === 'focus'
      ? 'focus'
      : phase === 'break'
        ? isLongBreak
          ? 'long-break'
          : 'break'
        : 'idle'

  const WhatIsAside = () => (
    <aside className="lg:pt-2">
      <h2 className="mb-6 text-base font-normal text-zinc-500">
        What is Hits Different
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-zinc-400">
        {HITS_DIFFERENT_COPY.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </div>
    </aside>
  )

  /** Right column: driven by About nav tabs; flows with page scroll. */
  const AboutRightAside = () => (
    <aside className="lg:pt-2">
      {aboutTab === 'hitsDifferent' && (
        <div
          id="about-panel-hits-different"
          role="tabpanel"
          aria-labelledby="about-tab-hits-different"
        >
          <h2 className="mb-6 text-base font-normal text-zinc-500">
            Hits Different
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-zinc-600">
            {HITS_DIFFERENT_COPY.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
        </div>
      )}
      {aboutTab === 'pomodoro' && (
        <div
          id="about-panel-pomodoro"
          role="tabpanel"
          aria-labelledby="about-tab-pomodoro"
        >
          <h2 className="mb-6 text-base font-normal text-zinc-500">
            Pomodoro technique
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Timed work blocks with short breaks—stay sharp without burning out.
            Hits Different chains several focus rounds with playlist-backed
            breaks so momentum stays human.
          </p>
        </div>
      )}
      {aboutTab === 'customization' && (
        <div
          id="about-panel-customization"
          role="tabpanel"
          aria-labelledby="about-tab-customization"
        >
          <h2 className="mb-6 text-base font-normal text-zinc-500">
            Customization
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            Tune focus length, short and long breaks, and how many rounds make
            a cycle in{' '}
            <code className="rounded border border-zinc-300 bg-white/80 px-1 py-0.5 font-mono text-[13px] text-black">
              src/lib/config.ts
            </code>
            — then rebuild. Demo playlists live there too.
          </p>
        </div>
      )}
    </aside>
  )

  const taskInputClass = showLanding
    ? 'w-full border-0 border-b border-black bg-transparent px-0 py-3 text-left text-2xl font-medium uppercase tracking-wide text-black outline-none placeholder:text-zinc-400 focus:border-black focus:ring-0 sm:text-3xl'
    : 'w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 text-left text-base text-black outline-none placeholder:text-zinc-400 focus:border-black disabled:opacity-60 sm:text-lg'

  return (
    <div
      className={
        showLanding
          ? 'relative flex min-h-[calc(100svh-4.5rem)] flex-1 flex-col bg-white'
          : 'relative z-[1] flex min-h-[calc(100svh-4.5rem)] flex-1 flex-col bg-transparent'
      }
    >
      {!showLanding && (
        <>
          <div
            aria-hidden
            className={`session-gradient-layer session-gradient-layer--idle ${gradientMode === 'idle' ? 'is-visible' : ''}`}
          />
          <div
            aria-hidden
            className={`session-gradient-layer session-gradient-layer--focus ${gradientMode === 'focus' ? 'is-visible' : ''}`}
          />
          <div
            aria-hidden
            className={`session-gradient-layer session-gradient-layer--break ${gradientMode === 'break' ? 'is-visible' : ''}`}
          />
          <div
            aria-hidden
            className={`session-gradient-layer session-gradient-layer--long-break ${gradientMode === 'long-break' ? 'is-visible' : ''}`}
          />
        </>
      )}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {resumeOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-dialog-title"
            className="w-full max-w-md bg-white p-8 shadow-none"
          >
            <h2
              id="resume-dialog-title"
              className="text-lg font-normal text-black"
            >
              Last session
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {resumeOffer.phase === 'focus' ? (
                <>
                  You have{' '}
                  <strong className="font-medium text-black">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left in your focus block. Resume where you left off?
                </>
              ) : (
                <>
                  You have{' '}
                  <strong className="font-medium text-black">
                    {formatMmSs(resumeOffer.remaining)}
                  </strong>{' '}
                  left on your break. Continue?
                </>
              )}
            </p>
            {resumeOffer.task.trim() ? (
              <p className="mt-2 text-sm text-zinc-500">
                Task:{' '}
                <span className="font-medium text-black">
                  {resumeOffer.task.trim()}
                </span>
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
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

        {showLanding ? (
        <div className="grid flex-1 grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[3fr_2fr] lg:gap-20 lg:px-10 lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-normal text-zinc-500">Current Task</p>
            <form onSubmit={onTaskSubmit} className="flex flex-col gap-6">
              <h1
                id="task-hero"
                className="text-balance text-4xl font-bold uppercase leading-[1.05] tracking-tight text-black sm:text-5xl lg:text-6xl"
              >
                DEEP WORK, CHOREOGRAPHED BY YOU.
              </h1>
              <input
                id="task-input"
                name="task"
                type="text"
                aria-labelledby="task-hero"
                className={taskInputClass}
                placeholder="WHAT ARE YOU WORKING ON?"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={200}
                autoComplete="off"
                enterKeyHint="go"
              />
              <p className="text-sm text-zinc-500">
                Type a task to start your session.
              </p>
            </form>
          </div>
          <WhatIsAside />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[3fr_2fr] lg:gap-20 lg:px-10">
            <div>
              <p className="mb-3 text-sm font-normal text-zinc-500">Current Task</p>
              <form onSubmit={onTaskSubmit} className="mb-12">
                <h1
                  id="task-hero"
                  className="text-balance text-4xl font-bold uppercase leading-[1.05] tracking-tight text-black sm:text-5xl lg:text-6xl"
                >
                  {phase === 'idle'
                    ? 'CURRENT TASK'
                    : (task.trim() || 'CURRENT TASK').toUpperCase()}
                </h1>
                {(phase === 'idle' || resumeOffer !== null) && (
                  <input
                    id="task-input"
                    name="task"
                    type="text"
                    aria-labelledby="task-hero"
                    className={`mt-8 ${taskInputClass}`}
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
                  <p className="mt-4 text-sm text-zinc-500">
                    Timer and playlist start together when you press Enter.
                  </p>
                )}
              </form>

              <p className="mb-4 text-sm font-normal text-zinc-600">About</p>
              <div
                className="mb-4 flex flex-wrap gap-2"
                role="tablist"
                aria-label="About sections"
              >
                <button
                  type="button"
                  role="tab"
                  id="about-tab-hits-different"
                  aria-selected={aboutTab === 'hitsDifferent'}
                  aria-controls="about-panel-hits-different"
                  className={`${aboutNavPill} max-w-full whitespace-normal text-center sm:whitespace-nowrap ${aboutTab === 'hitsDifferent' ? aboutNavPillActive : aboutNavPillIdle}`}
                  onClick={() => setAboutTab('hitsDifferent')}
                >
                  Hits Different
                </button>
                <button
                  type="button"
                  role="tab"
                  id="about-tab-pomodoro"
                  aria-selected={aboutTab === 'pomodoro'}
                  aria-controls="about-panel-pomodoro"
                  className={`${aboutNavPill} ${aboutTab === 'pomodoro' ? aboutNavPillActive : aboutNavPillIdle}`}
                  onClick={() => setAboutTab('pomodoro')}
                >
                  Pomodoro technique
                </button>
                <button
                  type="button"
                  role="tab"
                  id="about-tab-customization"
                  aria-selected={aboutTab === 'customization'}
                  aria-controls="about-panel-customization"
                  className={`${aboutNavPill} ${aboutTab === 'customization' ? aboutNavPillActive : aboutNavPillIdle}`}
                  onClick={() => setAboutTab('customization')}
                >
                  Customization
                </button>
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 lg:hidden">
                Details for the selected topic appear in the section below.
              </p>
            </div>
            <AboutRightAside />
          </div>

          <div className="space-y-12 px-6 pb-12 lg:px-10">
            <section className="text-left" aria-live="polite">
              <div
                key={`cycle-${currentCycle}-${phase}`}
                className="quota-swipe-down mb-6 inline-block text-xl font-semibold uppercase tracking-wide text-black sm:text-2xl"
              >
                {cycleLabel}
              </div>
              <div
                className={`mb-4 inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                  isLongBreak ? longBreakBadgeClass : phaseBadgeStyles[phase]
                }`}
                data-phase={phase}
              >
                {phase === 'idle' && 'Ready'}
                {phase === 'focus' && 'Focus'}
                {phase === 'break' &&
                  (isLongBreak ? 'Long break' : 'Short break')}
              </div>
              {phase !== 'idle' && (
                <p className="mb-2 text-sm text-zinc-500">
                  Cycle {currentCycle} of {FOCUS_CYCLES}
                  {phase === 'focus'
                    ? ' · focus'
                    : isLongBreak
                      ? ' · long break'
                      : ' · short break'}
                </p>
              )}
              <div
                className="mb-6 font-mono text-5xl font-medium tabular-nums tracking-tight text-black sm:text-6xl"
                role="timer"
                aria-atomic="true"
              >
                {formatMmSs(remaining)}
              </div>

              {phase !== 'idle' && blockTotal > 0 && (
                <div className="mb-6 max-w-md">
                  <div className="mb-1 flex justify-between text-xs text-zinc-500">
                    <span>Block slice</span>
                    <span>
                      {formatMmSs(blockTotal - remaining)} /{' '}
                      {formatMmSs(blockTotal)}
                    </span>
                  </div>
                  <div
                    className="h-1 overflow-hidden bg-zinc-200"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(sliceProgress * 100)}
                  >
                    <div
                      className="h-full bg-black transition-[width] duration-1000 ease-linear"
                      style={{ width: `${sliceProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="mb-6 max-w-xl text-sm leading-relaxed text-zinc-500">
                {phase === 'idle' &&
                  `${FOCUS_CYCLES} focus blocks (${FOCUS_SECONDS / 60} min each). After blocks 1–3: ${BREAK_SECONDS / 60} min breaks. After block ${FOCUS_CYCLES}: a ${LONG_BREAK_SECONDS / 60} min long break — then name a new task for the next round.`}
                {phase === 'focus' &&
                  'Stay on task until the timer ends or skip.'}
                {phase === 'break' &&
                  (isLongBreak
                    ? 'Long break — step away. When it ends, you’ll set a new task for the next round.'
                    : 'Short break — playlist plays below.')}
              </p>

              <div className="flex flex-wrap gap-3">
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
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={skipBreak}
                  >
                    {isLongBreak ? 'Skip long break' : 'Skip short break'}
                  </button>
                )}
              </div>
            </section>

            {playlist && (
              <section aria-label="Playlist player">
                <h2 className="mb-2 text-base font-normal text-black">
                  {playlist.title}
                </h2>
                <p className="mb-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                  Playback starts automatically; it may begin muted — use the
                  player controls to unmute if needed.
                </p>
                <div className="relative aspect-video w-full max-w-3xl overflow-hidden bg-black">
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
          </div>
        </>
        )}

        <footer
          className="relative left-1/2 z-[1] mt-auto h-14 w-screen max-w-[100vw] shrink-0 -translate-x-1/2 bg-black"
          aria-hidden
        />
      </div>
    </div>
  )
}
