'use client'

import { cn } from '@/lib/cn'
import {
  ArrowRight,
  ChevronDown,
  Download,
  ExternalLink,
  List,
  Loader2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Timer,
  Watch,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useSessionTimerDocumentMeta } from '@/hooks/useSessionTimerDocumentMeta'
import { HdWordmark } from '@/components/hits-different/HdWordmark'
import {
  TickerColumn,
  TickerWheelProvider,
  type VibeHighlightSource,
} from '@/components/hits-different/HitsDifferentTicker'
import { overlayCoverText } from '@/lib/hits-different/canvas'
import { triggerBlobDownload } from '@/lib/hits-different/downloadBlob'
import {
  HISTORY_KEY,
  sessionDemoBreakSrc,
  sessionDemoFocusSrc,
  TIMER_MODE_PRESETS,
  type HistoryEntry,
  type Vibe,
  VIBE_TRACKS,
} from '@/lib/hits-different/data'
import {
  HD_COLUMN_STACK_GAP,
  HD_DISPLAY_TITLE,
  HD_ICON,
  HD_ICON_LG,
  HD_LEFT_STAGE_COLUMN,
  HD_LEFT_TRANSPORT_STACK,
  HD_NAV_TEXT,
  HD_PAGE_FRAME,
  HD_SETUP_TITLE_TO_INPUT_GAP,
  HD_FONT_UI,
  HD_TASK_INPUT_PLACEHOLDER,
  HD_TASK_INPUT_VALUE,
  HD_TEXT_BODY,
  HD_TIMER_DISPLAY,
  HD_TOP_BAR_BTN,
  HD_TOP_BAR_INSET_MAX_LG,
  HD_TOP_BAR_INSET_X,
  HD_VIEWPORT_COPYRIGHT,
  hdMainGridShellClass,
} from '@/lib/hits-different/hdUiClasses'

