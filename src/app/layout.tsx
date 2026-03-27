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
      <body className="min-h-svh bg-white">
        <header className="sticky top-0 z-20 w-full border-b border-zinc-200 bg-white/95 px-5 py-3 shadow-sm shadow-zinc-200/80 backdrop-blur sm:px-6">
          <nav className="flex items-center justify-between" aria-label="Primary">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-900"
            >
              Hits Different
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/"
                aria-current="page"
                className="text-zinc-900 underline decoration-zinc-400 underline-offset-4"
              >
                Demo
              </Link>
              <a
                href="#"
                className="text-zinc-600 transition hover:text-zinc-900"
              >
                Tutorial
              </a>
              <a
                href="#"
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                Sign in
              </a>
            </div>
          </nav>
        </header>
        <div className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-xl flex-col bg-white">
          {children}
        </div>
      </body>
    </html>
  )
}
