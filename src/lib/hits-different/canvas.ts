import type { CharDef } from './data'

export type ParsedCover = {
  palette?: string[]
  ascii?: string
  title?: string
}

export function drawGeneratedCoverCanvas(
  parsed: ParsedCover,
  selectedVibe: string,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const colors = parsed.palette || ['#C8A020', '#8B4513', '#2F4F4F']
  const grd = ctx.createLinearGradient(0, 0, 400, 400)
  grd.addColorStop(0, colors[0] || '#C8A020')
  grd.addColorStop(0.5, colors[1] || '#8B4513')
  grd.addColorStop(1, colors[2] || '#2F4F4F')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 400, 400)

  const lines = (parsed.ascii || '').split('\n').filter((l) => l.trim())
  const fontSize = Math.floor(320 / Math.max(lines.length, 1))
  ctx.font = `${Math.min(fontSize, 28)}px monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'center'
  const lineH = Math.min(fontSize, 28) * 1.15
  const startY = 200 - (lines.length * lineH) / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, 200, startY + i * lineH)
  })

  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 330, 400, 70)
  ctx.font = 'bold 16px "Arial Narrow",Arial,sans-serif'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.fillText((parsed.title || 'UNTITLED').toUpperCase().slice(0, 28), 12, 354)
  ctx.font = '11px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(`${selectedVibe} · HITS DIFFERENT`, 12, 374)

  return canvas.toDataURL()
}

const VIBE_COLORS: Record<string, [string, string]> = {
  'LO-FI': ['#2d3561', '#c05c7e'],
  HYPE: ['#f72585', '#7209b7'],
  JAZZ: ['#3a1c71', '#d76d77'],
  EDM: ['#0f3460', '#e94560'],
  INDIE: ['#5c6bc0', '#ffcc02'],
  CLASSICAL: ['#1a1a2e', '#e2b04a'],
  PUNK: ['#1a0000', '#cc0000'],
  ACOUSTIC: ['#4e342e', '#a5d6a7'],
}

export function drawFallbackCoverCanvas(
  task: string,
  vibe: string,
  selectedChar: CharDef | null,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const [c1, c2] = VIBE_COLORS[vibe] || ['#C8A020', '#8B4513']
  const grd = ctx.createLinearGradient(0, 0, 400, 400)
  grd.addColorStop(0, c1)
  grd.addColorStop(1, c2)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 400, 400)
  ctx.font = '120px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(selectedChar ? selectedChar.emoji : '🎵', 200, 180)
  ctx.font = 'bold 22px "Arial Narrow",Arial,sans-serif'
  ctx.fillStyle = '#fff'
  ctx.fillText(task.slice(0, 22).toUpperCase(), 200, 320)
  ctx.font = '13px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(`${vibe} · HITS DIFFERENT`, 200, 350)

  return canvas.toDataURL()
}

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
