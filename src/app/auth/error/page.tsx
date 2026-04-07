import Link from 'next/link'

const MESSAGES: Record<string, string> = {
  Configuration:
    'Sign-in can’t complete because of a server or environment configuration problem (check AUTH_URL, AUTH_SECRET, and Spotify app settings).',
  AccessDenied: 'Sign in was cancelled or Spotify did not grant access.',
  Verification: 'This sign-in link is no longer valid. Try signing in again.',
  Default: 'Something went wrong while signing in with Spotify.',
}

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams
  const key = error && error in MESSAGES ? error : 'Default'
  const message = MESSAGES[key] ?? MESSAGES.Default

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6 text-white">
      <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">
        Sign-in error
      </h1>
      <p className="font-[family-name:var(--font-space-mono)] text-sm leading-relaxed text-white/70">
        {message}
      </p>
      {error ? (
        <p className="font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-white/35">
          Code: {error}
        </p>
      ) : null}
      <Link
        href="/"
        className="font-[family-name:var(--font-space-mono)] text-xs tracking-wide text-white/55 underline decoration-white/25 underline-offset-2 hover:text-white"
      >
        Back to Hits Different
      </Link>
    </main>
  )
}
