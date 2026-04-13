'use client'

import { cn } from '@/lib/cn'
import {
  ArrowRight,
  ChevronDown,
  Download,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useUser } from '@/context/UserContext'
import { useSessionTimerDocumentMeta } from '@/hooks/useSessionTimerDocumentMeta'
import { useSpotifyPlaybackNotice } from '@/hooks/useSpotifyPlaybackNotice'
import { SpotifyWebPlayer } from '@/components/hits-different/SpotifyWebPlayer'
import { HdWordmark } from '@/components/hits-different/HdWordmark'
import {
  TickerColumn,
  TickerWheelProvider,
  type VibeHighlightSource,
} from '@/components/hits-different/HitsDifferentTicker'
import { overlayCoverText } from '@/lib/hits-different/canvas'
import { triggerBlobDownload } from '@/lib/hits-different/downloadBlob'
import {
  BREAK_OPTS,
  DUR_OPTS,
  HISTORY_KEY,
  sessionDemoBreakSrc,
  sessionDemoFocusSrc,
  SESSION_OPTS,
  type HistoryEntry,
  type Vibe,
  VIBE_SAMPLE_PLAYLISTS,
  VIBE_TRACKS,
} from '@/lib/hits-different/data'
import { spotifyPlaylistContextUri } from '@/lib/hits-different/spotifyPlaylistUri'
import {
  HD_COLUMN_STACK_GAP,
  HD_LEFT_COLUMN_COPYRIGHT,
  HD_TOP_BAR_BTN,
  hdMainGridShellClass,
} from '@/lib/hits-different/hdUiClasses'

const HD_CAFE_BG_URL = '/images/cafe-des-etudes-bg.png'

/** Wall-clock ms → `MM:SS`. */
function fmtHires(totalMs: number) {
  const clamped = Math.max(0, Math.floor(totalMs))
  const m = Math.floor(clamped / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Focus and break both use wall-clock `endAt` so the main clock counts down (Pomodoro). */
type PhaseAnchor = {
  kind: 'focus' | 'break'
  endAt: number
  pauseAt: number | null
}

type TimerAnchor = PhaseAnchor

function getPhaseLeftMs(a: PhaseAnchor, now: number): number {
  const t = a.pauseAt ?? now
  return Math.max(0, a.endAt - t)
}

function readHiresClock(
  anchor: TimerAnchor | null,
  view: 'setup' | 'session',
  doneOpen: boolean,
): string {
  if (!anchor || view !== 'session' || doneOpen) return '00:00'
  const now = anchor.pauseAt ?? Date.now()
  return fmtHires(getPhaseLeftMs(anchor, now))
}

function readFaviconSec(
  anchor: TimerAnchor | null,
  view: 'setup' | 'session',
  doneOpen: boolean,
): number {
  if (!anchor || view !== 'session' || doneOpen) return 0
  const now = anchor.pauseAt ?? Date.now()
  return Math.floor(getPhaseLeftMs(anchor, now) / 1000)
}

const SAMPLE_MIX_LINK_CLS =
  'font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/55 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white/50'

function SampleMixLinks({
  vibe,
  browserPlay,
}: {
  vibe: string
  browserPlay?: ReactNode
}) {
  const v = vibe as Vibe
  const sample = VIBE_SAMPLE_PLAYLISTS[v]
  if (!sample) return null
  return (
    <div className="flex flex-wrap items-start justify-start gap-x-3 gap-y-1 border-t border-white/10 pt-4">
      <a
        href={sample.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={SAMPLE_MIX_LINK_CLS}
      >
        Spotify
      </a>
      {browserPlay}
    </div>
  )
}

const TIMER_SELECT_LABEL_CLS =
  'w-full justify-self-stretch text-end font-[family-name:var(--font-space-mono)] text-[9px] uppercase leading-none tracking-wide text-white/55 whitespace-nowrap'
const TIMER_SELECT_CLS =
  'box-border h-8 w-full min-w-0 max-w-[120px] cursor-pointer appearance-none rounded border border-white/20 bg-black/50 py-0 pl-2 pr-7 text-left font-[family-name:var(--font-space-mono)] text-[11px] leading-none text-white outline-none focus:border-white/50'

function TimerSelectRow({
  id,
  label,
  value,
  onChange,
  marginBottom,
  children,
}: {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  marginBottom?: boolean
  children: ReactNode
}) {
  const [listOpen, setListOpen] = useState(false)
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearBlurCloseTimer = () => {
    if (blurCloseTimerRef.current !== null) {
      clearTimeout(blurCloseTimerRef.current)
      blurCloseTimerRef.current = null
    }
  }

  useEffect(() => () => clearBlurCloseTimer(), [])

  const openList = () => {
    clearBlurCloseTimer()
    setListOpen(true)
  }

  /** Native `<select>` often stays focused when the list closes on a second click; toggle here so the chevron resets. */
  const handleSelectMouseDown = () => {
    clearBlurCloseTimer()
    setListOpen((prev) => (prev ? false : true))
  }

  const scheduleCloseList = () => {
    clearBlurCloseTimer()
    blurCloseTimerRef.current = setTimeout(() => {
      setListOpen(false)
      blurCloseTimerRef.current = null
    }, 280)
  }

  return (
    <div
      className={cn(
        /* Fixed label col matches longest copy (“Rounds”); same grid on every row so selects line up. */
        'grid w-full grid-cols-[4.75rem_minmax(0,120px)] items-center gap-x-3',
        marginBottom && 'mb-2.5',
      )}
    >
      <label htmlFor={id} className={TIMER_SELECT_LABEL_CLS}>
        {label}
      </label>
      <div className="relative w-full min-w-0 max-w-[120px] justify-self-start">
        <select
          id={id}
          className={TIMER_SELECT_CLS}
          value={value}
          onMouseDown={handleSelectMouseDown}
          onFocus={openList}
          onBlur={scheduleCloseList}
          onChange={(e) => {
            clearBlurCloseTimer()
            setListOpen(false)
            onChange(Number(e.target.value))
          }}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-white/45 transition-transform duration-200 ease-out',
            listOpen && 'rotate-180',
          )}
          aria-hidden
          strokeWidth={2}
        />
      </div>
    </div>
  )
}

/** Soft sine ping when ~60s remain in a focus phase (requires user gesture for AudioContext on some browsers). */
function playSubtleLapApproachChime(): void {
  try {
    if (typeof window === 'undefined') return
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g)
    g.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    const t0 = ctx.currentTime
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
    osc.start(t0)
    osc.stop(t0 + 0.35)
    void ctx.resume().catch(() => {})
  } catch {
    /* ignore */
  }
}

