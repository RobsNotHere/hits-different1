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
      const node = e.target
      if (!(node instanceof Element)) return

      if (node.closest('input, textarea, select, option, [contenteditable="true"]')) return
      if (node.closest('#historyPanel')) return
      if (node.closest('#timerSettingsPanel')) return
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
        'w-full cursor-pointer rounded border border-transparent px-1.5 py-1 text-start transition-colors hover:border-transparent hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40',
        visuallySelected
          ? 'bg-white/10 font-bold text-white'
          : 'font-normal',
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
      className="z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-start font-[family-name:var(--font-space-mono)] text-[10px] leading-snug text-white/35"
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
        className="z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-start font-[family-name:var(--font-space-mono)] text-[10px] leading-snug text-white/35 will-change-transform"
        style={{ transform: 'translateY(0)' }}
      >
        <div ref={segmentRef} className="flex flex-col gap-2">
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-a-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 0)}
              onPickVibe={onPickVibe}
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
              onPickVibe={onPickVibe}
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
              onPickVibe={onPickVibe}
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
              onPickVibe={onPickVibe}
              duplicateIndex={3}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {VIBES.map((v) => (
            <VibeTickerButton
              key={`${id}-e-${v}`}
              vibe={v}
              visuallySelected={isVibeVisuallySelected(v, 4)}
              onPickVibe={onPickVibe}
              duplicateIndex={4}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}

const SCROLLBAR_ROW =
  'scroll-smooth overflow-y-auto overflow-x-hidden [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15'

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
    <div className="relative flex h-24 min-h-0 shrink-0 flex-col overflow-hidden border-y border-white/[0.06] bg-hd-bg lg:h-full lg:min-h-0 lg:min-w-0 lg:w-full lg:border-x lg:border-y-0">
      {reduceMotion ? (
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
