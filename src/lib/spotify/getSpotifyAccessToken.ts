import { Auth, createActionURL, raw, skipCSRFCheck } from '@auth/core'
import { decode } from '@auth/core/jwt'
import { cookies, headers as nextHeaders } from 'next/headers'
import { authConfig, authSecret } from '@/auth'
import type { JWT } from 'next-auth/jwt'

type SetCookie = { name: string; value: string; options?: unknown }

function isSessionCookieName(name: string): boolean {
  return (
    name === 'authjs.session-token' ||
    name.startsWith('authjs.session-token.') ||
    name === '__Secure-authjs.session-token' ||
    name.startsWith('__Secure-authjs.session-token.')
  )
}

function chunkIndex(name: string): number {
  const last = name.split('.').pop() ?? ''
  const n = parseInt(last, 10)
  return Number.isFinite(n) ? n : 0
}

/** Rebuild JWT string from `Auth` raw response cookies (handles chunked session cookies). */
function sessionJwtFromSetCookies(cookiesOut: SetCookie[]): {
  token: string
  salt: string
} | null {
  const sessionish = cookiesOut.filter((c) => isSessionCookieName(c.name))
  if (!sessionish.length) return null
  const salt = sessionish[0].name.replace(/\.\d+$/, '')
  const sorted = [...sessionish].sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name))
  const token = sorted.map((c) => c.value).join('')
  return token ? { token, salt } : null
}

/**
 * Spotify access token from the encrypted session JWT, after running the same session path as Auth.js
 * (including `jwt` refresh). Intentionally not exposed on the client session object.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  if (!authSecret) return null

  const headers = new Headers(await nextHeaders())
  const url = createActionURL(
    'session',
    headers.get('x-forwarded-proto') ?? 'https',
    headers,
    process.env,
    authConfig,
  )
  const req = new Request(url, {
    method: 'GET',
    headers: { cookie: headers.get('cookie') ?? '' },
  })

  const res = await Auth(req, { ...authConfig, raw, skipCSRFCheck })
  const cookieJar = await cookies()
  for (const c of res.cookies ?? []) {
    cookieJar.set(c.name, c.value, c.options)
  }

  const body = res.body as { user?: unknown } | null | undefined
  if (!body?.user) return null

  const fromCookies = sessionJwtFromSetCookies(res.cookies ?? [])
  if (!fromCookies) return null

  const payload = (await decode({
    secret: authSecret,
    salt: fromCookies.salt,
    token: fromCookies.token,
  })) as JWT | null

  if (!payload || payload.error === 'RefreshAccessTokenError') return null
  const accessToken = payload.accessToken as string | undefined
  return accessToken ?? null
}
