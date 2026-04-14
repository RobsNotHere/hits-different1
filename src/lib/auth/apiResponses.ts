import { NextResponse } from 'next/server'

/** Consistent 401 for API routes (middleware + route handlers). */
export function jsonUnauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
    { status: 401 },
  )
}
