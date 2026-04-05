import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Temporary diagnostics for Vercel `Invalid URL` in Auth.js.
 * Set `DEBUG_AUTH_ENV=1` in Vercel, redeploy, GET `/api/debug/auth-env`, then remove the var.
 * Does not expose secret values.
 */
export async function GET() {
  if (process.env.DEBUG_AUTH_ENV !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const h = await headers()
  const authUrl = process.env.AUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL

  let urlParse: { ok: true } | { ok: false; name: string; message: string } = { ok: true }
  for (const name of ['AUTH_URL', 'NEXTAUTH_URL'] as const) {
    const v = process.env[name]
    if (!v) continue
    try {
      new URL(v)
    } catch (e) {
      urlParse = {
        ok: false,
        name,
        message: e instanceof Error ? e.message : 'invalid',
      }
      break
    }
  }

  const xfHost = h.get('x-forwarded-host')
  const host = h.get('host')
  const xfProto = h.get('x-forwarded-proto')
  const combinedHost = xfHost ?? host ?? ''

  let constructedHref = ''
  let constructedError = ''
  try {
    let proto = xfProto ?? 'https'
    if (proto.endsWith(':')) proto = proto.slice(0, -1)
    constructedHref = new URL(`${proto}://${combinedHost}/api/auth/session`).href
  } catch (e) {
    constructedError = e instanceof Error ? e.message : 'error'
  }

  return NextResponse.json({
    urlParse,
    authUrlSet: Boolean(authUrl),
    authUrlLength: authUrl?.length ?? 0,
    nextAuthUrlSet: Boolean(nextAuthUrl),
    nextAuthUrlLength: nextAuthUrl?.length ?? 0,
    xForwardedHost: xfHost,
    host,
    xForwardedProto: xfProto,
    combinedHostLength: combinedHost.length,
    createActionUrlStyle: constructedHref || null,
    createActionUrlError: constructedError || null,
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV,
  })
}
