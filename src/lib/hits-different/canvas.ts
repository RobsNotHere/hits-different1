export function overlayCoverText(
  ctx: CanvasRenderingContext2D,
  taskText: string,
  selectedVibe: string,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.fillRect(0, 780, 1000, 220)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 38px "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('HITS DIFFERENT', 40, 800)
  ctx.font = '26px "Arial Narrow", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(taskText, 40, 848)
  ctx.fillText(`${selectedVibe} · ${new Date().getFullYear()}`, 40, 882)
}
