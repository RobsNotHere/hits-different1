'use client'

import { useMemo } from 'react'
import { TICKER_ITEMS } from '@/lib/hits-different/data'

export function TickerTrack({ id }: { id: string }) {
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

export function TickerColumn({ tickerId }: { tickerId: string }) {
  return (
    <div className="relative flex h-28 shrink-0 flex-col items-center justify-center overflow-hidden border-y border-white/[0.06] bg-hd-bg lg:h-full lg:min-h-0 lg:w-[160px] lg:shrink-0 lg:border-x lg:border-y-0">
      <TickerTrack id={tickerId} />
    </div>
  )
}
