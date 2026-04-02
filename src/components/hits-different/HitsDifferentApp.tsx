'use client'

import NextImage from 'next/image'
import { cn } from '@/lib/cn'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useUser } from '@/context/UserContext'
import {
  drawFallbackCoverCanvas,
  drawGeneratedCoverCanvas,
  overlayCoverText,
  type ParsedCover,
} from '@/lib/hits-different/canvas'
import {
  BREAK_OPTS,
  CHARS,
  DUR_OPTS,
  HISTORY_KEY,
  SESSION_DEMO_AUDIO,
  SESSION_OPTS,
  type CharDef,
  type HistoryEntry,
  TICKER_ITEMS,
  type Vibe,
  VIBES,
  VIBE_SAMPLE_PLAYLISTS,
  VIBE_TRACKS,
  youtubeMusicSearchUrlFor,
} from '@/lib/hits-different/data'

function fmt(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function TickerTrack({ id }: { id: string }) {
  const items = useMemo(() => {
    const quad = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS]
    return quad.map((t, i) => (
      <span
        key={`${id}-${i}`}
        className={
          t.startsWith('APPROACH') || t.startsWith('WITH')
            ? 'font-bold text-white/[0.72]'
            : undefined
        }
      >
        {t}
      </span>
    ))
  }, [id])
  return (
    <div className="z-10 flex flex-col overflow-hidden pointer-events-none">
      <div
        className="flex flex-col animate-[hd-tick_22s_linear_infinite] text-center font-[family-name:var(--font-space-mono)] text-[10.5px] leading-[2.1] text-white/20 whitespace-nowrap"
        id={id}
      >
        {items}
      </div>
    </div>
  )
}

