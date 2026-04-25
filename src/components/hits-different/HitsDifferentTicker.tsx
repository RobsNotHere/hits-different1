'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'
import { VIBES, type Vibe } from '@/lib/hits-different/data'
import { HD_TEXT_BODY, HD_TICKER_COLUMN_SHELL } from '@/lib/hits-different/hdUiClasses'

type TickerWheelRegistry = {
  register: (fn: (deltaY: number) => void) => void
  unregister: () => void
}

const TickerWheelRegistryContext = createContext<TickerWheelRegistry | null>(null)

function nearestVerticalScrollAncestor(start: Element): HTMLElement | null {
  let n: HTMLElement | null = start instanceof HTMLElement ? start : null
  while (n) {
    const st = window.getComputedStyle(n)
    const oy = st.overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      n.scrollHeight > n.clientHeight + 2
    ) {
      return n
    }
    n = n.parentElement
  }
  return null
}

function wheelWouldScrollVertically(scroller: HTMLElement, deltaY: number): boolean {
  if (deltaY > 0) {
    return scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1
  }
  if (deltaY < 0) {
    return scroller.scrollTop > 0
  }
  return false
}

/**
 * Captures wheel events (desktop / trackpad) and forwards them to the active
 * infinite vibe list, except over form fields, the session log drawer, timer
 * settings popover, or a scrollable region that can still move natively.
 */
export function TickerWheelProvider({ children }: { children: ReactNode }) {
  const applierRef = useRef<((deltaY: number) => void) | null>(null)

  const register = useCallback((fn: (deltaY: number) => void) => {
    applierRef.current = fn
  }, [])

  const unregister = useCallback(() => {
    applierRef.current = null
  }, [])

  const registryValue = useMemo(
    () => ({ register, unregister }),
    [register, unregister],
  )

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!applierRef.current) return
      /** Ctrl+scroll (and Cmd+scroll where applicable) = browser page zoom — must not `preventDefault`. */
      if (e.ctrlKey || e.metaKey) return
      const node = e.target
      if (!(node instanceof Element)) return

      if (node.closest('input, textarea, select, option, [contenteditable="true"]')) return
      if (node.closest('#historyPanel')) return
      if (node.closest('#timerModePicker')) return
      if (node.closest('#timekeepingModePicker')) return
      if (node.closest('#doneOverlay')) return

      const scrollEl = nearestVerticalScrollAncestor(node)
      if (scrollEl && wheelWouldScrollVertically(scrollEl, e.deltaY)) return

      applierRef.current(e.deltaY)
      e.preventDefault()
    }

    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  return (
    <TickerWheelRegistryContext.Provider value={registryValue}>
      {children}
    </TickerWheelRegistryContext.Provider>
  )
}

/** Which ticker column last picked the vibe + which clone row was clicked. */
export type VibeHighlightSource = {
  tickerId: string
  duplicateIndex: number
}

function subscribeMedia(query: string, onChange: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMedia('(prefers-reduced-motion: reduce)', onChange),
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

/** True when viewport is narrower than `lg` (1024px) — matches Tailwind's `max-lg` breakpoint. */
function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMedia('(max-width: 1023px)', onChange),
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => false,
  )
}

function VibeTickerButton({
  vibe,
  visuallySelected,
  onPickVibe,
  duplicateIndex,
}: {
  vibe: Vibe
  visuallySelected: boolean
  onPickVibe: (v: Vibe, duplicateIndex: number) => void
  duplicateIndex: number
}) {
  const isGhost = duplicateIndex > 0
  return (
    <button
      type="button"
      tabIndex={isGhost ? -1 : undefined}
      aria-hidden={isGhost ? true : undefined}
      className={cn(
        HD_TEXT_BODY,
        'w-full cursor-pointer rounded bg-transparent px-2 py-1.5 text-start transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-0',
        visuallySelected
          ? 'font-semibold text-white underline decoration-white/45 underline-offset-[3px]'
          : 'font-normal text-white/35',
      )}
      onClick={() => onPickVibe(vibe, duplicateIndex)}
    >
      {vibe}
    </button>
  )
}

