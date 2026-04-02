import { auth } from '@/auth'
import { NextResponse } from 'next/server'

/**
 * Returns the signed-in user's Spotify `product` (e.g. premium, free) for client UX.
 */
export async function GET() {
  const session = await auth()
  const token = session?.accessToken
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: 'Spotify API error', detail: text },
      { status: res.status },
    )
  }

  const data = (await res.json()) as { product?: string }
  return NextResponse.json({ product: data.product ?? 'unknown' })
}
