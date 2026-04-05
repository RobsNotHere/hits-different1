import { NextRequest } from 'next/server'
import { handlers } from '@/auth'

export const runtime = 'nodejs'

/**
 * Some serverless invocations expose a `Request.url` that `new URL()` rejects (e.g. relative).
 * Auth.js calls `new URL(req.url)` in `toInternalRequest`; normalize using forwarded host/proto.
 */
function toAbsoluteNextRequest(req: NextRequest): NextRequest {
  try {
    const u = new URL(req.url)
    if (u.hostname) return req
  } catch {
    /* fall through */
  }

  let host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!host) return req

  let proto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (proto.endsWith(':')) proto = proto.slice(0, -1)

  const canonical = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  if (canonical) {
    try {
      const allowed = new URL(canonical).hostname.toLowerCase()
      const requestHost = host.split(':')[0]?.toLowerCase() ?? ''
      if (requestHost !== allowed) {
        const u = new URL(canonical)
        proto = u.protocol.replace(/:$/, '') || 'https'
        host = u.host
      }
    } catch {
      /* keep forwarded host */
    }
  }

  const pathWithQuery = `${req.nextUrl.pathname}${req.nextUrl.search}`
  const href = `${proto}://${host}${pathWithQuery}`

  if (req.method === 'GET' || req.method === 'HEAD') {
    return new NextRequest(href, { method: req.method, headers: req.headers })
  }

  return new NextRequest(
    href,
    {
      method: req.method,
      headers: req.headers,
      body: req.body,
      duplex: 'half',
    } as ConstructorParameters<typeof NextRequest>[1],
  )
}

export function GET(req: NextRequest) {
  return handlers.GET(toAbsoluteNextRequest(req))
}

export function POST(req: NextRequest) {
  return handlers.POST(toAbsoluteNextRequest(req))
}
