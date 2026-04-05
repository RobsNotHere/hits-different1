'use client'

import { signIn } from 'next-auth/react'

type Props = {
  className: string
}

/** Auth.js v5 does not support GET `/api/auth/signin/spotify`; use POST via `signIn()`. */
export function AuthErrorTrySpotifyButton({ className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => void signIn('spotify', { callbackUrl: '/' })}
    >
      Try Spotify again
    </button>
  )
}
