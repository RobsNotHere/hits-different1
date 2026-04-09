'use client'

import { cn } from '@/lib/cn'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
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
import { TimerStageRings } from '@/components/hits-different/TimerStageRings'
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
  HD_COPYRIGHT_LINE,
  HD_STAGE_FOOTER_LINE,
  HD_STAGE_FOOTER_STACK,
  HD_TIMER_STAGE_COLUMN,
  HD_TOP_BAR_BTN,
  hdMainGridShellClass,
} from '@/lib/hits-different/hdUiClasses'

function fmt(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
  'shrink-0 text-start font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wide text-white/55'
const TIMER_SELECT_CLS =
  'max-w-[120px] w-[120px] cursor-pointer appearance-none rounded border border-white/20 bg-black/50 py-1 pl-2 pr-7 text-left font-[family-name:var(--font-space-mono)] text-[11px] text-white outline-none focus:border-white/50'

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
        'flex items-center justify-start gap-3',
        marginBottom && 'mb-2.5',
      )}
    >
      <label htmlFor={id} className={TIMER_SELECT_LABEL_CLS}>
        {label}
      </label>
      <div className="relative shrink-0">
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
        <span
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 block -translate-y-1/2 text-[8px] leading-none text-white/40 transition-transform duration-200 ease-out',
            !listOpen && 'rotate-180',
          )}
          aria-hidden
        >
          ▼
        </span>
      </div>
    </div>
  )
}

function DotsRow({
  total,
  current,
  id,
}: {
  total: number
  current: number
  id: string
}) {
  return (
    <div className="relative z-[5] mt-[18px] flex justify-start gap-2" id={id}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'size-[9px] rounded-full transition-colors duration-300',
            i < current - 1 && 'bg-white/40',
            i === current - 1 && 'bg-white',
            i > current - 1 && 'bg-white/14',
          )}
        />
      ))}
    </div>
  )
}

/**
 * One tick of the pomodoro interval: decrement seconds, or clear the interval and
 * schedule the next block / finish. Extracted so `beginBlock` stays flat and this
 * logic is testable by inspection.
 */
function nextRemainingAfterSecond(
  r: number,
  sessionNum: number,
  totalSessions: number,
  intervalRef: MutableRefObject<number | null>,
  beginBlock: (n: number) => void,
  finish: (n: number) => void,
): number {
  if (r > 1) return r - 1

  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }
  if (sessionNum < totalSessions) {
    window.setTimeout(() => beginBlock(sessionNum + 1), 0)
  } else {
    window.setTimeout(() => finish(sessionNum), 0)
  }
  return 0
}

const DEMO_LOOP_VOL = 0.32