function StaticVibeList({
  id,
  isVibeVisuallySelected,
  onPickVibe,
}: {
  id: string
  isVibeVisuallySelected: (v: Vibe, duplicateIndex: number) => boolean
  onPickVibe: (v: Vibe, duplicateIndex: number) => void
}) {
  return (
    <nav
      className={cn(
        'z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-start text-white/35',
        HD_TEXT_BODY,
      )}
      id={id}
      aria-label="Music vibe"
    >
      {VIBES.map((v) => (
        <VibeTickerButton
          key={v}
          vibe={v}
          visuallySelected={isVibeVisuallySelected(v, 0)}
          onPickVibe={onPickVibe}
          duplicateIndex={0}
        />
      ))}
    </nav>
  )
}

/** Higher = snappier; lower = floatier (per frame, ~60fps). */
const WHEEL_SMOOTHING = 0.2
const WHEEL_SETTLE_EPS = 0.45

/** One loop = first block height + flex `gap` before the duplicate block. */
function scrollPeriodPx(segmentEl: HTMLElement, trackEl: HTMLElement): number {
  const h = segmentEl.offsetHeight
  if (h <= 0) return 0
  const style = getComputedStyle(trackEl)
  const raw = style.rowGap || style.columnGap || style.gap || '0'
  const gap = parseFloat(raw) || 0
  return h + gap
}

function WheelInfiniteVibeList({
  id,
  isVibeVisuallySelected,
  onPickVibe,
  wheelForwardActive,
}: {
  id: string
  isVibeVisuallySelected: (v: Vibe, duplicateIndex: number) => boolean
  onPickVibe: (v: Vibe, duplicateIndex: number) => void
  wheelForwardActive: boolean
}) {
  const trackRef = useRef<HTMLElement>(null)
  const segmentRef = useRef<HTMLDivElement>(null)
  /** Unbounded scroll target (wheel deltas accumulate here). */
  const targetScrollRef = useRef(0)
  /** Eased position; display uses `mod(anim, scrollPeriodPx)`. */
  const animScrollRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const ensureRafRef = useRef<() => void>(() => {})

  const wheelRegistry = useContext(TickerWheelRegistryContext)
  const pickBase = useCallback(
    (v: Vibe, _duplicateIndex: number) => {
      void _duplicateIndex
      onPickVibe(v, 0)
    },
    [onPickVibe],
  )

  useLayoutEffect(() => {
    const seg = segmentRef.current
    const t = trackRef.current
    if (!seg || !t) return
    const period = scrollPeriodPx(seg, t)
    if (period <= 0) return
    const y = ((animScrollRef.current % period) + period) % period
    t.style.transform = `translateY(${-y}px)`
  }, [])

  useEffect(() => {
    const applyDisplay = () => {
      const seg = segmentRef.current
      const track = trackRef.current
      if (!seg || !track) return
      const period = scrollPeriodPx(seg, track)
      if (period <= 0) return
      const y = ((animScrollRef.current % period) + period) % period
      track.style.transform = `translateY(${-y}px)`
    }

    const runFrame = () => {
      const seg = segmentRef.current
      const track = trackRef.current
      if (!seg || !track) {
        rafRef.current = null
        return
      }
      const period = scrollPeriodPx(seg, track)
      if (period <= 0) {
        rafRef.current = requestAnimationFrame(runFrame)
        return
      }

      const target = targetScrollRef.current
      let anim = animScrollRef.current
      anim += (target - anim) * WHEEL_SMOOTHING
      animScrollRef.current = anim
      applyDisplay()

      if (Math.abs(target - anim) > WHEEL_SETTLE_EPS) {
        rafRef.current = requestAnimationFrame(runFrame)
      } else {
        rafRef.current = null
      }
    }

    const ensureRaf = () => {
      if (rafRef.current != null) return
      rafRef.current = requestAnimationFrame(runFrame)
    }

    ensureRafRef.current = ensureRaf

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!wheelForwardActive || !wheelRegistry) return

    const applyWheelDelta = (deltaY: number) => {
      const seg = segmentRef.current
      const track = trackRef.current
      if (!seg || !track) return
      if (scrollPeriodPx(seg, track) <= 0) return
      targetScrollRef.current += deltaY
      ensureRafRef.current()
    }

    wheelRegistry.register(applyWheelDelta)
    return () => wheelRegistry.unregister()
  }, [wheelForwardActive, wheelRegistry])

  useEffect(() => {
    const seg = segmentRef.current
    if (!seg) return

    const applyDisplay = () => {
      const track = trackRef.current
      if (!track) return
      const period = scrollPeriodPx(seg, track)
      if (period <= 0) return
      const y = ((animScrollRef.current % period) + period) % period
      track.style.transform = `translateY(${-y}px)`
    }

    const ro = new ResizeObserver(() => {
      const track = trackRef.current
      if (!track) return
      const period = scrollPeriodPx(seg, track)
      if (period <= 0) return
      animScrollRef.current =
        ((animScrollRef.current % period) + period) % period
      targetScrollRef.current =
        ((targetScrollRef.current % period) + period) % period
      applyDisplay()
    })
    ro.observe(seg)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1">
      <nav
        ref={trackRef}
        id={id}
        aria-label="Music vibe"
        className={cn(
          'z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-start text-white/35 will-change-transform',
          HD_TEXT_BODY,
        )}
        style={{ transform: 'translateY(0)' }}
      >
        <div ref={segmentRef} className="flex flex-col gap-2">
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-a-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 0)}
              onPickVibe={pickBase}
              duplicateIndex={0}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-b-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 1)}
              onPickVibe={pickBase}
              duplicateIndex={1}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-c-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 2)}
              onPickVibe={pickBase}
              duplicateIndex={2}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-d-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 3)}
              onPickVibe={pickBase}
              duplicateIndex={3}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}

