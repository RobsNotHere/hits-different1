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
      <body className="app-canvas">
        <div className="app-canvas__content flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 w-full border-b border-violet-200/60 bg-white/75 px-5 py-3 shadow-md shadow-violet-200/30 backdrop-blur-md sm:px-6">
            <nav className="flex items-center justify-between" aria-label="Primary">
              <Link
                href="/"
                className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-600 bg-clip-text text-sm font-semibold uppercase tracking-[0.16em] text-transparent"
              >
                Hits Different
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  aria-current="page"
                  className="font-medium text-violet-900 underline decoration-violet-400 decoration-2 underline-offset-4"
                >
                  Demo
                </Link>
                <a
                  href="#"
                  className="font-medium text-zinc-600 transition hover:text-violet-800"
                >
                  Tutorial
                </a>
                <a
                  href="#"
                  className="rounded-full border border-violet-300/80 bg-gradient-to-b from-white to-violet-50 px-3 py-1.5 font-medium text-violet-900 shadow-sm shadow-violet-200/50 transition hover:border-violet-400 hover:shadow-md"
                >
                  Sign in
                </a>
              </div>
            </nav>
          </header>
          <div className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-xl flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
