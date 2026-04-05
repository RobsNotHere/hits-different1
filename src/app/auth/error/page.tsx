import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthErrorTrySpotifyButton } from './AuthErrorTrySpotify'

export const metadata: Metadata = {
  title: 'Sign-in issue — Hits Different',
  description: 'Something went wrong while connecting your account.',
}

const MESSAGES: Record<string, string> = {
  Configuration:
    'Sign-in could not finish—often missing or mismatched server settings for this site (secret, URL, or OAuth callback).',
  AccessDenied:
    'Access was denied. You may need to approve the app in Spotify or use a different account.',
  Verification: 'The sign-in link is no longer valid. Try signing in again.',
  OAuthSignin: 'Could not start sign-in with Spotify.',
  OAuthCallback: 'Something went wrong after Spotify sent you back here.',
  OAuthCreateAccount: 'Could not create or link an account.',
  EmailCreateAccount: 'Could not create an account with email.',
  Callback: 'Something went wrong in the sign-in callback.',
  OAuthAccountNotLinked:
    'This account is already linked to another sign-in method.',
  SessionRequired: 'You need to be signed in to view that page.',
  UnknownAction:
    'That sign-in link is not valid for this app version. Use the button below to start Spotify sign-in again.',
  Default: 'Something went wrong during sign-in. Please try again.',
}

type PageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const code = params.error?.trim() || 'Default'
  const message = MESSAGES[code] ?? MESSAGES.Default

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-hd-bg px-6 py-12 font-sans text-white">
      <div className="w-full max-w-md rounded-2xl border border-hd-gold/25 bg-hd-panel/80 px-8 py-10 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-hd-gold">
          Sign-in issue
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/85">{message}</p>
        {params.error ? (
          <p className="mt-6 font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-widest text-white/35">
            Code: {params.error}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <AuthErrorTrySpotifyButton className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-hd-gold/50 bg-hd-gold/15 px-4 py-2.5 text-center text-sm font-medium text-hd-gold transition hover:bg-hd-gold/25" />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-center text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Back to app
          </Link>
        </div>
      </div>
    </main>
  )
}