/** Wall-clock ms → `MM:SS`. */
function fmtHires(totalMs: number) {
  const clamped = Math.max(0, Math.floor(totalMs))
  const m = Math.floor(clamped / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Pomodoro phases: wall-clock `endAt` so the main clock counts down. */
type PomodoroTimerAnchor = {
  mode: 'timer'
  kind: 'focus' | 'break'
  endAt: number
  pauseAt: number | null
}

/** Count-up session: `accumulatedMs` plus optional running segment from `runStartAt`. */
type StopwatchAnchor = {
  mode: 'stopwatch'
  runStartAt: number
  accumulatedMs: number
  pauseAt: number | null
}

type SessionAnchor = PomodoroTimerAnchor | StopwatchAnchor

/** Setup: countdown Pomodoro vs count-up stopwatch (session behavior). */
type TimekeepingMode = 'timer' | 'stopwatch'

function getPhaseLeftMs(a: PomodoroTimerAnchor, now: number): number {
  const t = a.pauseAt ?? now
  return Math.max(0, a.endAt - t)
}

function getStopwatchElapsedMs(a: StopwatchAnchor, now: number): number {
  if (a.pauseAt != null) return a.accumulatedMs
  return a.accumulatedMs + (now - a.runStartAt)
}

function readSessionClock(
  anchor: SessionAnchor | null,
  view: 'setup' | 'session',
  doneOpen: boolean,
): { label: string; faviconSec: number } {
  if (!anchor || view !== 'session' || doneOpen) {
    return { label: '00:00', faviconSec: 0 }
  }
  if (anchor.mode === 'stopwatch') {
    const elapsed = getStopwatchElapsedMs(anchor, Date.now())
    return {
      label: fmtHires(elapsed),
      faviconSec: Math.floor(elapsed / 1000),
    }
  }
  const now = anchor.pauseAt ?? Date.now()
  const leftMs = getPhaseLeftMs(anchor, now)
  return { label: fmtHires(leftMs), faviconSec: Math.floor(leftMs / 1000) }
}

/** Document Picture-in-Picture shell without `innerHTML` (text-only nodes). */
function mountPipTimerShell(doc: Document, pipClock: string, isPaused: boolean): void {
  const body = doc.body
  body.replaceChildren()
  body.style.margin = '0'
  body.style.background = '#0c0c0c'
  body.style.color = '#e5e5e5'

  const root = doc.createElement('div')
  root.style.cssText =
    'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;padding:12px;font-family:Inter,system-ui,Segoe UI,sans-serif'

  const timeWrap = doc.createElement('div')
  timeWrap.id = 'pip-time'
  timeWrap.style.cssText =
    'display:flex;align-items:center;justify-content:center;line-height:1'

  const main = doc.createElement('span')
  main.id = 'pip-time-main'
  main.style.cssText = 'font-size:32px;font-weight:600;letter-spacing:0.04em'
  main.textContent = pipClock

  const btn = doc.createElement('button')
  btn.type = 'button'
  btn.id = 'pip-toggle'
  btn.style.cssText =
    'margin-top:22px;display:inline-flex;align-items:center;justify-content:center;padding:8px 22px;border-radius:4px;border:1px solid rgba(255,255,255,0.35);background:#fff;color:#0c0c0c;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer'
  btn.textContent = isPaused ? 'Resume' : 'Pause'

  timeWrap.appendChild(main)
  root.appendChild(timeWrap)
  root.appendChild(btn)
  body.appendChild(root)
}

/** Matches inset controls in the bordered task input (timer mode trigger + session transport). */
const HD_INPUT_CARD_CONTROL_CHROME =
  'rounded-md border-0 bg-black/38 outline-none ring-1 ring-inset ring-white/[0.1] transition-colors focus-visible:ring-2 focus-visible:ring-white/25'

const HD_STAGE_STACK = cn('flex w-full flex-col items-center', HD_COLUMN_STACK_GAP)

const HD_TRANSPORT_INSET_BTN = cn(
  'inline-flex h-10 min-h-10 shrink-0 cursor-pointer items-center gap-1.5 px-3 leading-none text-white/80 hover:text-white',
  HD_FONT_UI,
  HD_INPUT_CARD_CONTROL_CHROME,
)

/** Setup task card: log + timer/watch icon buttons (same default/hover as mode control). */
const HD_SETUP_ICON_BTN =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-md border-0 bg-transparent outline-none transition-colors duration-150 text-white/80 hover:text-white focus-visible:ring-2 focus-visible:ring-white/25'

function TimerModeSelect({
  modeId,
  onSelectMode,
  disabled = false,
}: {
  modeId: string
  onSelectMode: (id: string) => void
  /** When true (e.g. stopwatch), presets stay visible but cannot be changed. */
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuBox, setMenuBox] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const current =
    TIMER_MODE_PRESETS.find((m) => m.id === modeId) ?? TIMER_MODE_PRESETS[0]

  const syncMenuPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuBox({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setMenuBox(null)
      return
    }
    syncMenuPosition()
    const ro = new ResizeObserver(() => syncMenuPosition())
    if (triggerRef.current) ro.observe(triggerRef.current)
    window.addEventListener('scroll', syncMenuPosition, true)
    window.addEventListener('resize', syncMenuPosition)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', syncMenuPosition, true)
      window.removeEventListener('resize', syncMenuPosition)
    }
  }, [open, syncMenuPosition])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const menu =
    open && menuBox && !disabled ? (
      <ul
        ref={menuRef}
        role="listbox"
        style={{
          position: 'fixed',
          top: menuBox.top,
          left: menuBox.left,
          width: menuBox.width,
        }}
        className="z-[320] max-h-[min(320px,44vh)] overflow-y-auto rounded-md bg-transparent py-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]"
      >
        {TIMER_MODE_PRESETS.filter((m) => m.id !== modeId).map((m) => (
          <li key={m.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={false}
              className={cn(
                'flex w-full cursor-pointer items-center rounded-sm border border-transparent px-2 py-2 text-left transition-colors',
                HD_TEXT_BODY,
                m.id === modeId
                  ? 'text-white'
                  : 'text-white/80 hover:text-white',
              )}
              onClick={() => {
                onSelectMode(m.id)
                setOpen(false)
              }}
            >
              {m.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div
      ref={containerRef}
      id="timerModePicker"
      className="relative min-w-0 max-w-[min(240px,52vw)] shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        id="timerModeSelect"
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        disabled={disabled}
        title={
          disabled
            ? 'Pomodoro mode presets are unavailable while stopwatch is selected'
            : undefined
        }
        aria-label={
          disabled
            ? 'Session mode — disabled while stopwatch is on'
            : 'Session mode'
        }
        className={cn(
          'flex h-10 min-h-10 w-full min-w-0 items-center justify-between gap-0.5 rounded-md border border-transparent bg-transparent py-0 pl-2 pr-1.5 text-left outline-none ring-0 transition-[color,border-color,opacity]',
          HD_TEXT_BODY,
          'focus-visible:ring-2 focus-visible:ring-white/25',
          disabled
            ? 'cursor-not-allowed opacity-45 text-white/45 ring-1 ring-inset ring-white/[0.14]'
            : 'cursor-pointer',
          !disabled &&
            (open
              ? 'border-white/40 text-white'
              : 'text-white/80 hover:text-white'),
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate">{current.label}</span>
        <ChevronDown
          className={cn(
            HD_ICON,
            'text-white/55 transition-transform duration-150 ease-out',
            /** Closed: point up; open: point down. */
            !open && 'rotate-180',
          )}
          aria-hidden
          strokeWidth={2}
        />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}

function TimekeepingModeToggle({
  mode,
  onToggle,
}: {
  mode: TimekeepingMode
  onToggle: (next: TimekeepingMode) => void
}) {
  const isStopwatch = mode === 'stopwatch'
  return (
    <div id="timekeepingModePicker" className="relative shrink-0">
      <button
        type="button"
        id="timekeepingModeToggle"
        role="switch"
        aria-checked={isStopwatch}
        aria-label={isStopwatch ? 'Switch to timer (countdown)' : 'Switch to stopwatch (count up)'}
        title={isStopwatch ? 'Stopwatch — click for timer' : 'Timer — click for stopwatch'}
        className={cn(HD_SETUP_ICON_BTN, HD_TEXT_BODY, 'border border-transparent ring-0', isStopwatch && 'text-white')}
        onClick={() => onToggle(isStopwatch ? 'timer' : 'stopwatch')}
      >
        {isStopwatch ? (
          <Watch className={HD_ICON_LG} strokeWidth={2} aria-hidden />
        ) : (
          <Timer className={HD_ICON_LG} strokeWidth={2} aria-hidden />
        )}
      </button>
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

/** Medium–low default so the demo mix is audible on session start (not silent / not full blast). */
const DEFAULT_DEMO_TRACK_VOL = 0.38
const DEMO_TRACK_VOL_STORAGE_KEY = 'hd-demo-track-vol'
const TIMEKEEPING_MODE_STORAGE_KEY = 'hd-timekeeping-mode'

function readStoredTimekeepingMode(): TimekeepingMode {
  if (typeof window === 'undefined') return 'timer'
  try {
    const v = window.localStorage.getItem(TIMEKEEPING_MODE_STORAGE_KEY)
    if (v === 'stopwatch' || v === 'timer') return v
  } catch {
    /* ignore */
  }
  return 'timer'
}

function readStoredDemoTrackVol(): number {
  if (typeof window === 'undefined') return DEFAULT_DEMO_TRACK_VOL
  try {
    const v = Number(window.localStorage.getItem(DEMO_TRACK_VOL_STORAGE_KEY))
    if (!Number.isFinite(v) || v < 0 || v > 1) return DEFAULT_DEMO_TRACK_VOL
    return v
  } catch {
    return DEFAULT_DEMO_TRACK_VOL
  }
}

const TASK_START_NOTI_SRC = '/task-start-noti.mp3'
/** Medium–low so it sits under session mixes. */
const TASK_START_NOTI_VOL = 0.26
const TASK_START_DELAY_MS = 780

const PHASE_SWITCH_NOTI_SRC = '/phase-switch-noti.mp3'
const PHASE_SWITCH_NOTI_VOL = 0.24

function playUiNoti(src: string, volume: number): void {
  try {
    const a = new Audio(src)
    a.volume = volume
    void a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

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
  volume: number,
): void {
  if (!focusEl || !breakEl) return
  pauseDemoAudio(breakEl, true)
  focusEl.muted = false
  focusEl.volume = volume
  void focusEl.play().catch(() => {})
}

export default function HitsDifferentApp() {
  const [view, setView] = useState<'setup' | 'session'>('setup')
  const [selectedVibe, setSelectedVibe] = useState('LO-FI')
  const [vibeHighlight, setVibeHighlight] = useState<VibeHighlightSource>({
    tickerId: 'ticker1',
    duplicateIndex: 0,
  })
  const [taskInput, setTaskInput] = useState('')
  const [taskText, setTaskText] = useState('')
  const [timekeepingMode, setTimekeepingMode] = useState<TimekeepingMode>(readStoredTimekeepingMode)
  const [focusMins, setFocusMins] = useState(25)
  const [breakMins, setBreakMins] = useState(5)
  const [totalSessions, setTotalSessions] = useState(6)
  const [demoTrackVol, setDemoTrackVol] = useState(readStoredDemoTrackVol)
  const [demoMuted, setDemoMuted] = useState(false)
  const effectiveDemoVol = demoMuted ? 0 : demoTrackVol

  const [curSession, setCurSession] = useState(1)
  const [timerMode, setTimerMode] = useState('FOCUS')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const bgVideoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<number | null>(null)
  const timerAnchorRef = useRef<SessionAnchor | null>(null)
  const timekeepingModeRef = useRef(timekeepingMode)
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

  useEffect(() => {
    timekeepingModeRef.current = timekeepingMode
    try {
      window.localStorage.setItem(TIMEKEEPING_MODE_STORAGE_KEY, timekeepingMode)
    } catch {
      /* ignore */
    }
  }, [timekeepingMode])

  const handleVibePick = useCallback((tickerId: string, v: Vibe, _duplicateIndex: number) => {
    setSelectedVibe(v)
    setVibeHighlight({ tickerId, duplicateIndex: 0 })
  }, [])

  /** Option B highlight: snap to first clone when switching setup ↔ session. */
  useEffect(() => {
    setVibeHighlight({ tickerId: 'ticker1', duplicateIndex: 0 })
  }, [view])

  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState({ msg: '', show: false })
  const [doneOpen, setDoneOpen] = useState(false)
  const [taskStartPending, setTaskStartPending] = useState(false)

  const launchInProgressRef = useRef(false)
  const taskStartDelayTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (taskStartDelayTimeoutRef.current != null) {
        window.clearTimeout(taskStartDelayTimeoutRef.current)
        taskStartDelayTimeoutRef.current = null
      }
    }
  }, [])

  const beginBlockRef = useRef<(sessionNum: number) => void>(() => {})
  const beginStopwatchRef = useRef<() => void>(() => {})
  const demoFocusAudioRef = useRef<HTMLAudioElement>(null)
  const demoBreakAudioRef = useRef<HTMLAudioElement>(null)
  const lapApproachChimedForBlockRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(DEMO_TRACK_VOL_STORAGE_KEY, String(demoTrackVol))
    } catch {
      /* ignore */
    }
    const focusEl = demoFocusAudioRef.current
    const breakEl = demoBreakAudioRef.current
    if (focusEl) {
      focusEl.muted = false
      focusEl.volume = effectiveDemoVol
    }
    if (breakEl) {
      breakEl.muted = false
      breakEl.volume = effectiveDemoVol
    }
  }, [demoTrackVol, effectiveDemoVol])

  /* Timer anchor lives in a ref; `hiresTick` bumps each tick to re-derive label/favicon. */
  /* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps */
  const { label: hiresLabel, faviconSec: docFaviconSec } = useMemo(
    () => readSessionClock(timerAnchorRef.current, view, doneOpen),
    [hiresTick, view, doneOpen],
  )
  /* eslint-enable react-hooks/refs, react-hooks/exhaustive-deps */
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setSessionHistory(JSON.parse(raw) as HistoryEntry[])
    } catch {
      /* ignore */
    }
  }, [])

  const activeModeId = useMemo(() => {
    const m = TIMER_MODE_PRESETS.find(
      (p) =>
        p.focusMins === focusMins &&
        p.breakMins === breakMins &&
        p.cycles === totalSessions,
    )
    return m?.id ?? TIMER_MODE_PRESETS[0].id
  }, [focusMins, breakMins, totalSessions])

  const applyTimerMode = useCallback((id: string) => {
    const p = TIMER_MODE_PRESETS.find((x) => x.id === id)
    if (!p) return
    setFocusMins(p.focusMins)
    setBreakMins(p.breakMins)
    setTotalSessions(p.cycles)
  }, [])

  const showToast = useCallback((msg: string, dur = 2200) => {
    setToast({ msg, show: true })
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), dur)
  }, [])

  const syncPipTimerWindow = useCallback(() => {
    const pip = pipWindowRef.current
    if (!pip || pip.closed) return
    const toggleBtn = pip.document.getElementById('pip-toggle')
    const clock = readSessionClock(
      timerAnchorRef.current,
      viewRef.current,
      doneOpenRef.current,
    ).label
    const pipMain = pip.document.getElementById('pip-time-main')
    if (pipMain) pipMain.textContent = clock
    if (toggleBtn) toggleBtn.textContent = paused ? 'Resume' : 'Pause'
  }, [paused])

  useEffect(() => {
    syncPipTimerWindow()
  }, [syncPipTimerWindow, hiresTick])

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
      const pipClock = readSessionClock(timerAnchorRef.current, view, doneOpen).label
      mountPipTimerShell(pip.document, pipClock, paused)
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

    if (a.mode === 'stopwatch') {
      setHiresTick((x) => x + 1)
      return
    }

    const now = Date.now()
    const total = totalSessionsRef.current
    const leftMs = getPhaseLeftMs(a, now)
    const leftSec = Math.max(0, Math.floor(leftMs / 1000))

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
      if (sessionNum >= 2) {
        playUiNoti(PHASE_SWITCH_NOTI_SRC, PHASE_SWITCH_NOTI_VOL)
      }
      pausedRef.current = false
      setPaused(false)
      const isBreak = sessionNum % 2 === 0
      if (!isBreak) lapApproachChimedForBlockRef.current = null
      setTimerMode(isBreak ? 'BREAK' : 'FOCUS')
      setCurSession(sessionNum)

      tickSessionNumRef.current = sessionNum
      const t0 = Date.now()
      if (isBreak) {
        timerAnchorRef.current = {
          mode: 'timer',
          kind: 'break',
          endAt: t0 + breakMins * 60 * 1000,
          pauseAt: null,
        }
      } else {
        timerAnchorRef.current = {
          mode: 'timer',
          kind: 'focus',
          endAt: t0 + focusMins * 60 * 1000,
          pauseAt: null,
        }
      }

      intervalRef.current = window.setInterval(() => {
        timerTickRef.current()
      }, 50)

      setHiresTick((x) => x + 1)
    },
    [breakMins, clearTimer, focusMins],
  )

  const beginStopwatch = useCallback(() => {
    clearTimer()
    pausedRef.current = false
    setPaused(false)
    setTimerMode('FOCUS')
    setCurSession(1)
    tickSessionNumRef.current = 1
    lapApproachChimedForBlockRef.current = null
    const t0 = Date.now()
    timerAnchorRef.current = {
      mode: 'stopwatch',
      runStartAt: t0,
      accumulatedMs: 0,
      pauseAt: null,
    }
    intervalRef.current = window.setInterval(() => {
      timerTickRef.current()
    }, 50)
    setHiresTick((x) => x + 1)
  }, [clearTimer])

  useEffect(() => {
    beginBlockRef.current = beginBlock
  }, [beginBlock])

  useEffect(() => {
    beginStopwatchRef.current = beginStopwatch
  }, [beginStopwatch])

  useEffect(() => () => clearTimer(), [clearTimer])

  const togglePause = useCallback(() => {
    const nextPaused = !pausedRef.current
    const a = timerAnchorRef.current
    if (nextPaused) {
      if (a && a.pauseAt == null) {
        if (a.mode === 'stopwatch') {
          const now = Date.now()
          a.accumulatedMs += now - a.runStartAt
          a.pauseAt = now
        } else {
          a.pauseAt = Date.now()
        }
      }
      pausedRef.current = true
      setPaused(true)
    } else {
      if (a && a.pauseAt != null) {
        if (a.mode === 'stopwatch') {
          a.runStartAt = Date.now()
          a.pauseAt = null
        } else {
          const dt = Date.now() - a.pauseAt
          a.endAt += dt
          a.pauseAt = null
        }
      }
      pausedRef.current = false
      setPaused(false)
    }
    setHiresTick((x) => x + 1)
  }, [])

  useEffect(() => {
    togglePauseRef.current = togglePause
  }, [togglePause])

  const launch = useCallback((options?: { skipTask?: boolean }) => {
    if (launchInProgressRef.current) return
    const skipTask = options?.skipTask === true
    const raw = taskInput.trim().toUpperCase()
    const t = skipTask ? '' : raw
    if (!skipTask && !t) return
    launchInProgressRef.current = true
    setTaskStartPending(true)
    if (skipTask) {
      setTaskInput('')
      taskTextRef.current = ''
      setTaskText('')
    } else {
      taskTextRef.current = t
      setTaskText(t)
    }

    playUiNoti(TASK_START_NOTI_SRC, TASK_START_NOTI_VOL)

    if (taskStartDelayTimeoutRef.current != null) {
      window.clearTimeout(taskStartDelayTimeoutRef.current)
    }
    taskStartDelayTimeoutRef.current = window.setTimeout(() => {
      taskStartDelayTimeoutRef.current = null
      setView('session')
      playDemoFocusIntro(
        demoFocusAudioRef.current,
        demoBreakAudioRef.current,
        effectiveDemoVol,
      )
      window.setTimeout(() => {
        launchInProgressRef.current = false
        setTaskStartPending(false)
        if (timekeepingModeRef.current === 'stopwatch') {
          beginStopwatchRef.current()
        } else {
          beginBlockRef.current(1)
        }
      }, 0)
    }, TASK_START_DELAY_MS)
  }, [effectiveDemoVol, taskInput])

  /** Pomodoro timer, no task line (session shows —). */
  const launchJustStart = useCallback(() => {
    if (taskStartPending || launchInProgressRef.current) return
    timekeepingModeRef.current = 'timer'
    setTimekeepingMode('timer')
    launch({ skipTask: true })
  }, [launch, taskStartPending])

  const restartSession = useCallback(() => {
    if (taskStartDelayTimeoutRef.current != null) {
      window.clearTimeout(taskStartDelayTimeoutRef.current)
      taskStartDelayTimeoutRef.current = null
    }
    setTaskStartPending(false)
    clearTimer()
    timerAnchorRef.current = null
    tickSessionNumRef.current = 0
    demoFocusAudioRef.current?.pause()
    demoBreakAudioRef.current?.pause()
    setPaused(false)
    pausedRef.current = false
    setView('setup')
    setTaskInput('')
    taskTextRef.current = ''
    setTaskText('')
    launchInProgressRef.current = false
    setDoneOpen(false)
    setCurSession(1)
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

    if (view !== 'session' || doneOpen) {
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
      breakEl.muted = false
      breakEl.volume = effectiveDemoVol
      void breakEl.play().catch(() => {})
    } else {
      pauseDemoAudio(breakEl, true)
      focusEl.muted = false
      focusEl.volume = effectiveDemoVol
      void focusEl.play().catch(() => {})
    }
  }, [effectiveDemoVol, view, timerMode, paused, doneOpen, selectedVibe])

  const demoFocusSrc = sessionDemoFocusSrc(selectedVibe as Vibe)
  const demoBreakSrc = sessionDemoBreakSrc(selectedVibe as Vibe)

  const isBreakTint =
    view === 'session' && timekeepingMode === 'timer' && curSession % 2 === 0
  const isDoneTint = doneOpen

  /** Setup: always play on landing. Session: same rules as music/timer (pause + dim when idle). */
  const bgVideoShouldPlay =
    view === 'setup' || (view === 'session' && !doneOpen && !paused)

  /** Darken ambient video on setup (first paint) and whenever session “music” lane is idle. */
  const bgVideoDim =
    view === 'setup' ||
    (view === 'session' && !doneOpen && !bgVideoShouldPlay)

  useEffect(() => {
    const v = bgVideoRef.current
    if (!v) return
    if (bgVideoShouldPlay) {
      void v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [bgVideoShouldPlay])

  return (
    <TickerWheelProvider>
    <div className="relative min-h-svh w-full max-w-[100vw]">
      <div
        id="hdAnimatedBg"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#030304]" />
        <video
          id="hdBgVideo"
          ref={bgVideoRef}
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover opacity-[0.92]"
          autoPlay={view === 'setup'}
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/lofi-cafe-in-evening.mp4" type="video/mp4" />
        </video>
        <div
          className={cn(
            'absolute inset-0 z-[1] bg-black transition-opacity duration-500',
            bgVideoDim ? 'opacity-[0.52]' : 'opacity-0',
          )}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_65%_at_50%_44%,transparent_0%,rgba(3,3,4,0.55)_52%,#030304_100%)]" />
      </div>
      {/* Session timer tint: full viewport (not only the left grid column). */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-[1] transition-colors duration-500',
          view === 'session' &&
            (isDoneTint ? 'bg-hd-done/18' : isBreakTint ? 'bg-hd-break/18' : null),
        )}
        aria-hidden
      />
      <div
        className={cn(
          'relative z-10 min-h-svh w-full max-w-[100vw] overflow-x-hidden font-sans text-white antialiased select-none lg:h-svh lg:overflow-hidden',
          HD_PAGE_FRAME,
        )}
      >
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
        className={cn(
          'fixed top-[max(1rem,env(safe-area-inset-top))] z-[200] flex flex-col gap-1.5',
          HD_TOP_BAR_INSET_MAX_LG,
          HD_TOP_BAR_INSET_X,
        )}
        id="hdTopBar"
      >
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3 sm:gap-x-6">
          <div className="min-w-0 justify-self-start">
            <HdWordmark onClick={restartSession} />
          </div>
          <div className="pointer-events-none justify-self-center text-center" aria-hidden />
          <div className="flex min-w-0 justify-end justify-self-end">
            <a
              id="hdSpotifyOpen"
              href="https://open.spotify.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(HD_TOP_BAR_BTN, HD_NAV_TEXT)}
            >
              <span className="block uppercase text-white">SPOTIFY</span>
              <ExternalLink className={cn(HD_ICON, 'self-end opacity-90')} strokeWidth={2.25} aria-hidden />
            </a>
          </div>
        </div>
      </div>

      <div
        id="toast"
        className={cn(
          'pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-[300] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-sm bg-white px-[22px] py-3 text-center tracking-wide text-hd-bg transition-all duration-300',
          HD_TEXT_BODY,
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        )}
      >
        {toast.msg}
      </div>

      <div
        id="historyPanel"
        className={cn(
          'fixed bottom-0 right-0 top-0 z-[220] flex w-full max-w-[min(100vw,340px)] flex-col border-l border-white/[0.1] bg-black/38 font-sans backdrop-blur-md transition-transform duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]',
          historyOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-3.5 pt-5">
          <div
            className={cn(HD_TEXT_BODY, 'font-normal uppercase tracking-[0.12em] text-white')}
            id="hdSessionLogTitle"
          >
            SESSION LOG
          </div>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0.5 text-white/50 hover:text-white"
            onClick={() => setHistoryOpen(false)}
            aria-label="Close session log"
          >
            <X className={HD_ICON_LG} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3.5 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]" id="histList">
          {!sessionHistory.length ? (
            <div
              className={cn(HD_TEXT_BODY, 'mt-10 text-center tracking-wide text-white/25')}
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
                <div className={cn(HD_TEXT_BODY, 'mb-1 tracking-wide text-white')}>{s.task}</div>
                <div className={cn(HD_TEXT_BODY, 'tracking-wide text-white/40')}>
                  {s.date} · {s.sessions} rounds · {s.vibe} · {s.duration}m focus
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-white/[0.08] px-5 pb-3.5 pt-3">
          <button
            type="button"
            className={cn(
              'flex h-11 min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-black/38 px-3 leading-none tracking-[0.1em] text-white/80 outline-none ring-1 ring-inset ring-white/[0.1] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/25',
              HD_FONT_UI,
            )}
            onClick={exportHistory}
          >
            <Download className={cn(HD_ICON, 'opacity-90')} strokeWidth={2.25} aria-hidden />
            EXPORT SESSION LOG
          </button>
        </div>
      </div>

      {/* Setup */}
      <div id="s1" className={hdMainGridShellClass('setup', view)}>
        <div
          className="@container relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent p-0 transition-colors duration-500 lg:min-h-0 lg:flex-none"
          id="s1Left"
        >
          <div className="relative z-[6] flex h-full min-h-0 flex-1 flex-col justify-center overflow-hidden">
            <div className={HD_STAGE_STACK}>
              <div className={cn(HD_LEFT_STAGE_COLUMN, HD_SETUP_TITLE_TO_INPUT_GAP)}>
                <h1
                  className={cn(HD_DISPLAY_TITLE, 'relative z-[2] w-full shrink-0 text-start')}
                  id="hdPageTitle"
                >
                  POMO + VIBE
                </h1>
                <div className="relative z-[1] w-full">
                  <div
                    className="hd-input-flare pointer-events-none absolute left-1/2 top-[46%] z-0 h-[min(280px,48vmin)] w-[min(122%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_52%_46%_at_50%_48%,rgba(255,252,240,0.5)_0%,rgba(255,234,190,0.26)_40%,rgba(245,200,95,0.12)_58%,transparent_76%)] blur-3xl"
                    aria-hidden
                  />
                  <div className="relative z-[1] w-full overflow-hidden rounded-xl border border-[#CBCBCB] bg-transparent">
                  {taskStartPending ? (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/45 px-4 backdrop-blur-[2px]"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <Loader2
                        className={cn(HD_ICON_LG, 'animate-spin text-white/70')}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className={cn(HD_TEXT_BODY, 'tracking-[0.1em] text-white/75')}>
                        STARTING SESSION…
                      </span>
                    </div>
                  ) : null}
                  <input
                    className={cn(
                      'box-border w-full min-h-[5.25rem] min-w-0 border-0 bg-transparent px-6 py-5 text-start outline-none ring-0 ring-offset-0 focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:bg-transparent',
                      HD_TASK_INPUT_VALUE,
                      HD_TASK_INPUT_PLACEHOLDER,
                      taskStartPending && 'pointer-events-none opacity-60',
                    )}
                    id="taskInput"
                    name="hd-task"
                    type="text"
                    autoComplete="off"
                    aria-label="Enter your task — press Enter to start"
                    placeholder="WHAT ARE YOU WORKING ON?"
                    maxLength={40}
                    value={taskInput}
                    readOnly={taskStartPending}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (taskStartPending) return
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      launch()
                    }}
                  />
                  <div
                    className={cn(
                      'flex min-h-[3.25rem] items-center justify-between gap-2 px-3 py-2.5',
                      taskStartPending && 'pointer-events-none opacity-60',
                    )}
                  >
                    <button
                      type="button"
                      id="hdSessionLogOpen"
                      className={cn(
                        HD_SETUP_ICON_BTN,
                        'text-white/80',
                        historyOpen && 'text-white',
                      )}
                      title={historyOpen ? 'Close session log' : 'Session log'}
                      aria-label={historyOpen ? 'Close session log' : 'Open session log'}
                      aria-expanded={historyOpen}
                      onClick={() => setHistoryOpen((o) => !o)}
                    >
                      <List className={HD_ICON_LG} strokeWidth={2} aria-hidden />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <TimerModeSelect
                        modeId={activeModeId}
                        onSelectMode={applyTimerMode}
                        disabled={timekeepingMode === 'stopwatch'}
                      />
                      <TimekeepingModeToggle
                        mode={timekeepingMode}
                        onToggle={setTimekeepingMode}
                      />
                    </div>
                  </div>
                </div>
                  <button
                    type="button"
                    className={cn(
                      'mt-4 flex w-full cursor-pointer items-center justify-start gap-2 border-0 bg-transparent px-2 py-2 text-start tracking-[0.12em] text-white/75 outline-none transition-colors hover:text-white focus-visible:underline focus-visible:underline-offset-4 disabled:pointer-events-none disabled:opacity-50',
                      HD_FONT_UI,
                      'text-[clamp(1.125rem,3.8cqw,1.5rem)]',
                    )}
                    aria-label="Start session without a task"
                    disabled={taskStartPending}
                    onClick={launchJustStart}
                  >
                    Just start bruh
                    <ArrowRight className="h-[1.1em] w-[1.1em] shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
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
          className="@container relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent p-0 lg:min-h-0 lg:flex-none"
          id="s2Left"
        >
          <div className="relative z-[6] flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center overflow-hidden">
            <div className={HD_STAGE_STACK}>
              <div className={cn(HD_LEFT_STAGE_COLUMN, HD_COLUMN_STACK_GAP)}>
                <div className={HD_DISPLAY_TITLE} id="s2Task">
                  {taskText || '—'}
                </div>
                {!doneOpen ? (
                  <div className="w-full text-start" aria-live="polite" aria-atomic="true">
                    <span
                      id="timerNum"
                      className={cn(
                        HD_TIMER_DISPLAY,
                        'text-white tabular-nums',
                        paused &&
                          '[text-shadow:0_0_1px_rgba(0,0,0,0.9),0_2px_28px_rgba(255,255,255,0.35)]',
                      )}
                    >
                      {hiresLabel}
                    </span>
                  </div>
                ) : null}
                <div
                  className="flex w-full min-w-0 max-w-full items-center justify-start gap-2 rounded-full bg-black/28 px-3 py-2"
                  id="nowPlaying"
                >
                  <div className="flex h-[14px] shrink-0 items-end gap-0.5">
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate]" />
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.15s]" />
                    <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.3s]" />
                  </div>
                  <div
                    className={cn(HD_TEXT_BODY, 'min-w-0 text-start tracking-wide text-white/65')}
                    id="npText"
                  >
                    {VIBE_TRACKS[selectedVibe] ?? `${selectedVibe} MIX`}
                  </div>
                </div>
              </div>

              <div className={HD_LEFT_TRANSPORT_STACK}>
                <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
                  <button type="button" className={HD_TRANSPORT_INSET_BTN} onClick={restartSession}>
                    <RotateCcw className={HD_ICON} strokeWidth={2.25} aria-hidden />
                    RESET
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex h-10 min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 leading-none tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/25',
                      HD_FONT_UI,
                      paused
                        ? 'border-white/45 bg-white/22 text-white hover:bg-white/30'
                        : 'border-transparent bg-white text-hd-bg hover:bg-zinc-200',
                    )}
                    id="pauseBtn"
                    onClick={togglePause}
                  >
                    {paused ? (
                      <>
                        <Play className={HD_ICON} strokeWidth={2.25} aria-hidden />
                        RESUME
                      </>
                    ) : (
                      <>
                        <Pause className={HD_ICON} strokeWidth={2.25} aria-hidden />
                        PAUSE
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={HD_TRANSPORT_INSET_BTN}
                    title="Floating timer window (Chrome / Edge)"
                    onClick={() => void openTimerPictureInPicture()}
                  >
                    <PictureInPicture2 className={HD_ICON} strokeWidth={2.25} aria-hidden />
                    PiP
                  </button>
                  <div
                    className={cn(
                      'flex h-10 min-h-10 min-w-0 flex-1 items-center gap-2 px-2',
                      HD_INPUT_CARD_CONTROL_CHROME,
                    )}
                  >
                    <button
                      type="button"
                      className="inline-flex shrink-0 rounded border-0 bg-transparent p-0 text-white/45 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/25"
                      onClick={() => setDemoMuted((m) => !m)}
                      aria-label={demoMuted ? 'Unmute demo mix' : 'Mute demo mix'}
                      title={demoMuted ? 'Unmute' : 'Mute'}
                    >
                      {demoMuted ? (
                        <VolumeX className={HD_ICON} strokeWidth={2} aria-hidden />
                      ) : (
                        <Volume2 className={HD_ICON} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={demoTrackVol}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setDemoTrackVol(v)
                        if (v > 0) setDemoMuted(false)
                      }}
                      className="min-h-4 min-w-0 flex-1 cursor-pointer accent-white/80"
                      aria-label="Demo mix volume"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

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
            <div className="font-[family-name:var(--font-euclid-flex)] text-[58px] tracking-wide text-white">
              TRACK DONE
            </div>
            <div
              className={cn(HD_TEXT_BODY, 'mt-1.5 tracking-wide text-white/45')}
              id="doneSub"
            >
              {focusMins} min · {selectedVibe}
            </div>
            <div className="mt-5 flex w-full max-w-[min(100%,20rem)] flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
              <button
                type="button"
                className={cn(
                  HD_TEXT_BODY,
                  'inline-flex cursor-pointer items-center justify-center gap-2 rounded border-[1.5px] border-white/30 bg-transparent px-5 py-3 font-normal tracking-wide text-white transition-colors hover:border-white',
                )}
                onClick={exportAlbumCover}
              >
                <Download className={HD_ICON_LG} strokeWidth={2} aria-hidden />
                SAVE COVER
              </button>
              <button
                type="button"
                className={cn(
                  HD_TEXT_BODY,
                  'inline-flex cursor-pointer items-center justify-center gap-2 rounded border-0 bg-white px-5 py-3 font-normal tracking-wide text-hd-bg transition-colors hover:bg-zinc-200',
                )}
                onClick={restartSession}
              >
                NEW SESSION
                <ArrowRight className={HD_ICON_LG} strokeWidth={2} aria-hidden />
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

      <p className={cn(HD_VIEWPORT_COPYRIGHT, 'text-white/40')} aria-hidden>
        © 2026 Julian C
      </p>

    </div>
    </div>
    </TickerWheelProvider>
  )
}
