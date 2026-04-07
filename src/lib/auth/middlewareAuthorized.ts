import type { Session } from 'next-auth'
import { jsonUnauthorized } from '@/lib/auth/apiResponses'

/** Narrow request shape for path checks. Structural type avoids duplicate `NextRequest` graphs (pnpm + Next). */
export type AuthorizedRequest = {
  nextUrl: { pathname: string }
}

/** API routes that require a session (Spotify OAuth). Extend this list as you add protected APIs. */
const PROTECTED_API_PREFIXES = ['/api/spotify']

function pathRequiresSession(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * NextAuth `callbacks.authorized` for middleware: JSON 401 for protected API without session.
 * Page navigations stay public unless you add path rules that return `false` (redirect to sign-in).
 */
export function middlewareAuthorized({
  request,
  auth,
}: {
  request: AuthorizedRequest
  auth: Session | null
}): boolean | Response {
  const path = request.nextUrl.pathname

  if (path.startsWith('/api/auth')) {
    return true
  }

  if (!pathRequiresSession(path)) {
    return true
  }

  if (auth?.user) {
    return true
  }

  return jsonUnauthorized()
}
