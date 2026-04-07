export { auth as middleware } from '@/auth'

/**
 * Auth.js: session refresh on navigations + `callbacks.authorized` (401 JSON for `/api/spotify/*` without session).
 * Skip `/api/auth/*` so sign-in/callback/csrf are not wrapped (avoids loops and double work).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
