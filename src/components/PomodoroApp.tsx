'use client'

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
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

/** Memo line + 3-word hero (`.hero-title`, Orbitron, up to 128px). */
const HERO_MEMO = 'Memo · demo build · playlist focus mode'
const HERO_TITLE = 'Focus Hits Different'

const HITS_DIFFERENT_COPY = [
  'Hits Different introduces a gimmick for distracted adults by combining event features and focus block with your Spotify playlist. Inspired by the success of short-form videos, Hits Different derives your media addiction into a productive task.',
  'The concept is a productivity tool that connects to Spotify or YouTube, takes an existing playlist, and turns it into a roughly 25-minute Pomodoro-style focus block. After the focus block ends, the product would automatically switch the user to a designated break playlist. This gives the project a clear product concept with a behavior loop, user value, and room for future feature expansion.',
] as const

const FOCUS_MINUTES = FOCUS_SECONDS / 60
const BREAK_MINUTES = BREAK_SECONDS / 60
const LONG_BREAK_MINUTES = LONG_BREAK_SECONDS / 60

const phaseBadgeStyles = {
  idle: 'bg-zinc-200 text-zinc-800',
  break: 'bg-zinc-200 text-zinc-800',
} as const

const longBreakBadgeClass = 'bg-zinc-300 text-zinc-900'

const BTN_PRIMARY =
  'inline-flex cursor-pointer border border-black bg-black px-5 py-2.5 text-sm font-normal text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

const BTN_SECONDARY =
  'inline-flex cursor-pointer border border-zinc-400 bg-white px-5 py-2.5 text-sm font-normal text-black transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500'

const ABOUT_NAV_PILL =
  'rounded-full border border-black px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'
const ABOUT_NAV_PILL_ACTIVE = 'bg-black text-white'
const ABOUT_NAV_PILL_IDLE =
  'bg-transparent text-black hover:bg-black/[0.04] active:bg-black/[0.08]'

