import { NextResponse } from 'next/server'

type Body = { task: string; vibe: string; char: string }

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI cover is not configured on the server' },
      { status: 503 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const task = (body.task || 'focus session').slice(0, 500)
  const vibe = (body.vibe || 'LO-FI').slice(0, 40)
  const char = (body.char || 'focused worker').slice(0, 200)

  const prompt = `You are a creative album cover art director. Generate a vivid, detailed description for an album cover for someone working on: "${task}".
Their music vibe is ${vibe} and their character archetype is ${char}.
Then draw it as ASCII art using block characters and unicode symbols that fills a roughly 12x12 grid of text.
Respond ONLY with JSON: {"description": "...", "palette": ["#hexcolor1","#hexcolor2","#hexcolor3"], "ascii": "multiline ascii art here", "title": "short album title"}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: 'Anthropic request failed', detail: text.slice(0, 200) },
      { status: 502 },
    )
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const text =
    data.content?.map((c) => (c.type === 'text' ? c.text || '' : '')).join('') ||
    ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as {
      palette?: string[]
      ascii?: string
      title?: string
    }
    return NextResponse.json({ ok: true, parsed })
  } catch {
    return NextResponse.json(
      { error: 'Could not parse model response', raw: clean.slice(0, 400) },
      { status: 422 },
    )
  }
}
