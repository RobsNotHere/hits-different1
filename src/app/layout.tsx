import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hits Different — focus blocks',
  description: 'Pomodoro-style focus blocks with demo playlists.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col bg-zinc-900">
          <header className="sticky top-0 z-20 border-b border-zinc-700/80 bg-zinc-900/95 px-5 py-3 backdrop-blur sm:px-6">
            <nav className="flex items-center justify-between" aria-label="Primary">
              <Link
                href="/"
                className="text-sm font-semibold uppercase tracking-[0.16em] text-white"
              >
                Hits Different
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  aria-current="page"
                  className="text-white underline decoration-zinc-400 underline-offset-4"
                >
                  Demo
                </Link>
                <a
                  href="#"
                  className="text-white/75 transition hover:text-white"
                >
                  Tutorial
                </a>
                <a
                  href="#"
                  className="rounded-md border border-zinc-600 px-2.5 py-1 text-white/90 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
                >
                  Sign in
                </a>
              </div>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
