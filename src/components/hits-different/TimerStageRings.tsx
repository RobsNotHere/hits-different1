export function TimerStageRings() {
  return (
    <>
      <div
        className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
        style={{ width: '210%', height: '210%', top: '-55%', left: '-55%' }}
      />
      <div
        className="pointer-events-none absolute rounded-full border-[1.5px] border-white/[0.055]"
        style={{ width: '150%', height: '150%', top: '-25%', left: '-25%' }}
      />
    </>
  )
}
