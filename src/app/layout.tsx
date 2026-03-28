import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hits Different — focus blocks',
  description:
    'Name a task and run timed focus rounds with demo playlists in the browser. Pomodoro-style blocks, breaks, and local resume—no accounts.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'Hits Different — focus blocks',
    description:
      'Timed focus sessions with music in the browser. Demo playlists, Pomodoro-style rounds, and resume where you left off.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Hits Different — focus blocks',
    description:
      'Timed focus sessions with demo playlists. Simple, no login required.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-svh flex-col bg-pink-50 text-zinc-900 antialiased">
        <header className="sticky top-0 z-20 w-full shrink-0 border-0 bg-pink-50 px-6 py-5 sm:px-10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between" aria-label="Primary">
            <Link
              href="/"
              className="text-sm font-normal tracking-wide text-black"
            >
              Hits Different
            </Link>
            <Link
              href="/#task-input"
              className="text-sm font-normal tracking-wide text-black hover:opacity-70"
            >
              Get started
            </Link>
          </nav>
        </header>
        <div
          id="session"
          className="relative z-[1] mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col"
        >
          {children}
        </div>
      </body>
    </html>
  )
}
