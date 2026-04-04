'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import { cn } from '@/lib/cn'
import { VIBES, type Vibe } from '@/lib/hits-different/data'

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
        'w-full cursor-pointer rounded border border-transparent px-1.5 py-1 text-center transition-colors hover:border-white/25 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40',
        visuallySelected
          ? 'border-white/40 bg-white/10 font-bold text-white'
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
      className="z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-center font-[family-name:var(--font-space-mono)] text-[10px] leading-snug text-white/35"
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
}: {
  id: string
  isVibeVisuallySelected: (v: Vibe, duplicateIndex: number) => boolean
  onPickVibe: (v: Vibe, duplicateIndex: number) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLElement>(null)
  const segmentRef = useRef<HTMLDivElement>(null)
  /** Unbounded scroll target (wheel deltas accumulate here). */
  const targetScrollRef = useRef(0)
  /** Eased position; display uses `mod(anim, scrollPeriodPx)`. */
  const animScrollRef = useRef(0)
  const rafRef = useRef<number | null>(null)

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
    const vp = viewportRef.current
    if (!vp) return

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

    const onWheel = (e: WheelEvent) => {
      const seg = segmentRef.current
      const track = trackRef.current
      if (!seg || !track) return
      if (scrollPeriodPx(seg, track) <= 0) return

      e.preventDefault()
      e.stopPropagation()

      targetScrollRef.current += e.deltaY
      ensureRaf()
    }

    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      vp.removeEventListener('wheel', onWheel)
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

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
    <div
      ref={viewportRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-1"
    >
      <nav
        ref={trackRef}
        id={id}
        aria-label="Music vibe"
        className="z-10 flex w-full min-w-0 flex-col gap-2 py-1 text-center font-[family-name:var(--font-space-mono)] text-[10px] leading-snug text-white/35 will-change-transform"
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
}: {
  tickerId: string
  selectedVibe: string
  vibeHighlight: VibeHighlightSource
  onVibePick: (tickerId: string, vibe: Vibe, duplicateIndex: number) => void
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
    <div className="relative flex h-28 min-h-0 shrink-0 flex-col overflow-hidden border-y border-white/[0.06] bg-hd-bg lg:h-full lg:min-h-0 lg:w-[160px] lg:shrink-0 lg:border-x lg:border-y-0">
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
        />
      )}
    </div>
  )
}