function SampleMixLinks({
  vibe,
  compact,
}: {
  vibe: string
  compact?: boolean
}) {
  const v = vibe as Vibe
  const sample = VIBE_SAMPLE_PLAYLISTS[v]
  if (!sample) return null
  const yt = youtubeMusicSearchUrlFor(v)
  const linkCls =
    'font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/55 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white/50'
  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-2">
        <a href={sample.spotifyUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
          Spotify
        </a>
        <a href={yt} target="_blank" rel="noopener noreferrer" className={linkCls}>
          YouTube Music
        </a>
      </div>
    )
  }
  return (
    <div className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1">
      <a href={sample.spotifyUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
        Spotify
      </a>
      <a href={yt} target="_blank" rel="noopener noreferrer" className={linkCls}>
        YouTube Music
      </a>
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
    <div className="relative z-[5] mt-[18px] flex gap-2" id={id}>
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

export default function HitsDifferentApp() {
  const { user, isSignedIn, status, signInWithSpotify, signOutUser } = useUser()

  const [view, setView] = useState<'setup' | 'session'>('setup')
  const [selectedChar, setSelectedChar] = useState<CharDef | null>(null)
  const [selectedVibe, setSelectedVibe] = useState('LO-FI')
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
  const intervalRef = useRef<number | null>(null)

  const taskTextRef = useRef('')
  const selectedCharRef = useRef<CharDef | null>(null)
  const selectedVibeRef = useRef('LO-FI')
  const focusMinsRef = useRef(25)

  useEffect(() => {
    taskTextRef.current = taskText
    selectedCharRef.current = selectedChar
    selectedVibeRef.current = selectedVibe
    focusMinsRef.current = focusMins
  }, [taskText, selectedChar, selectedVibe, focusMins])

  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [toast, setToast] = useState({ msg: '', show: false })
  const [doneOpen, setDoneOpen] = useState(false)
  const [s2VinylSpin, setS2VinylSpin] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [generatedCoverDataURL, setGeneratedCoverDataURL] = useState<string | null>(null)
  const [s1CoverImg, setS1CoverImg] = useState<string | null>(null)
  const [s2CanvasMode, setS2CanvasMode] = useState(false)

  const s2CanvasRef = useRef<HTMLCanvasElement>(null)
  const launchInProgressRef = useRef(false)
  const timerSettingsRef = useRef<HTMLDivElement>(null)
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false)
  const demoFocusAudioRef = useRef<HTMLAudioElement>(null)
  const demoBreakAudioRef = useRef<HTMLAudioElement>(null)

  const [spotifyPlaybackNotice, setSpotifyPlaybackNotice] = useState<
    null | 'nonPremium' | 'error'
  >(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      setSpotifyPlaybackNotice(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const r = await fetch('/api/spotify/account')
        if (!r.ok) {
          if (!cancelled) setSpotifyPlaybackNotice('error')
          return
        }
        const j = (await r.json()) as { product?: string }
        if (cancelled) return
        const p = j.product?.toLowerCase()
        if (p === 'premium') setSpotifyPlaybackNotice(null)
        else setSpotifyPlaybackNotice('nonPremium')
      } catch {
        if (!cancelled) setSpotifyPlaybackNotice('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
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
    const entry: HistoryEntry = {
      task: taskTextRef.current,
      emoji: selectedCharRef.current?.emoji ?? '🎵',
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
        setRemaining((r) => {
          if (r <= 1) {
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
          return r - 1
        })
      }, 1000)
    },
    [breakMins, clearTimer, finish, focusMins, totalSessions],
  )

  useEffect(() => () => clearTimer(), [clearTimer])

  const togglePause = useCallback(() => {
    const nextPaused = !pausedRef.current
    pausedRef.current = nextPaused
    setPaused(nextPaused)
    setS2VinylSpin(!nextPaused)
  }, [])

  const launch = useCallback(() => {
    if (launchInProgressRef.current) return
    const t = taskInput.trim().toUpperCase()
    if (!t) return
    launchInProgressRef.current = true
    taskTextRef.current = t
    setTaskText(t)
    setView('session')

    if (!isSignedIn) {
      const fo = demoFocusAudioRef.current
      const br = demoBreakAudioRef.current
      if (fo && br) {
        br.pause()
        fo.volume = 0.32
        void fo.play().catch(() => {})
      }
    }

    window.setTimeout(() => {
      if (generatedCoverDataURL && s2CanvasRef.current) {
        const img = new Image()
        img.onload = () => {
          const c = s2CanvasRef.current
          if (!c) return
          const ctx = c.getContext('2d')
          if (!ctx) return
          c.width = 200
          c.height = 200
          ctx.drawImage(img, 0, 0, 200, 200)
          setS2CanvasMode(true)
        }
        img.src = generatedCoverDataURL
      } else {
        setS2CanvasMode(false)
      }
      launchInProgressRef.current = false
      beginBlock(1)
    }, 0)
  }, [beginBlock, generatedCoverDataURL, isSignedIn, taskInput])

  const restartSession = useCallback(() => {
    clearTimer()
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
    setS2CanvasMode(false)
    setGeneratedCoverDataURL(null)
    setS1CoverImg(null)
    setCurSession(1)
  }, [clearTimer])

  const generateAICover = useCallback(async () => {
    const task = taskInput.trim() || taskText || 'focus session'
    const char = selectedChar ? selectedChar.name.replace('\n', ' ') : 'focused worker'
    setAiBusy(true)
    try {
      const res = await fetch('/api/ai-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, vibe: selectedVibe, char }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        parsed?: ParsedCover
        error?: string
      }
      if (!res.ok || !data.parsed) {
        throw new Error(data.error || 'failed')
      }
      const url = drawGeneratedCoverCanvas(data.parsed, selectedVibe)
      setGeneratedCoverDataURL(url)
      setS1CoverImg(url)
      showToast('Album cover generated ✓')
    } catch {
      const url = drawFallbackCoverCanvas(task, selectedVibe, selectedChar)
      setGeneratedCoverDataURL(url)
      setS1CoverImg(url)
      showToast('Using vibe cover (add ANTHROPIC_API_KEY for AI)')
    } finally {
      setAiBusy(false)
    }
  }, [selectedChar, selectedVibe, showToast, taskInput, taskText])

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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hits-different-sessions.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Session log exported ✓')
  }, [sessionHistory, showToast])

  const exportAlbumCover = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 1000
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (img: HTMLImageElement | null) => {
      if (img) {
        ctx.drawImage(img, 0, 0, 1000, 1000)
      } else {
        ctx.fillStyle = '#C8A020'
        ctx.fillRect(0, 0, 1000, 1000)
        ctx.font = '320px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(selectedChar?.emoji ?? '🎵', 500, 500)
      }
      overlayCoverText(ctx, taskText, selectedVibe)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'hits-different-cover.png'
        a.click()
        URL.revokeObjectURL(url)
        showToast('Album cover saved ✓')
      })
    }

    if (generatedCoverDataURL) {
      const img = new Image()
      img.onload = () => draw(img)
      img.src = generatedCoverDataURL
    } else {
      draw(null)
    }
  }, [generatedCoverDataURL, selectedChar, selectedVibe, showToast, taskText])

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
    const vol = 0.32

    if (wantBreak) {
      focusEl.pause()
      breakEl.volume = vol
      void breakEl.play().catch(() => {})
    } else {
      breakEl.pause()
      focusEl.volume = vol
      void focusEl.play().catch(() => {})
    }
  }, [view, timerMode, paused, doneOpen, isSignedIn])

  const isBreakTint = view === 'session' && curSession % 2 === 0
  const isDoneTint = doneOpen

  return (
    <div className="box-border h-screen w-screen overflow-hidden bg-hd-bg font-sans text-white antialiased select-none">
      <audio
        ref={demoFocusAudioRef}
        className="sr-only"
        src={SESSION_DEMO_AUDIO.focus}
        loop
        preload="auto"
        aria-hidden
      />
      <audio
        ref={demoBreakAudioRef}
        className="sr-only"
        src={SESSION_DEMO_AUDIO.break}
        loop
        preload="auto"
        aria-hidden
      />
      <div
        className="fixed right-[18px] top-4 z-[200] flex flex-col items-end gap-1.5"
        id="hdTopBar"
      >
        <div className="flex items-center gap-3.5">
          {status === 'authenticated' ? (
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-white"
              onClick={() => signOutUser()}
              title={user.email ?? ''}
            >
              {user.name ?? 'Spotify'} · OUT
            </button>
          ) : (
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-white"
              onClick={() => signInWithSpotify()}
            >
              CONNECT SPOTIFY
            </button>
          )}
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-white"
            onClick={() => setHistoryOpen((o) => !o)}
          >
            HISTORY ☰
          </button>
        </div>
        {spotifyPlaybackNotice ? (
          <p
            className="max-w-[min(320px,calc(100vw-2rem))] text-right font-[family-name:var(--font-space-mono)] text-[9px] leading-snug tracking-wide text-amber-200/85"
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
          'pointer-events-none fixed bottom-[30px] left-1/2 z-[300] -translate-x-1/2 rounded-sm bg-white px-[22px] py-2.5 font-[family-name:var(--font-space-mono)] text-[11px] tracking-wide text-hd-bg transition-all duration-300',
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        )}
      >
        {toast.msg}
      </div>

      <div
        id="historyPanel"
        className={cn(
          'fixed bottom-0 right-0 top-0 z-[150] flex w-[340px] flex-col border-l border-white/10 bg-hd-panel font-sans transition-transform duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]',
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
      <div
        id="s1"
        className={cn(
          'absolute inset-0 z-0 grid grid-cols-[1fr_160px_1fr]',
          view === 'setup' ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div
          className="relative z-[5] flex flex-col overflow-hidden bg-hd-gold p-5 transition-colors duration-500 sm:px-6"
          id="s1Left"
        >
          <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:w-0">
            <div className="shrink-0">
              <div
                className="size-[11px] shrink-0 rounded-full bg-white"
                aria-hidden
              />
              <div className="mt-1.5 shrink-0 font-[family-name:var(--font-bebas)] text-[clamp(52px,8.5vw,96px)] leading-[0.88] tracking-wide text-white">
                HITS
                <br />
                DIFFERENT
              </div>
            </div>

            <div className="relative mt-5 w-[230px] shrink-0">
              <div
                className="relative z-[3] flex h-[200px] w-[200px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#222] text-[58px] transition-transform duration-300"
                id="s1Cover"
              >
                <div
                  className={cn(
                    'absolute inset-0 z-10 flex flex-col items-center justify-center rounded bg-black/80 transition-opacity duration-300',
                    aiBusy ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                  )}
                  id="s1Loader"
                >
                  <div className="hd-ai-spinner size-7 rounded-full border-2 border-white/15 border-t-white" />
                  <div className="mt-2.5 text-center font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/50">
                    GENERATING
                    <br />
                    COVER ART
                  </div>
                </div>
                {s1CoverImg ? (
                  <NextImage
                    src={s1CoverImg}
                    alt=""
                    fill
                    unoptimized
                    className="z-[1] object-cover"
                    sizes="200px"
                  />
                ) : null}
                <span
                  className="relative z-[2] text-[58px]"
                  id="s1Emoji"
                  style={{ display: s1CoverImg ? 'none' : 'block' }}
                >
                  {selectedChar?.emoji ?? '🎵'}
                </span>
              </div>
              <div
                className="hd-vinyl"
                id="s1Vinyl"
              />
            </div>

            <div className="mt-auto pt-2.5">
              <div className="mb-1.5 mt-3.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wide text-white/50">
                What are you working on?
                <span className="ml-1.5 font-normal normal-case text-white/35">
                  — press Enter to start
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded border-[1.5px] border-white/30 bg-white/10 px-3 py-2 font-[family-name:var(--font-space-mono)] text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/70"
                  id="taskInput"
                  type="text"
                  placeholder="E.G. FINISH FRAMER WORK"
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
                      'flex h-[38px] w-[38px] items-center justify-center rounded border-[1.5px] border-white/25 bg-black/25 font-[family-name:var(--font-space-mono)] text-[15px] text-white/80 transition-colors hover:border-white/45 hover:bg-black/35 hover:text-white',
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
                      className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[min(calc(100vw-2.5rem),220px)] rounded border border-white/15 bg-[#141414] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                      id="timerSettingsPanel"
                      role="dialog"
                      aria-label="Timer settings"
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <label
                          htmlFor="focusSelect"
                          className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wide text-white/55"
                        >
                          Focus
                        </label>
                        <select
                          id="focusSelect"
                          className="max-w-[120px] cursor-pointer rounded border border-white/20 bg-black/50 py-1 pl-2 pr-7 font-[family-name:var(--font-space-mono)] text-[11px] text-white outline-none focus:border-white/50"
                          value={focusMins}
                          onChange={(e) => setFocusMins(Number(e.target.value))}
                        >
                          {DUR_OPTS.map((d) => (
                            <option key={d} value={d}>
                              {d} min
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <label
                          htmlFor="breakSelect"
                          className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wide text-white/55"
                        >
                          Break
                        </label>
                        <select
                          id="breakSelect"
                          className="max-w-[120px] cursor-pointer rounded border border-white/20 bg-black/50 py-1 pl-2 pr-7 font-[family-name:var(--font-space-mono)] text-[11px] text-white outline-none focus:border-white/50"
                          value={breakMins}
                          onChange={(e) => setBreakMins(Number(e.target.value))}
                        >
                          {BREAK_OPTS.map((d) => (
                            <option key={d} value={d}>
                              {d} min
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="roundsSelect"
                          className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wide text-white/55"
                        >
                          Rounds
                        </label>
                        <select
                          id="roundsSelect"
                          className="max-w-[120px] cursor-pointer rounded border border-white/20 bg-black/50 py-1 pl-2 pr-7 font-[family-name:var(--font-space-mono)] text-[11px] text-white outline-none focus:border-white/50"
                          value={totalSessions}
                          onChange={(e) => setTotalSessions(Number(e.target.value))}
                        >
                          {SESSION_OPTS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mb-1.5 mt-3.5 flex items-center gap-2 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wide text-white/50">
                Character
                <span className="text-[8px] font-normal normal-case tracking-wide text-white/35">
                  CHOOSE YOUR ALTER EGO
                </span>
              </div>
              <div className="grid grid-cols-4 gap-[7px]" id="charGrid">
                {CHARS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      'relative flex cursor-pointer flex-col items-center gap-0.5 rounded border-[1.5px] border-white/15 bg-black/20 p-1.5 text-center transition-colors hover:border-white/40 hover:bg-black/30',
                      selectedChar?.id === c.id &&
                        'border-white bg-white/15 text-white',
                    )}
                    onClick={() => {
                      setSelectedChar(c)
                      setSelectedVibe(c.vibe)
                      setGeneratedCoverDataURL(null)
                      setS1CoverImg(null)
                    }}
                  >
                    <div className="text-xl leading-none">{c.emoji}</div>
                    <div
                      className={cn(
                        'text-center font-[family-name:var(--font-space-mono)] text-[7.5px] leading-tight text-white/55',
                        selectedChar?.id === c.id && 'text-white',
                      )}
                      dangerouslySetInnerHTML={{ __html: c.name.replaceAll('\n', '<br />') }}
                    />
                    <div
                      className={cn(
                        'absolute right-1 top-0.5 text-[7px] text-white',
                        selectedChar?.id === c.id ? 'block' : 'hidden',
                      )}
                    >
                      ✓
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-1.5 mt-3.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-wide text-white/50">
                Music vibe
              </div>
              <div className="flex flex-wrap gap-1.5" id="vibeRow">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={cn(
                      'cursor-pointer rounded-full border-[1.5px] border-white/20 bg-black/20 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[9.5px] tracking-wide text-white/50 transition-all hover:border-white/40 hover:text-white',
                      v === selectedVibe &&
                        'border-white bg-white/15 font-bold text-white',
                    )}
                    onClick={() => setSelectedVibe(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <SampleMixLinks vibe={selectedVibe} />

              <button
                type="button"
                className={cn(
                  'mt-1.5 w-full cursor-pointer rounded border-[1.5px] border-dashed border-white/30 bg-black/25 py-2 text-center font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white/70 transition-all hover:border-white hover:bg-black/35 hover:text-white',
                  aiBusy && 'cursor-not-allowed opacity-50',
                )}
                id="aiCoverBtn"
                disabled={aiBusy}
                onClick={() => void generateAICover()}
              >
                {aiBusy ? '✦ GENERATING…' : '✦ GENERATE AI ALBUM COVER'}
              </button>
            </div>
          </div>
        </div>

        <TickerTrack id="ticker1" />

        <div className="relative flex flex-col items-center justify-center overflow-hidden bg-hd-bg">
          <div
            className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
            style={{ width: '210%', height: '210%', top: '-55%', left: '-55%' }}
          />
          <div
            className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
            style={{ width: '150%', height: '150%', top: '-25%', left: '-25%' }}
          />
          <div className="relative z-[5] text-center">
            <div className="font-[family-name:var(--font-bebas)] text-[clamp(60px,9.5vw,92px)] leading-none tracking-[6px] text-white/10">
              {String(focusMins).padStart(2, '0')}:00
            </div>
            <div className="mt-1.5 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-[3px] text-white/30">
              Set your task to begin
            </div>
          </div>
          <DotsRow total={totalSessions} current={1} id="previewDots" />
          <div
            className="absolute bottom-[22px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/20"
            id="previewLabel"
          >
            {totalSessions} POMODORO SESSIONS
          </div>
        </div>
      </div>

      {/* Session */}
      <div
        id="s2"
        className={cn(
          'absolute inset-0 z-[1] grid grid-cols-[1fr_160px_1fr]',
          view === 'session' ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div
          className={cn(
            'relative z-[5] flex flex-col overflow-hidden p-5 transition-colors duration-500 sm:px-6',
            isBreakTint && 'bg-hd-break',
            isDoneTint && 'bg-hd-done',
            !isBreakTint && !isDoneTint && 'bg-hd-gold',
          )}
          id="s2Left"
        >
          <div className="shrink-0">
            <div
              className="size-[11px] shrink-0 rounded-full bg-white"
              aria-hidden
            />
            <div className="mt-1.5 shrink-0 font-[family-name:var(--font-bebas)] text-[clamp(52px,8.5vw,96px)] leading-[0.88] tracking-wide text-white">
              HITS
              <br />
              DIFFERENT
            </div>
          </div>

          <div className="relative mt-5 w-[230px] shrink-0">
            <div
              className="relative z-[3] flex h-[200px] w-[200px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#222] text-[58px] transition-transform duration-300"
              id="s2Cover"
            >
              <span
                className="relative z-[2] text-[58px]"
                id="s2Emoji"
                style={{ display: s2CanvasMode ? 'none' : 'block' }}
              >
                {selectedChar?.emoji ?? '🎵'}
              </span>
              <canvas
                ref={s2CanvasRef}
                className={cn(
                  'absolute inset-0 h-full w-full',
                  s2CanvasMode ? 'block' : 'hidden',
                )}
                id="s2Canvas"
              />
            </div>
            <div className={cn('hd-vinyl', s2VinylSpin && 'hd-vinyl-spin')} id="s2Vinyl" />
          </div>

          <div className="mt-3 w-[230px] shrink-0">
            <div className="mb-0.5 font-[family-name:var(--font-space-mono)] text-[9.5px] uppercase tracking-wide text-white/45">
              Task
            </div>
            <div
              className="font-[family-name:var(--font-bebas)] text-[clamp(22px,3.2vw,38px)] leading-[1.05] tracking-wide text-white"
              id="s2Task"
            >
              {taskText || '—'}
            </div>
            <div
              className="mt-3 flex w-full max-w-full items-center gap-2 rounded-full bg-black/28 px-3 py-1.5"
              id="nowPlaying"
            >
              <div className="flex h-[11px] shrink-0 items-end gap-0.5">
                <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate]" />
                <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.15s]" />
                <div className="w-[3px] self-end rounded-sm bg-white [animation:hd-bar_0.55s_ease-in-out_infinite_alternate] [animation-delay:0.3s]" />
              </div>
              <div
                className="min-w-0 font-[family-name:var(--font-space-mono)] text-[9.5px] tracking-wide text-white/65"
                id="npText"
              >
                {isSignedIn
                  ? `${user.name ?? 'Spotify'} · ${VIBE_TRACKS[selectedVibe] ?? selectedVibe}`
                  : VIBE_TRACKS[selectedVibe] ?? `${selectedVibe} MIX`}
              </div>
            </div>
            <SampleMixLinks vibe={selectedVibe} compact />
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
              {selectedChar?.emoji ?? '🎵'}
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
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                className="cursor-pointer rounded border-[1.5px] border-white/30 bg-transparent px-5 py-2 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white transition-colors hover:border-white"
                onClick={exportAlbumCover}
              >
                ⬇ SAVE COVER
              </button>
              <button
                type="button"
                className="cursor-pointer rounded border-0 bg-white px-5 py-2 font-[family-name:var(--font-bebas)] text-lg tracking-wide text-hd-bg transition-colors hover:bg-zinc-200"
                onClick={restartSession}
              >
                NEW SESSION →
              </button>
            </div>
          </div>
        </div>

        <TickerTrack id="ticker2" />

        <div className="relative flex flex-col items-center justify-center overflow-hidden bg-hd-bg" id="s2Right">
          <div
            className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
            style={{ width: '210%', height: '210%', top: '-55%', left: '-55%' }}
          />
          <div
            className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
            style={{ width: '150%', height: '150%', top: '-25%', left: '-25%' }}
          />
          <div className="relative z-[5] text-center">
            <div className="font-[family-name:var(--font-bebas)] text-[clamp(60px,9.5vw,92px)] leading-none tracking-[6px] text-white" id="timerNum">
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
          <div className="relative z-[5] mt-5 flex gap-2">
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
          </div>
          <div
            className="absolute bottom-[22px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-space-mono)] text-[9px] tracking-wide text-white/20"
            id="sessLabel"
          >
            SESSION {curSession} OF {totalSessions}
          </div>
        </div>
      </div>
    </div>
  )
}