const SCROLLBAR_ROW =
  'scroll-smooth overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:bg-transparent'

/** Clamp used both for touch-drag speed and momentum decay. */
const TOUCH_MOMENTUM_DECAY = 0.94
const TOUCH_SPEED_SCALE = 1.0

/** Horizontal infinite scroller driven by touch drag on mobile. */
function HorizontalInfiniteVibeList({
  id,
  isVibeVisuallySelected,
  onPickVibe,
}: {
  id: string
  isVibeVisuallySelected: (v: Vibe, duplicateIndex: number) => boolean
  onPickVibe: (v: Vibe, duplicateIndex: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLElement>(null)
  const segmentRef = useRef<HTMLDivElement>(null)
  const animScrollRef = useRef(0)
  const velocityRef = useRef(0)
  const lastTouchXRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const pickBase = useCallback(
    (v: Vibe, _duplicateIndex: number) => {
      void _duplicateIndex
      onPickVibe(v, 0)
    },
    [onPickVibe],
  )

  /** One loop = first segment width + column-gap before duplicate. */
  function scrollPeriodX(seg: HTMLElement, track: HTMLElement): number {
    const w = seg.offsetWidth
    if (w <= 0) return 0
    const style = getComputedStyle(track)
    const raw = style.columnGap || style.gap || '0'
    const gap = parseFloat(raw) || 0
    return w + gap
  }

  const applyDisplay = useCallback(() => {
    const seg = segmentRef.current
    const track = trackRef.current
    if (!seg || !track) return
    const period = scrollPeriodX(seg, track)
    if (period <= 0) return
    const x = ((animScrollRef.current % period) + period) % period
    track.style.transform = `translateX(${-x}px)`
  }, [])

  const momentumRef = useRef<() => void>(() => {})

  const runMomentumFrame = useCallback(() => {
    if (isDraggingRef.current) {
      rafRef.current = requestAnimationFrame(() => momentumRef.current())
      return
    }
    velocityRef.current *= TOUCH_MOMENTUM_DECAY
    animScrollRef.current += velocityRef.current
    applyDisplay()
    if (Math.abs(velocityRef.current) > 0.3) {
      rafRef.current = requestAnimationFrame(() => momentumRef.current())
    } else {
      velocityRef.current = 0
      rafRef.current = null
    }
  }, [applyDisplay])

  useEffect(() => {
    momentumRef.current = runMomentumFrame
  }, [runMomentumFrame])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true
      lastTouchXRef.current = e.touches[0].clientX
      velocityRef.current = 0
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || lastTouchXRef.current === null) return
      const dx = lastTouchXRef.current - e.touches[0].clientX
      lastTouchXRef.current = e.touches[0].clientX
      velocityRef.current = dx * TOUCH_SPEED_SCALE
      animScrollRef.current += dx
      applyDisplay()
      /** Prevent vertical page scroll while swiping the ticker. */
      e.preventDefault()
    }

    const onTouchEnd = () => {
      isDraggingRef.current = false
      lastTouchXRef.current = null
      if (Math.abs(velocityRef.current) > 0.3) {
        rafRef.current = requestAnimationFrame(runMomentumFrame)
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [applyDisplay, runMomentumFrame])

  /** Recalculate on resize so the period stays accurate. */
  useEffect(() => {
    const seg = segmentRef.current
    const track = trackRef.current
    if (!seg || !track) return
    const ro = new ResizeObserver(() => {
      const period = scrollPeriodX(seg, track)
      if (period <= 0) return
      animScrollRef.current = ((animScrollRef.current % period) + period) % period
      applyDisplay()
    })
    ro.observe(seg)
    return () => ro.disconnect()
  }, [applyDisplay])

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <nav
        ref={trackRef}
        id={id}
        aria-label="Music vibe"
        className={cn(
          'inline-flex shrink-0 flex-row gap-6 py-1 text-start text-white/35 will-change-transform',
          HD_TEXT_BODY,
        )}
        style={{ transform: 'translateX(0)' }}
      >
        {/* First segment */}
        <div ref={segmentRef} className="inline-flex flex-row gap-6">
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-a-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 0)}
              onPickVibe={pickBase}
              duplicateIndex={0}
            />
          ))}
        </div>
        {/* Three duplicate segments for seamless wrap */}
        {([1, 2, 3] as const).map((idx) => (
          <div key={idx} className="inline-flex flex-row gap-6" aria-hidden>
            {VIBES.map((v) => (
              <VibeTickerButton
                key={`${id}-${String.fromCharCode(97 + idx)}-${v}`}
                vibe={v}
                visuallySelected={isVibeVisuallySelected(v, idx)}
                onPickVibe={pickBase}
                duplicateIndex={idx}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}

export function TickerColumn({
  tickerId,
  selectedVibe,
  vibeHighlight,
  onVibePick,
  wheelForwardActive = false,
}: {
  tickerId: string
  selectedVibe: string
  vibeHighlight: VibeHighlightSource
  onVibePick: (tickerId: string, vibe: Vibe, duplicateIndex: number) => void
  /** When true (and motion is not reduced), wheel anywhere on the page drives this column’s vibe list. */
  wheelForwardActive?: boolean
}) {
  const reduceMotion = usePrefersReducedMotion()
  const isMobile = useIsMobile()

  const pick = useCallback(
    (v: Vibe, duplicateIndex: number) =>
      onVibePick(tickerId, v, duplicateIndex),
    [tickerId, onVibePick],
  )

  const isVibeVisuallySelected = useCallback(
    (v: Vibe, duplicateIndex: number) =>
      v === selectedVibe &&
      (vibeHighlight.tickerId === tickerId
        ? vibeHighlight.duplicateIndex === duplicateIndex
        : duplicateIndex === 0),
    [selectedVibe, vibeHighlight, tickerId],
  )

  return (
    <div className={cn(HD_TICKER_COLUMN_SHELL, 'lg:min-h-0 lg:w-full')}>
      {isMobile ? (
        reduceMotion ? (
          <div className={cn('flex min-w-0 overflow-x-auto', SCROLLBAR_ROW, 'overflow-y-visible')}>
            <StaticVibeList
              id={tickerId}
              isVibeVisuallySelected={isVibeVisuallySelected}
              onPickVibe={pick}
            />
          </div>
        ) : (
          <HorizontalInfiniteVibeList
            id={tickerId}
            isVibeVisuallySelected={isVibeVisuallySelected}
            onPickVibe={pick}
          />
        )
      ) : reduceMotion ? (
        <div className={cn('flex min-h-0 flex-1 flex-col', SCROLLBAR_ROW)}>
          <StaticVibeList
            id={tickerId}
            isVibeVisuallySelected={isVibeVisuallySelected}
            onPickVibe={pick}
          />
        </div>
      ) : (
        <WheelInfiniteVibeList
          id={tickerId}
          isVibeVisuallySelected={isVibeVisuallySelected}
          onPickVibe={pick}
          wheelForwardActive={wheelForwardActive}
        />
      )}
    </div>
  )
}