const DEMO_LOOP_VOL = 0.32

/** Pause demo loop. Use `resetPosition` when switching vibe or focus/break so the next play starts clean; omit for timer pause so resume continues mid-track. */
function pauseDemoAudio(el: HTMLAudioElement | null, resetPosition = false): void {
  if (!el) return
  el.pause()
  if (!resetPosition) return
  try {
    el.currentTime = 0
  } catch {
    /* ignore */
  }
}

function playDemoFocusIntro(
  focusEl: HTMLAudioElement | null,
  breakEl: HTMLAudioElement | null,
): void {
  if (!focusEl || !breakEl) return
  pauseDemoAudio(breakEl, true)
  focusEl.volume = DEMO_LOOP_VOL
  void focusEl.play().catch(() => {})
}

export default function HitsDifferentApp() {
  const { user, isSignedIn, status, signInWithSpotify, signOutUser } = useUser()

  const [view, setView] = useState<'setup' | 'session'>('setup')
  const [selectedVibe, setSelectedVibe] = useState('LO-FI')
  const [vibeHighlight, setVibeHighlight] = useState<VibeHighlightSource>({
    tickerId: 'ticker1',
    duplicateIndex: 0,
  })
  const [taskInput, setTaskInput] = useState('')
  const [taskText, setTaskText] = useState('')
  const [focusMins, setFocusMins] = useState(25)
  const [breakMins, setBreakMins] = useState(5)
  const [totalSessions, setTotalSessions] = useState(6)

  const [curSession, setCurSession] = useState(1)
  /** Integer seconds for internal transitions (display / tab title use `hiresLabel`). */
  const [, setRemaining] = useState(0)
  const [timerMode, setTimerMode] = useState('FOCUS')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  /** Timer was auto-paused because in-browser Spotify started playing; cleared on manual pause or session end. */
  const spotifyDrovePauseRef = useRef(false)
  const browserSpotifyPlayingRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const timerAnchorRef = useRef<TimerAnchor | null>(null)
  const tickSessionNumRef = useRef(0)
  const totalSessionsRef = useRef(6)
  const finishRef = useRef<(n: number) => void>(() => {})
  const timerTickRef = useRef<() => void>(() => {})
  const [hiresTick, setHiresTick] = useState(0)

  const taskTextRef = useRef('')
  const selectedVibeRef = useRef('LO-FI')
  const focusMinsRef = useRef(25)

  useEffect(() => {
    taskTextRef.current = taskText
    selectedVibeRef.current = selectedVibe
    focusMinsRef.current = focusMins
  }, [taskText, selectedVibe, focusMins])

  useEffect(() => {
    totalSessionsRef.current = totalSessions
  }, [totalSessions])

  const handleVibePick = useCallback(
    (tickerId: string, v: Vibe, duplicateIndex: number) => {
      setSelectedVibe(v)
      setVibeHighlight({ tickerId, duplicateIndex })
    },
    [],
  )

  /** Option B highlight: snap to first clone when switching setup ↔ session. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync ticker wheel to view change
    setVibeHighlight({ tickerId: 'ticker1', duplicateIndex: 0 })
  }, [view])

  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState({ msg: '', show: false })
  const [doneOpen, setDoneOpen] = useState(false)

  const launchInProgressRef = useRef(false)
  const timerSettingsRef = useRef<HTMLDivElement>(null)
  const beginBlockRef = useRef<(sessionNum: number) => void>(() => {})
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false)
  const demoFocusAudioRef = useRef<HTMLAudioElement>(null)
  const demoBreakAudioRef = useRef<HTMLAudioElement>(null)
  const lapApproachChimedForBlockRef = useRef<number | null>(null)

  const { notice: spotifyPlaybackNotice, accountVerified: spotifyAccountVerified } =
    useSpotifyPlaybackNotice(status)

  const hiresLabel = useMemo(
    () => readHiresClock(timerAnchorRef.current, view, doneOpen),
    [hiresTick, view, doneOpen],
  )
  const docFaviconSec = useMemo(
    () => readFaviconSec(timerAnchorRef.current, view, doneOpen),
    [hiresTick, view, doneOpen],
  )
  /** Setup / hidden session column: show chosen focus length (default 25 → 25:00). */
  const focusLengthPreviewClock = useMemo(
    () => fmtHires(focusMins * 60 * 1000),
    [focusMins],
  )
  useSessionTimerDocumentMeta(
    view === 'session' && !doneOpen,
    hiresLabel,
    docFaviconSec,
  )

  const pipWindowRef = useRef<Window | null>(null)
  const togglePauseRef = useRef<() => void>(() => {})

  const viewRef = useRef(view)
  const doneOpenRef = useRef(doneOpen)
  useEffect(() => {
    viewRef.current = view
    doneOpenRef.current = doneOpen
  }, [view, doneOpen])

  const handleBrowserSpotifyPlaying = useCallback((playing: boolean) => {
    browserSpotifyPlayingRef.current = playing
    if (viewRef.current !== 'session' || doneOpenRef.current) return
    if (playing) {
      if (!pausedRef.current) {
        spotifyDrovePauseRef.current = true
        const a = timerAnchorRef.current
        if (a && a.pauseAt == null) a.pauseAt = Date.now()
        pausedRef.current = true
        setPaused(true)
        setHiresTick((x) => x + 1)
      }
    } else if (spotifyDrovePauseRef.current) {
      spotifyDrovePauseRef.current = false
      const a = timerAnchorRef.current
      if (a && a.pauseAt != null) {
        const dt = Date.now() - a.pauseAt
        a.endAt += dt
        a.pauseAt = null
      }
      pausedRef.current = false
      setPaused(false)
      setHiresTick((x) => x + 1)
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate session log from localStorage once
      if (raw) setSessionHistory(JSON.parse(raw) as HistoryEntry[])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!timerSettingsOpen) return
    const onDown = (e: MouseEvent) => {
      const el = timerSettingsRef.current
      if (el && !el.contains(e.target as Node)) setTimerSettingsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTimerSettingsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [timerSettingsOpen])

  const showToast = useCallback((msg: string, dur = 2200) => {
    setToast({ msg, show: true })
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), dur)
  }, [])

  const syncPipTimerWindow = useCallback(() => {
    const pip = pipWindowRef.current
    if (!pip || pip.closed) return
    const toggleBtn = pip.document.getElementById('pip-toggle')
    const clock = readHiresClock(
      timerAnchorRef.current,
      viewRef.current,
      doneOpenRef.current,
    )
    const pipMain = pip.document.getElementById('pip-time-main')
    if (pipMain) pipMain.textContent = clock
    const timeElLegacy = pip.document.getElementById('pip-time')
    if (timeElLegacy && !pipMain) {
      timeElLegacy.textContent = clock
    }
    if (toggleBtn) toggleBtn.textContent = paused ? 'Resume' : 'Pause'
  }, [hiresTick, paused])

  useEffect(() => {
    syncPipTimerWindow()
  }, [syncPipTimerWindow])

  const openTimerPictureInPicture = useCallback(async () => {
    const api = (
      window as Window & {
        documentPictureInPicture?: {
          requestWindow: (o?: { width?: number; height?: number }) => Promise<Window>
        }
      }
    ).documentPictureInPicture
    if (!api) {
      showToast('Picture-in-picture needs a supported browser (e.g. Chrome)')
      return
    }
    try {
      const existing = pipWindowRef.current
      if (existing && !existing.closed) {
        existing.focus()
        syncPipTimerWindow()
        return
      }
      const pip = await api.requestWindow({ width: 280, height: 188 })
      pipWindowRef.current = pip
      pip.document.body.style.margin = '0'
      pip.document.body.style.background = '#0c0c0c'
      pip.document.body.style.color = '#e5e5e5'
      const pipClock = readHiresClock(timerAnchorRef.current, view, doneOpen)
      pip.document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;padding:12px;font-family:ui-monospace,monospace;">
        <div id="pip-time" style="display:flex;align-items:center;justify-content:center;line-height:1;">
          <span id="pip-time-main" style="font-size:32px;font-weight:600;letter-spacing:0.04em;">${pipClock}</span>
        </div>
        <button type="button" id="pip-toggle" style="margin-top:22px;display:inline-flex;align-items:center;justify-content:center;padding:8px 22px;border-radius:4px;border:1px solid rgba(255,255,255,0.35);background:#fff;color:#0c0c0c;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;">
          ${paused ? 'Resume' : 'Pause'}
        </button>
      </div>`
      const pipToggle = pip.document.getElementById('pip-toggle')
      if (pipToggle) {
        pipToggle.addEventListener('click', (ev) => {
          ev.preventDefault()
          togglePauseRef.current()
        })
      }
      pip.addEventListener('pagehide', () => {
        pipWindowRef.current = null
      })
      syncPipTimerWindow()
    } catch {
      showToast('Picture-in-picture failed or was blocked')
    }
  }, [paused, view, doneOpen, showToast, syncPipTimerWindow])

  const onSpotifyWebError = useCallback((msg: string) => showToast(msg), [showToast])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const finish = useCallback((completedSessionNum: number) => {
    clearTimer()
    timerAnchorRef.current = null
    tickSessionNumRef.current = 0
    setPaused(false)
    pausedRef.current = false
    spotifyDrovePauseRef.current = false
    browserSpotifyPlayingRef.current = false
    const entry: HistoryEntry = {
      task: taskTextRef.current,
      emoji: '🎵',
      vibe: selectedVibeRef.current,
      sessions: Math.ceil(completedSessionNum / 2),
      duration: focusMinsRef.current,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      completed: true,
    }
    setSessionHistory((prev) => {
      const hist = [...prev, entry]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist))
      return hist
    })
    setDoneOpen(true)
  }, [clearTimer])

  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const timerTick = useCallback(() => {
    const a = timerAnchorRef.current
    const sn = tickSessionNumRef.current
    if (!a || sn === 0) return
    if (viewRef.current !== 'session' || doneOpenRef.current) return
    if (pausedRef.current) return

    const now = Date.now()
    const total = totalSessionsRef.current
    const leftMs = getPhaseLeftMs(a, now)
    const leftSec = Math.max(0, Math.floor(leftMs / 1000))
    setRemaining(leftSec)

    if (a.kind === 'focus') {
      const capSec = focusMinsRef.current * 60
      if (
        capSec > 60 &&
        leftSec === 60 &&
        lapApproachChimedForBlockRef.current !== sn
      ) {
        lapApproachChimedForBlockRef.current = sn
        playSubtleLapApproachChime()
      }
    }

    if (leftMs <= 0) {
      clearTimer()
      lapApproachChimedForBlockRef.current = null
      if (sn < total) beginBlockRef.current(sn + 1)
      else finishRef.current(sn)
      return
    }
    setHiresTick((x) => x + 1)
  }, [clearTimer])

  useEffect(() => {
    timerTickRef.current = timerTick
  }, [timerTick])

  const beginBlock = useCallback(
    (sessionNum: number) => {
      clearTimer()
      pausedRef.current = false
      setPaused(false)
      const isBreak = sessionNum % 2 === 0
      if (!isBreak) lapApproachChimedForBlockRef.current = null
      const sec = isBreak ? breakMins * 60 : focusMins * 60
      setRemaining(sec)
      setTimerMode(isBreak ? 'BREAK' : 'FOCUS')
      setCurSession(sessionNum)

      tickSessionNumRef.current = sessionNum
      const t0 = Date.now()
      if (isBreak) {
        timerAnchorRef.current = {
          kind: 'break',
          endAt: t0 + breakMins * 60 * 1000,
          pauseAt: null,
        }
      } else {
        timerAnchorRef.current = {
          kind: 'focus',
          endAt: t0 + focusMins * 60 * 1000,
          pauseAt: null,
        }
      }

      intervalRef.current = window.setInterval(() => {
        timerTickRef.current()
      }, 50)

      setHiresTick((x) => x + 1)

      if (browserSpotifyPlayingRef.current) {
        spotifyDrovePauseRef.current = true
        const a = timerAnchorRef.current
        if (a && a.pauseAt == null) a.pauseAt = Date.now()
        pausedRef.current = true
        setPaused(true)
        setHiresTick((x) => x + 1)
      }
    },
    [breakMins, clearTimer, focusMins],
  )

  useEffect(() => {
    beginBlockRef.current = beginBlock
  }, [beginBlock])

  useEffect(() => () => clearTimer(), [clearTimer])

  const togglePause = useCallback(() => {
    spotifyDrovePauseRef.current = false
    const nextPaused = !pausedRef.current
    const a = timerAnchorRef.current
    if (nextPaused) {
      if (a && a.pauseAt == null) a.pauseAt = Date.now()
      pausedRef.current = true
      setPaused(true)
    } else {
      if (a && a.pauseAt != null) {
        const dt = Date.now() - a.pauseAt
        a.endAt += dt
        a.pauseAt = null
      }
      pausedRef.current = false
      setPaused(false)
    }
    setHiresTick((x) => x + 1)
  }, [])

  useEffect(() => {
    togglePauseRef.current = togglePause
  }, [togglePause])

  const launch = useCallback(() => {
    if (launchInProgressRef.current) return
    const t = taskInput.trim().toUpperCase()
    if (!t) return
    launchInProgressRef.current = true
    taskTextRef.current = t
    setTaskText(t)
    setView('session')

    if (!isSignedIn) {
      playDemoFocusIntro(demoFocusAudioRef.current, demoBreakAudioRef.current)
    }

    window.setTimeout(() => {
      launchInProgressRef.current = false
      beginBlock(1)
    }, 0)
  }, [beginBlock, isSignedIn, taskInput])

  const restartSession = useCallback(() => {
    clearTimer()
    timerAnchorRef.current = null
    tickSessionNumRef.current = 0
    demoFocusAudioRef.current?.pause()
    demoBreakAudioRef.current?.pause()
    setPaused(false)
    pausedRef.current = false
    spotifyDrovePauseRef.current = false
    browserSpotifyPlayingRef.current = false
    setView('setup')
    setTaskInput('')
    taskTextRef.current = ''
    setTaskText('')
    launchInProgressRef.current = false
    setDoneOpen(false)
    setCurSession(1)
    setRemaining(0)
  }, [clearTimer])

  const exportHistory = useCallback(() => {
    if (!sessionHistory.length) {
      showToast('No sessions to export')
      return
    }
    const rows = ['Task,Date,Rounds,Vibe,Focus length (min),Completed']
    sessionHistory.forEach((s) => {
      rows.push(
        `"${s.task}","${s.date}",${s.sessions},"${s.vibe}",${s.duration},${s.completed}`,
      )
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    triggerBlobDownload(blob, 'hits-different-sessions.csv')
    showToast('Session log exported')
  }, [sessionHistory, showToast])

  const exportAlbumCover = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 1000
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#C8A020'
    ctx.fillRect(0, 0, 1000, 1000)
    ctx.font = '320px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎵', 500, 500)
    overlayCoverText(ctx, taskText, selectedVibe)
    canvas.toBlob((blob) => {
      if (!blob) return
      triggerBlobDownload(blob, 'hits-different-cover.png')
      showToast('Album cover saved')
    })
  }, [selectedVibe, showToast, taskText])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT') return
      if (e.key === ' ' && view === 'session') {
        e.preventDefault()
        togglePause()
      }
      if (e.key === 'h' || e.key === 'H') setHistoryOpen((o) => !o)
      if (e.key === 'Escape') setHistoryOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [togglePause, view])

  /** Stopping previous `src` when the vibe changes avoids two loops overlapping (same elements, new files). */
  useEffect(() => {
    const focusEl = demoFocusAudioRef.current
    const breakEl = demoBreakAudioRef.current
    if (!focusEl || !breakEl) return
    pauseDemoAudio(focusEl, true)
    pauseDemoAudio(breakEl, true)
  }, [selectedVibe])

  useEffect(() => {
    const focusEl = demoFocusAudioRef.current
    const breakEl = demoBreakAudioRef.current
    if (!focusEl || !breakEl) return

    if (view !== 'session' || doneOpen || isSignedIn) {
      pauseDemoAudio(focusEl, true)
      pauseDemoAudio(breakEl, true)
      return
    }

    if (paused) {
      focusEl.pause()
      breakEl.pause()
      return
    }

    const wantBreak = timerMode === 'BREAK'

    if (wantBreak) {
      pauseDemoAudio(focusEl, true)
      breakEl.volume = DEMO_LOOP_VOL
      void breakEl.play().catch(() => {})
    } else {
      pauseDemoAudio(breakEl, true)
      focusEl.volume = DEMO_LOOP_VOL
      void focusEl.play().catch(() => {})
    }
  }, [view, timerMode, paused, doneOpen, isSignedIn, selectedVibe])

  const demoFocusSrc = sessionDemoFocusSrc(selectedVibe as Vibe)
  const demoBreakSrc = sessionDemoBreakSrc(selectedVibe as Vibe)

  const isBreakTint = view === 'session' && curSession % 2 === 0
  const isDoneTint = doneOpen

  return (
    <TickerWheelProvider>
    <div className="relative min-h-svh w-full max-w-[100vw]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center blur-[1.5px]"
          style={{ backgroundImage: `url('${HD_CAFE_BG_URL}')` }}
        />
        <div className="absolute inset-0 bg-hd-bg/15" />
        <div className="absolute inset-0 bg-black/48" />
      </div>
      <div className="relative z-10 box-border min-h-svh w-full max-w-[100vw] overflow-x-hidden font-sans text-white antialiased select-none lg:h-svh lg:overflow-hidden">
      <audio
        ref={demoFocusAudioRef}
        className="sr-only"
        src={demoFocusSrc}
        loop
        preload="auto"
        aria-hidden
      />
      <audio
        ref={demoBreakAudioRef}
        className="sr-only"
        src={demoBreakSrc}
        loop
        preload="auto"
        aria-hidden
      />
      <div
        className="fixed left-3 right-3 top-[max(1rem,env(safe-area-inset-top))] z-[200] flex flex-col gap-1.5 sm:left-6 sm:right-6"
        id="hdTopBar"
      >
        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <HdWordmark />
          <div className="flex min-w-0 flex-col items-end gap-y-2 sm:flex-row sm:items-center sm:justify-end sm:gap-x-2.5 sm:gap-y-0 md:gap-x-3.5">
            <button
              type="button"
              id="hdSessionLogNav"
              className={cn(HD_TOP_BAR_BTN, 'gap-1')}
              onClick={() => setHistoryOpen(true)}
            >
              SESSION LOG
              <ArrowRight className="size-3 shrink-0 opacity-85" strokeWidth={2.25} aria-hidden />
            </button>
            {status === 'authenticated' ? (
              <button
                id="hdSpotifyNav"
                type="button"
                className={HD_TOP_BAR_BTN}
                onClick={() => signOutUser()}
                title={user.email ?? ''}
              >
                {user.name ?? 'Spotify'} · OUT
              </button>
            ) : (
              <button
                id="hdSpotifyNav"
                type="button"
                className={HD_TOP_BAR_BTN}
                onClick={() => signInWithSpotify()}
              >
                CONNECT SPOTIFY
              </button>
            )}
          </div>
        </div>
        {spotifyPlaybackNotice ? (
          <p
            className="ml-auto max-w-[min(320px,calc(100vw-2rem))] text-right font-[family-name:var(--font-space-mono)] text-[9px] leading-snug tracking-wide text-amber-200/85"
            role="status"
            aria-live="polite"
          >
            {spotifyPlaybackNotice === 'nonPremium'
              ? 'Playback needs Spotify Premium and an active Spotify app or device.'
              : 'Could not verify your Spotify account. Playback may need Premium and an active Spotify app or device.'}
          </p>
        ) : null}
      </div>

      <div
        id="toast"
        className={cn(
          'pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[300] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-sm bg-white px-[22px] py-2.5 text-center font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-hd-bg transition-all duration-300',
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        )}
      >
        {toast.msg}
      </div>

      <div
        id="historyPanel"
        className={cn(
          'fixed bottom-0 right-0 top-0 z-[220] flex w-full max-w-[min(100vw,340px)] flex-col border-l border-white/10 bg-hd-panel font-sans transition-transform duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]',
          historyOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-3.5 pt-5">
          <div className="font-[family-name:var(--font-bebas)] text-[26px] tracking-wide">
            SESSION LOG
          </div>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0.5 text-white/50 hover:text-white"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close session log"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3.5 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]" id="histList">
          {!sessionHistory.length ? (
            <div
              className="mt-10 text-center font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white/25"
              id="histEmpty"
            >
              No sessions yet.
              <br />
              Drop the needle to begin.
            </div>
          ) : (
            [...sessionHistory].reverse().map((s, i) => (
              <div
                key={i}
                className="relative mb-2.5 rounded border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
              >
                <div className="absolute right-3.5 top-3 text-lg">{s.emoji}</div>
                <div className="mb-1 font-[family-name:var(--font-bebas)] text-lg tracking-wide">
                  {s.task}
                </div>
                <div className="font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/40">
                  {s.date} · {s.sessions} rounds · {s.vibe} · {s.duration}m focus
                </div>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          className="mx-5 mb-3.5 inline-flex cursor-pointer items-center justify-center gap-2 self-center rounded border border-white/20 bg-white/10 px-2.5 py-2.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
          onClick={exportHistory}
        >
          <Download className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          EXPORT SESSION LOG
        </button>
      </div>

      {/* Setup */}
      <div id="s1" className={hdMainGridShellClass('setup', view)}>
        <div
          className="relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[4.5rem] transition-colors duration-500 sm:px-6 lg:min-h-0 lg:flex-none lg:pb-5 lg:pt-5"
          id="s1Left"
        >
          <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
            <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center px-1 py-2">
              <div
                className={cn(
                  'flex w-full max-w-[min(100%,420px)] flex-col items-start text-start',
                  HD_COLUMN_STACK_GAP,
                )}
              >
                <div className="relative w-full shrink-0 self-start">
                  <div className="relative z-[5] w-full text-start">
                    <div className="font-[family-name:var(--font-bebas)] text-[clamp(88px,20vw,220px)] leading-none tracking-[6px] text-white/10 tabular-nums">
                      {focusLengthPreviewClock}
                    </div>
                  </div>
                </div>

                <div className={cn('flex w-full shrink-0 flex-col', HD_COLUMN_STACK_GAP)}>
              <div className="flex w-full items-center justify-start gap-2">
                <input
                  className="min-w-0 flex-1 rounded border-[1.5px] border-white/25 bg-black/35 px-3 py-2 text-left font-[family-name:var(--font-space-mono)] text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45 focus:bg-black/40 focus:outline-none"
                  id="taskInput"
                  type="text"
                  aria-label="Enter your task — press Enter to start"
                  placeholder="Enter your task to begin"
                  maxLength={42}
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    launch()
                  }}
                />
                <div className="relative shrink-0" ref={timerSettingsRef}>
                  <button
                    type="button"
                    className={cn(
                      'flex h-[38px] w-[38px] items-center justify-center rounded border-[1.5px] border-white/25 bg-black/25 font-[family-name:var(--font-space-mono)] text-[14px] text-white/80 transition-colors hover:border-white/45 hover:bg-black/35 hover:text-white',
                      timerSettingsOpen && 'border-white/50 bg-black/40 text-white',
                    )}
                    title="Focus length, break & rounds"
                    aria-expanded={timerSettingsOpen}
                    aria-haspopup="dialog"
                    aria-controls="timerSettingsPanel"
                    onClick={() => setTimerSettingsOpen((o) => !o)}
                  >
                    <Settings className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                  {timerSettingsOpen ? (
                    <div
                      className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(calc(100vw-2.5rem),220px)] rounded border border-white/15 bg-[#141414] px-3 py-2.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                      id="timerSettingsPanel"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="timerSettingsTitle"
                      aria-describedby="timerSettingsDesc"
                    >
                      <h2 id="timerSettingsTitle" className="sr-only">
                        Timer settings
                      </h2>
                      <p id="timerSettingsDesc" className="sr-only">
                        Set focus length, break length, and how many focus-and-break rounds to
                        run.
                      </p>
                      <TimerSelectRow
                        id="focusSelect"
                        label="Focus"
                        value={focusMins}
                        onChange={setFocusMins}
                        marginBottom
                      >
                        {DUR_OPTS.map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </TimerSelectRow>
                      <TimerSelectRow
                        id="breakSelect"
                        label="Break"
                        value={breakMins}
                        onChange={setBreakMins}
                        marginBottom
                      >
                        {BREAK_OPTS.map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </TimerSelectRow>
                      <TimerSelectRow
                        id="roundsSelect"
                        label="Rounds"
                        value={totalSessions}
                        onChange={setTotalSessions}
                      >
                        {SESSION_OPTS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </TimerSelectRow>
                    </div>
                  ) : null}
                </div>
              </div>
                </div>
            </div>
          </div>
          </div>
          <p className={cn(HD_LEFT_COLUMN_COPYRIGHT, 'text-white/40')} aria-hidden>
            © 2026 Julian Cho
          </p>
        </div>

        <TickerColumn
          tickerId="ticker1"
          selectedVibe={selectedVibe}
          vibeHighlight={vibeHighlight}
          onVibePick={handleVibePick}
          wheelForwardActive={view === 'setup'}
        />
      </div>

      {/* Session */}
      <div id="s2" className={hdMainGridShellClass('session', view)}>
        <div
          className={cn(
            'relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[4.5rem] transition-colors duration-500 sm:px-6 lg:min-h-0 lg:flex-none lg:pb-5 lg:pt-5',
            isBreakTint && 'bg-hd-break/18',
            isDoneTint && 'bg-hd-done/18',
          )}
          id="s2Left"
        >
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-0 py-2 pb-10">
            <div
              className={cn(
                'flex w-full max-w-[min(100%,420px)] flex-col items-start text-start',
                HD_COLUMN_STACK_GAP,
              )}
            >
              <div className="relative w-full shrink-0 self-start">
                <div className="relative z-[5] w-full text-start">
                  <div
                    className="flex flex-row flex-wrap items-baseline font-[family-name:var(--font-bebas)] leading-none tracking-[6px] text-white tabular-nums"
                    id="timerNum"
                  >
                    <span
                      className={cn(
                        'text-[clamp(88px,20vw,220px)]',
                        paused &&
                          'text-white [text-shadow:0_0_1px_rgba(0,0,0,0.9),0_2px_28px_rgba(255,255,255,0.35)]',
                      )}
                    >
                      {view === 'session' ? hiresLabel : focusLengthPreviewClock}
                    </span>
                  </div>
                </div>
                <div className="relative z-[5] mt-6 flex flex-wrap justify-start gap-2">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/20 bg-white/10 px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
                    onClick={restartSession}
                  >
                    <RotateCcw className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    RESET
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded border px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide transition-colors',
                      paused
                        ? 'border-white/45 bg-white/22 text-white hover:bg-white/30'
                        : 'border-transparent bg-white text-hd-bg hover:bg-zinc-200',
                    )}
                    id="pauseBtn"
                    onClick={togglePause}
                  >
                    {paused ? (
                      <>
                        <Play className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                        RESUME
                      </>
                    ) : (
                      <>
                        <Pause className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                        PAUSE
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-white/20 bg-white/10 px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
                    title="Floating timer window (Chrome / Edge)"
                    onClick={() => void openTimerPictureInPicture()}
                  >
                    <PictureInPicture2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    PiP
                  </button>
                </div>
              </div>

              <div className={cn('flex w-full shrink-0 flex-col', HD_COLUMN_STACK_GAP)}>
                <div className="font-[family-name:var(--font-space-mono)] text-[9.5px] uppercase tracking-wide text-white/45">
                  Task
                </div>
                <div
                  className="font-[family-name:var(--font-bebas)] text-[clamp(22px,3.2vw,38px)] leading-[1.05] tracking-wide text-white"
                  id="s2Task"
                >
                  {taskText || '—'}
                </div>
                <div
                  className="flex w-full max-w-full items-center justify-start gap-2 rounded-full bg-black/28 px-3 py-1.5"
                  id="nowPlaying"
                >
                  <div className="flex h-[11px] shrink-0 items-end gap-0.5">
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate]" />
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.15s]" />
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.3s]" />
                  </div>
                  <div
                    className="min-w-0 text-left font-[family-name:var(--font-space-mono)] text-[9.5px] tracking-wide text-white/65"
                    id="npText"
                  >
                    {isSignedIn
                      ? `${user.name ?? 'Spotify'} · ${VIBE_TRACKS[selectedVibe] ?? selectedVibe}`
                      : VIBE_TRACKS[selectedVibe] ?? `${selectedVibe} MIX`}
                  </div>
                </div>
                <SampleMixLinks
                  vibe={selectedVibe}
                  browserPlay={
                    isSignedIn &&
                    spotifyAccountVerified &&
                    spotifyPlaybackNotice === null ? (
                      <SpotifyWebPlayer
                        enabled={view === 'session' && !doneOpen}
                        contextUri={spotifyPlaylistContextUri(
                          VIBE_SAMPLE_PLAYLISTS[selectedVibe as Vibe].spotifyUrl,
                        )}
                        onSdkPlayingChange={handleBrowserSpotifyPlaying}
                        onError={onSpotifyWebError}
                      />
                    ) : undefined
                  }
                />
              </div>
            </div>
          </div>

          <p
            className={cn(
              HD_LEFT_COLUMN_COPYRIGHT,
              isBreakTint || isDoneTint ? 'text-white/35' : 'text-white/40',
            )}
            aria-hidden
          >
            © 2026 Julian Cho
          </p>

          <div
            className={cn(
              'absolute inset-0 z-20 flex flex-col items-center justify-center',
              doneOpen
                ? 'pointer-events-auto bg-black/80 opacity-100 transition-opacity duration-[400ms]'
                : 'pointer-events-none invisible opacity-0',
            )}
            id="doneOverlay"
          >
            <div className="text-[52px]" id="doneEmoji">
              🎵
            </div>
            <div className="font-[family-name:var(--font-bebas)] text-[58px] tracking-wide text-white">
              TRACK DONE
            </div>
            <div
              className="mt-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white/45"
              id="doneSub"
            >
              {focusMins} min · {selectedVibe}
            </div>
            <div className="mt-5 flex w-full max-w-[min(100%,20rem)] flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border-[1.5px] border-white/30 bg-transparent px-5 py-2.5 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white transition-colors hover:border-white"
                onClick={exportAlbumCover}
              >
                <Download className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                SAVE COVER
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border-0 bg-white px-5 py-2.5 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-hd-bg transition-colors hover:bg-zinc-200"
                onClick={restartSession}
              >
                NEW SESSION
                <ArrowRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <TickerColumn
          tickerId="ticker2"
          selectedVibe={selectedVibe}
          vibeHighlight={vibeHighlight}
          onVibePick={handleVibePick}
          wheelForwardActive={view === 'session'}
        />
      </div>

    </div>
    </div>
    </TickerWheelProvider>
  )
}
