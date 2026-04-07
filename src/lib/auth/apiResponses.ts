import { NextResponse } from 'next/server'

/** Consistent 401 for API routes (middleware + route handlers). */
export function jsonUnauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
    { status: 401 },
  )
}

/** Use when the user is signed in but must not access another user’s resource (IDOR). */
export function jsonForbidden() {
  return NextResponse.json(
    { error: 'Forbidden', code: 'FORBIDDEN' },
    { status: 403 },
  )
}