const AboutRightAside = memo(function AboutRightAside({
  activeTab,
}: {
  activeTab: AboutTab
}) {
  return (
    <aside className="lg:pt-2">
      {activeTab === 'hitsDifferent' && (
        <div
          id="about-panel-hits-different"
          role="tabpanel"
          aria-labelledby="about-tab-hits-different"
        >
          <h2 className="mb-6 text-base font-normal text-zinc-500">
            Hits Different
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-zinc-600">
            {HITS_DIFFERENT_COPY.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'pomodoro' && (
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
      {activeTab === 'customization' && (
        <div
          id="about-panel-customization"
          role="tabpanel"
          aria-labelledby="about-tab-customization"
        >
          <h2 className="mb-6 text-base font-normal text-zinc-500">
            Customization
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            For developers: edit focus length, short and long breaks, round
            count, and demo playlist URLs in{' '}
            <code className="rounded border border-zinc-300 bg-white/80 px-1 py-0.5 font-mono text-[13px] text-black">
              src/lib/config.ts
            </code>
            , then rebuild the app.
          </p>
        </div>
      )}
    </aside>
  )
})

const PlaylistSection = memo(function PlaylistSection({
  phase,
  focusIndex,
  embedUrl,
  title,
}: {
  phase: Phase
  focusIndex: number
  embedUrl: string
  title: string
}) {
  return (
    <section aria-label="Playlist player">
      <h2 className="mb-2 text-base font-normal text-black">{title}</h2>
      <p className="mb-4 max-w-xl text-sm leading-relaxed text-zinc-400">
        Playback starts automatically; it may begin muted — use the player
        controls to unmute if needed.
      </p>
      <div className="relative aspect-video w-full max-w-3xl overflow-hidden bg-black">
        <iframe
          key={`${phase}-${focusIndex}-${embedUrl}`}
          className="absolute inset-0 h-full w-full border-0"
          title={
            phase === 'focus' ? 'Focus session music' : 'Break session music'
          }
          src={embedUrlWithAutoplay(embedUrl)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  )
})

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
  const focusIndexRef = useRef(focusIndex)
  useEffect(() => {
    phaseRef.current = phase
    focusIndexRef.current = focusIndex
  }, [phase, focusIndex])

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

  const playlist = useMemo(() => demoPlaylistForPhase(phase), [phase])

  const blockTotal = blockTotalSecondsForState(phase, focusIndex)
  const isLongBreak = phase === 'break' && focusIndex === FOCUS_CYCLES - 1
  const currentCycle = Math.min(focusIndex + 1, FOCUS_CYCLES)
  const cycleLabel = `${formatCycleOrdinal(currentCycle)} cycle`
  const sliceProgress =
    phase !== 'idle' && blockTotal > 0
      ? Math.min(1, Math.max(0, 1 - remaining / blockTotal))
      : 0
  const showLanding =
    hydrated && phase === 'idle' && !resumeOffer && !hasStartedSession

  useEffect(() => {
    if (phase === 'idle') {
      document.title = 'Hits Different — focus blocks'
      return
    }
    const label =
      phase === 'focus' ? 'Focus' : isLongBreak ? 'Long break' : 'Break'
    const phaseIcon = phase === 'focus' ? '🧑‍💻' : '🧘'
    const taskLabel = task.trim() ? task.trim() : 'Untitled task'
    document.title = `${phaseIcon} ${taskLabel} • ${formatMmSs(remaining)} • ${formatCycleOrdinal(currentCycle)} cycle • ${label}`
  }, [phase, remaining, isLongBreak, task, currentCycle])

  const taskInputClass = showLanding
    ? 'w-full border-0 border-b border-black bg-transparent px-0 py-3 text-left text-2xl font-medium tracking-wide text-black outline-none placeholder:text-xs placeholder:uppercase placeholder:tracking-wide placeholder:text-zinc-400 focus:border-black focus:ring-0 sm:text-3xl sm:placeholder:text-sm'
    : 'w-full border-0 border-b border-zinc-300 bg-transparent px-0 py-3 text-left text-base text-black outline-none placeholder:text-xs placeholder:uppercase placeholder:tracking-wide placeholder:text-zinc-400 focus:border-black disabled:opacity-60 sm:text-lg'

  const selectAboutTab = useCallback((tab: AboutTab) => {
    setAboutTab(tab)
  }, [])

  return (
    <div className="relative flex min-h-[calc(100svh-4.5rem)] flex-1 flex-col bg-pink-50">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {resumeOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
                  className={`${BTN_SECONDARY} sm:order-1`}
                  onClick={handleStartFresh}
                >
                  No, start fresh
                </button>
                <button
                  type="button"
                  className={`${BTN_PRIMARY} sm:order-2`}
                  onClick={handleResumeLastSession}
                >
                  Yes, resume
                </button>
              </div>
            </div>
          </div>
        )}

        {showLanding ? (
          <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-10 lg:py-14">
            <form
              onSubmit={onTaskSubmit}
              className="mx-auto flex w-full max-w-5xl flex-col gap-6"
            >
              <p className="hero-memo">{HERO_MEMO}</p>
              <h1
                id="task-hero"
                className="hero-title text-balance"
              >
                {HERO_TITLE}
              </h1>
              <p className="text-sm font-normal text-zinc-500">
                Name what you are working on, then press Enter to start focus
                and music together.
              </p>
              <input
                id="task-input"
                name="task"
                type="text"
                aria-labelledby="task-hero"
                className={taskInputClass}
                placeholder="What are you working on?"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={200}
                autoComplete="off"
                enterKeyHint="go"
              />
            </form>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[3fr_2fr] lg:gap-20 lg:px-10">
              <div className={resumeOffer ? 'lg:col-span-2 lg:max-w-2xl' : ''}>
                {resumeOffer ? (
                  <div className="mb-12">
                    <p className="mb-3 text-sm font-normal text-zinc-500">
                      Saved session
                    </p>
                    <h1
                      id="task-hero"
                      className="text-balance text-3xl font-bold uppercase leading-[1.1] tracking-tight text-black sm:text-4xl"
                    >
                      Pick up where you left off
                    </h1>
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
                      Use the dialog to resume your timer or start fresh. This
                      page stays dimmed until you choose.
                    </p>
                  </div>
                ) : (
                  <>
                    {phase === 'idle' ? (
                      <p className="hero-memo">{HERO_MEMO}</p>
                    ) : (
                      <p className="mb-3 text-sm font-normal text-zinc-500">
                        Current task
                      </p>
                    )}
                    <form onSubmit={onTaskSubmit} className="mb-12">
                      <h1
                        id="task-hero"
                        className={
                          phase === 'idle'
                            ? 'hero-title text-balance'
                            : 'hero-title-task text-balance'
                        }
                      >
                        {phase === 'idle'
                          ? HERO_TITLE
                          : (task.trim() || 'UNTITLED TASK').toUpperCase()}
                      </h1>
                      {phase === 'idle' && (
                        <input
                          id="task-input"
                          name="task"
                          type="text"
                          aria-labelledby="task-hero"
                          className={`mt-8 ${taskInputClass}`}
                          placeholder="Type a task, then press Enter…"
                          value={task}
                          onChange={(e) => setTask(e.target.value)}
                          maxLength={200}
                          autoComplete="off"
                          enterKeyHint="go"
                        />
                      )}
                      {phase === 'idle' && (
                        <p className="mt-4 text-sm text-zinc-500">
                          Each focus block is {FOCUS_MINUTES} minutes with a demo
                          playlist. Press Enter when you are ready.
                        </p>
                      )}
                    </form>

                    <p className="mb-4 text-sm font-normal text-zinc-600">
                      About
                    </p>
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
                        className={`${ABOUT_NAV_PILL} max-w-full whitespace-normal text-center sm:whitespace-nowrap ${aboutTab === 'hitsDifferent' ? ABOUT_NAV_PILL_ACTIVE : ABOUT_NAV_PILL_IDLE}`}
                        onClick={() => selectAboutTab('hitsDifferent')}
                      >
                        Hits Different
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="about-tab-pomodoro"
                        aria-selected={aboutTab === 'pomodoro'}
                        aria-controls="about-panel-pomodoro"
                        className={`${ABOUT_NAV_PILL} ${aboutTab === 'pomodoro' ? ABOUT_NAV_PILL_ACTIVE : ABOUT_NAV_PILL_IDLE}`}
                        onClick={() => selectAboutTab('pomodoro')}
                      >
                        Pomodoro technique
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="about-tab-customization"
                        aria-selected={aboutTab === 'customization'}
                        aria-controls="about-panel-customization"
                        className={`${ABOUT_NAV_PILL} ${aboutTab === 'customization' ? ABOUT_NAV_PILL_ACTIVE : ABOUT_NAV_PILL_IDLE}`}
                        onClick={() => selectAboutTab('customization')}
                      >
                        Customization
                      </button>
                    </div>
                    <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 lg:hidden">
                      The selected topic opens in the next section on this page.
                    </p>
                  </>
                )}
              </div>
              {!resumeOffer && <AboutRightAside activeTab={aboutTab} />}
            </div>

            <div className="space-y-12 px-6 pb-12 lg:px-10">
              <section className="text-left" aria-live="polite">
                <div
                  key={`cycle-${currentCycle}-${phase}`}
                  className="quota-swipe-down mb-6 inline-block text-xl font-semibold uppercase tracking-wide text-black sm:text-2xl"
                >
                  {cycleLabel}
                </div>
                {phase !== 'focus' && (
                  <div
                    className={`mb-4 inline-block px-2 py-1 text-xs font-semibold uppercase tracking-wider ${
                      phase === 'idle'
                        ? phaseBadgeStyles.idle
                        : isLongBreak
                          ? longBreakBadgeClass
                          : phaseBadgeStyles.break
                    }`}
                  >
                    {phase === 'idle' && 'Ready'}
                    {phase === 'break' &&
                      (isLongBreak ? 'Long break' : 'Short break')}
                  </div>
                )}
                {phase !== 'idle' && (
                  <p className="mb-2 text-sm text-zinc-500">
                    Cycle {currentCycle} of {FOCUS_CYCLES}
                    {phase === 'break' &&
                      (isLongBreak ? ' · long break' : ' · short break')}
                  </p>
                )}
                <div
                  className={`mb-6 font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-6xl ${
                    phase === 'idle' ? 'text-zinc-400' : 'text-black'
                  }`}
                  role="timer"
                  aria-atomic="true"
                  aria-label={
                    phase === 'idle'
                      ? 'Timer idle until you start the next focus block'
                      : `Time remaining: ${formatMmSs(remaining)}`
                  }
                >
                  {phase === 'idle' ? '--:--' : formatMmSs(remaining)}
                </div>

                {phase !== 'idle' && blockTotal > 0 && (
                  <div className="mb-6 max-w-md">
                    <div className="mb-1 flex justify-between text-xs text-zinc-500">
                      <span>Time in this block</span>
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
                    `${FOCUS_CYCLES} focus blocks (${FOCUS_MINUTES} min each). After blocks 1–3: ${BREAK_MINUTES} min breaks. After block ${FOCUS_CYCLES}: a ${LONG_BREAK_MINUTES} min long break — then name a new task for the next round.`}
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
                      className={BTN_SECONDARY}
                      onClick={skipToBreak}
                    >
                      End focus early
                    </button>
                  )}
                  {phase === 'break' && (
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={skipBreak}
                    >
                      {isLongBreak ? 'Skip long break' : 'Skip short break'}
                    </button>
                  )}
                </div>
              </section>

              {playlist && (
                <PlaylistSection
                  phase={phase}
                  focusIndex={focusIndex}
                  embedUrl={playlist.embedUrl}
                  title={playlist.title}
                />
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