function playDemoFocusIntro(
  focusEl: HTMLAudioElement | null,
  breakEl: HTMLAudioElement | null,
): void {
  if (!focusEl || !breakEl) return
  breakEl.pause()
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
  const [remaining, setRemaining] = useState(25 * 60)
  const [timerMode, setTimerMode] = useState('FOCUS')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  /** Timer was auto-paused because in-browser Spotify started playing; cleared on manual pause or session end. */
  const spotifyDrovePauseRef = useRef(false)
  const browserSpotifyPlayingRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  const taskTextRef = useRef('')
  const selectedVibeRef = useRef('LO-FI')
  const focusMinsRef = useRef(25)

  useEffect(() => {
    taskTextRef.current = taskText
    selectedVibeRef.current = selectedVibe
    focusMinsRef.current = focusMins
  }, [taskText, selectedVibe, focusMins])

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
  const [s2VinylSpin, setS2VinylSpin] = useState(false)

  const launchInProgressRef = useRef(false)
  const timerSettingsRef = useRef<HTMLDivElement>(null)
  const beginBlockRef = useRef<(sessionNum: number) => void>(() => {})
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false)
  const demoFocusAudioRef = useRef<HTMLAudioElement>(null)
  const demoBreakAudioRef = useRef<HTMLAudioElement>(null)

  const { notice: spotifyPlaybackNotice, accountVerified: spotifyAccountVerified } =
    useSpotifyPlaybackNotice(status)

  useSessionTimerDocumentMeta(view === 'session' && !doneOpen, remaining)

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
        pausedRef.current = true
        setPaused(true)
        setS2VinylSpin(true)
      }
    } else if (spotifyDrovePauseRef.current) {
      spotifyDrovePauseRef.current = false
      pausedRef.current = false
      setPaused(false)
      setS2VinylSpin(true)
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
    const timeEl = pip.document.getElementById('pip-time')
    const modeEl = pip.document.getElementById('pip-mode')
    const toggleBtn = pip.document.getElementById('pip-toggle')
    if (timeEl) timeEl.textContent = fmt(remaining)
    if (modeEl) modeEl.textContent = timerMode
    if (toggleBtn) toggleBtn.textContent = paused ? 'Resume' : 'Pause'
  }, [remaining, timerMode, paused])

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
      pip.document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;padding:12px;font-family:ui-monospace,monospace;">
        <div id="pip-time" style="font-size:40px;font-weight:600;letter-spacing:0.06em;line-height:1;">${fmt(remaining)}</div>
        <div id="pip-mode" style="margin-top:6px;font-size:11px;letter-spacing:0.25em;opacity:0.45;">${timerMode}</div>
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
  }, [paused, remaining, showToast, syncPipTimerWindow, timerMode])

  const onSpotifyWebError = useCallback((msg: string) => showToast(msg), [showToast])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const finish = useCallback((completedSessionNum: number) => {
    clearTimer()
    setS2VinylSpin(false)
    setPaused(false)
    pausedRef.current = false
    spotifyDrovePauseRef.current = false
    browserSpotifyPlayingRef.current = false
    const entry: HistoryEntry = {
      task: taskTextRef.current,
      emoji: '🎵',
      vibe: selectedVibeRef.current,
      sessions: completedSessionNum,
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

  const beginBlock = useCallback(
    (sessionNum: number) => {
      clearTimer()
      pausedRef.current = false
      setPaused(false)
      const isBreak = sessionNum % 2 === 0
      const sec = isBreak ? breakMins * 60 : focusMins * 60
      setRemaining(sec)
      setTimerMode(isBreak ? 'BREAK' : 'FOCUS')
      setCurSession(sessionNum)
      setS2VinylSpin(true)

      intervalRef.current = window.setInterval(() => {
        if (pausedRef.current) return
        setRemaining((r) =>
          nextRemainingAfterSecond(
            r,
            sessionNum,
            totalSessions,
            intervalRef,
            (n) => beginBlockRef.current(n),
            finish,
          ),
        )
      }, 1000)

      if (browserSpotifyPlayingRef.current) {
        spotifyDrovePauseRef.current = true
        pausedRef.current = true
        setPaused(true)
        setS2VinylSpin(true)
      }
    },
    [breakMins, clearTimer, finish, focusMins, totalSessions],
  )

  useEffect(() => {
    beginBlockRef.current = beginBlock
  }, [beginBlock])

  useEffect(() => () => clearTimer(), [clearTimer])

  const togglePause = useCallback(() => {
    spotifyDrovePauseRef.current = false
    const nextPaused = !pausedRef.current
    pausedRef.current = nextPaused
    setPaused(nextPaused)
    setS2VinylSpin(!nextPaused)
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
  }, [clearTimer])

  const exportHistory = useCallback(() => {
    if (!sessionHistory.length) {
      showToast('No sessions to export')
      return
    }
    const rows = ['Task,Date,Sessions,Vibe,Focus Duration (min),Completed']
    sessionHistory.forEach((s) => {
      rows.push(
        `"${s.task}","${s.date}",${s.sessions},"${s.vibe}",${s.duration},${s.completed}`,
      )
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    triggerBlobDownload(blob, 'hits-different-sessions.csv')
    showToast('Session log exported ✓')
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
      showToast('Album cover saved ✓')
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

  useEffect(() => {
    const focusEl = demoFocusAudioRef.current
    const breakEl = demoBreakAudioRef.current
    if (!focusEl || !breakEl) return

    if (view !== 'session' || paused || doneOpen || isSignedIn) {
      focusEl.pause()
      breakEl.pause()
      return
    }

    const wantBreak = timerMode === 'BREAK'

    if (wantBreak) {
      focusEl.pause()
      breakEl.volume = DEMO_LOOP_VOL
      void breakEl.play().catch(() => {})
    } else {
      breakEl.pause()
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
    <div className="box-border min-h-svh w-full max-w-[100vw] overflow-x-hidden bg-hd-bg font-sans text-white antialiased select-none lg:h-svh lg:overflow-hidden">
      <audio
        key={demoFocusSrc}
        ref={demoFocusAudioRef}
        className="sr-only"
        src={demoFocusSrc}
        loop
        preload="auto"
        aria-hidden
      />
      <audio
        key={demoBreakSrc}
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
        <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-x-3 gap-y-1">
          <HdWordmark />
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-x-2.5 sm:gap-x-3.5">
            <button
              type="button"
              id="hdSessionLogNav"
              className={HD_TOP_BAR_BTN}
              onClick={() => setHistoryOpen(true)}
            >
              SESSION LOG →
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
          'fixed bottom-0 right-0 top-0 z-[150] flex w-full max-w-[min(100vw,340px)] flex-col border-l border-white/10 bg-hd-panel font-sans transition-transform duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]',
          historyOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-3.5 pt-5">
          <div className="font-[family-name:var(--font-bebas)] text-[26px] tracking-wide">
            SESSION LOG
          </div>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent text-lg text-white/50 hover:text-white"
            onClick={() => setHistoryOpen(false)}
          >
            ✕
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
                  {s.date} · {s.sessions} sessions · {s.vibe} · {s.duration}m focus
                </div>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          className="mx-5 mb-3.5 cursor-pointer rounded border border-white/20 bg-white/10 px-2.5 py-2.5 text-center font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
          onClick={exportHistory}
        >
          ⬇ EXPORT SESSION LOG
        </button>
      </div>

      {/* Setup */}
      <div id="s1" className={hdMainGridShellClass('setup', view)}>
        <div
          className="relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-hd-gold px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[4.5rem] transition-colors duration-500 sm:px-6 lg:min-h-0 lg:flex-none lg:pb-5 lg:pt-5"
          id="s1Left"
        >
          <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
            <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center px-1 py-2">
              <div
                className={cn(
                  'flex w-full max-w-[280px] flex-col items-start text-start',
                  HD_COLUMN_STACK_GAP,
                )}
              >
            <div className="relative w-full max-w-[230px] shrink-0 self-start">
              <div
                className="relative z-[3] flex aspect-square w-full max-w-[200px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#222] text-[clamp(44px,12vw,58px)] transition-transform duration-300"
                id="s1Cover"
              >
                <span className="relative z-[2] text-[clamp(44px,12vw,58px)]" id="s1Emoji">
                  🎵
                </span>
              </div>
              <div
                className="hd-vinyl"
                id="s1Vinyl"
              />
            </div>

            <div className={cn('flex w-full shrink-0 flex-col', HD_COLUMN_STACK_GAP)}>
              <div className="flex w-full flex-col gap-2">
                <div className="flex w-full justify-start gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border-[1.5px] border-white/25 bg-black/35 px-3 py-2 text-left font-[family-name:var(--font-space-mono)] text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45 focus:bg-black/40 focus:outline-none"
                    id="taskInput"
                    type="text"
                    aria-label="Set your task — press Enter to start"
                    placeholder="Set your task to begin"
                    maxLength={42}
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      launch()
                    }}
                  />
                  <button
                    type="button"
                    className={cn(
                      'inline-flex size-[38px] shrink-0 items-center justify-center rounded border-[1.5px] p-0 font-[family-name:var(--font-space-mono)] text-[15px] leading-none transition-colors',
                      taskInput.trim()
                        ? 'border-transparent bg-white text-hd-bg hover:bg-zinc-200'
                        : 'cursor-not-allowed border-white/20 bg-white/15 text-white/40 hover:bg-white/15',
                    )}
                    disabled={!taskInput.trim()}
                    title="Start session"
                    aria-label="Start session"
                    onClick={() => launch()}
                  >
                    <span
                      className="inline-flex size-full items-center justify-center pl-[2px] pt-[1px]"
                      aria-hidden
                    >
                      ▶
                    </span>
                  </button>
                </div>
                <div className="relative flex justify-start" ref={timerSettingsRef}>
                  <button
                    type="button"
                    className={cn(
                      'flex h-[34px] w-[34px] items-center justify-center rounded border-[1.5px] border-white/25 bg-black/25 font-[family-name:var(--font-space-mono)] text-[14px] text-white/80 transition-colors hover:border-white/45 hover:bg-black/35 hover:text-white',
                      timerSettingsOpen && 'border-white/50 bg-black/40 text-white',
                    )}
                    title="Focus, break & rounds"
                    aria-expanded={timerSettingsOpen}
                    aria-haspopup="dialog"
                    aria-controls="timerSettingsPanel"
                    onClick={() => setTimerSettingsOpen((o) => !o)}
                  >
                    ⚙
                  </button>
                  {timerSettingsOpen ? (
                    <div
                      className="absolute left-0 top-[calc(100%+8px)] z-[60] w-[min(calc(100vw-2.5rem),220px)] rounded border border-white/15 bg-[#141414] p-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
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
                        Set focus length, break length, and number of pomodoro rounds before you start.
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
        </div>

        <TickerColumn
          tickerId="ticker1"
          selectedVibe={selectedVibe}
          vibeHighlight={vibeHighlight}
          onVibePick={handleVibePick}
          wheelForwardActive={view === 'setup'}
        />

        <div className={HD_TIMER_STAGE_COLUMN}>
          <TimerStageRings />
          <div className="relative z-[5] w-full text-start">
            <div className="font-[family-name:var(--font-bebas)] text-[clamp(88px,16vw,168px)] leading-none tracking-[6px] text-white/10">
              {String(focusMins).padStart(2, '0')}:00
            </div>
          </div>
          <DotsRow total={totalSessions} current={1} id="previewDots" />
          <div className={HD_STAGE_FOOTER_STACK} id="previewLabel">
            <div className={HD_STAGE_FOOTER_LINE}>
              {totalSessions} POMODORO SESSIONS
            </div>
            <p className={HD_COPYRIGHT_LINE} aria-hidden>
              © {new Date().getFullYear()} Hits Different
            </p>
          </div>
        </div>
      </div>

      {/* Session */}
      <div id="s2" className={hdMainGridShellClass('session', view)}>
        <div
          className={cn(
            'relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[4.5rem] transition-colors duration-500 sm:px-6 lg:min-h-0 lg:flex-none lg:pb-5 lg:pt-5',
            isBreakTint && 'bg-hd-break',
            isDoneTint && 'bg-hd-done',
            !isBreakTint && !isDoneTint && 'bg-hd-gold',
          )}
          id="s2Left"
        >
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-0 py-2">
            <div
              className={cn(
                'flex w-full max-w-[280px] flex-col items-start text-start',
                HD_COLUMN_STACK_GAP,
              )}
            >
              <div className="relative w-full max-w-[230px] shrink-0 self-start">
                <div
                  className="relative z-[3] flex aspect-square w-full max-w-[200px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#222] text-[clamp(44px,12vw,58px)] transition-transform duration-300"
                  id="s2Cover"
                >
                  <span className="relative z-[2] text-[clamp(44px,12vw,58px)]" id="s2Emoji">
                    🎵
                  </span>
                </div>
                <div className={cn('hd-vinyl', s2VinylSpin && 'hd-vinyl-spin')} id="s2Vinyl" />
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
              {totalSessions} SESSIONS · {focusMins}MIN FOCUS · {selectedVibe}
            </div>
            <div className="mt-5 flex w-full max-w-[min(100%,20rem)] flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
              <button
                type="button"
                className="cursor-pointer rounded border-[1.5px] border-white/30 bg-transparent px-5 py-2.5 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white transition-colors hover:border-white"
                onClick={exportAlbumCover}
              >
                ⬇ SAVE COVER
              </button>
              <button
                type="button"
                className="cursor-pointer rounded border-0 bg-white px-5 py-2.5 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-hd-bg transition-colors hover:bg-zinc-200"
                onClick={restartSession}
              >
                NEW SESSION →
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

        <div className={HD_TIMER_STAGE_COLUMN} id="s2Right">
          <TimerStageRings />
          <div className="relative z-[5] w-full text-start">
            <div className="font-[family-name:var(--font-bebas)] text-[clamp(88px,16vw,168px)] leading-none tracking-[6px] text-white" id="timerNum">
              {view === 'session' ? fmt(remaining) : `${String(focusMins).padStart(2, '0')}:00`}
            </div>
            <div
              className="mt-1.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-[3px] text-white/30"
              id="timerMode"
            >
              {view === 'session' ? timerMode : 'FOCUS'}
            </div>
          </div>
          <DotsRow total={totalSessions} current={curSession} id="liveDots" />
          <div className="relative z-[5] mt-5 flex flex-wrap justify-start gap-2">
            <button
              type="button"
              className="cursor-pointer rounded border border-white/20 bg-white/10 px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
              onClick={restartSession}
            >
              ↺ RESET
            </button>
            <button
              type="button"
              className={cn(
                'cursor-pointer rounded border px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide transition-colors',
                paused
                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                  : 'border-transparent bg-white text-hd-bg hover:bg-zinc-200',
              )}
              id="pauseBtn"
              onClick={togglePause}
            >
              {paused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded border border-white/20 bg-white/10 px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white transition-colors hover:bg-white/15"
              title="Floating timer window (Chrome / Edge)"
              onClick={() => void openTimerPictureInPicture()}
            >
              ⛶ PiP
            </button>
          </div>
          <div className={HD_STAGE_FOOTER_STACK} id="sessLabel">
            <div className={HD_STAGE_FOOTER_LINE}>
              SESSION {curSession} OF {totalSessions}
            </div>
            <p className={HD_COPYRIGHT_LINE} aria-hidden>
              © {new Date().getFullYear()} Hits Different
            </p>
          </div>
        </div>
      </div>

    </div>
    </TickerWheelProvider>
  )
}
