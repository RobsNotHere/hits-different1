import type { Metadata } from 'next'
import Link from 'next/link'
import { Libre_Baskerville } from 'next/font/google'
import './globals.css'

const classicSerif = Libre_Baskerville({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-classic',
  display: 'swap',
})

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
    <html lang="en" className={classicSerif.variable}>
      <body className="min-h-svh bg-pink-50 text-zinc-900 antialiased">
        <header className="sticky top-0 z-20 w-full border-0 bg-pink-50 px-6 py-5 sm:px-10">
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
          className="relative z-[1] mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-6xl flex-1 flex-col"
        >
          {children}
        </div>
      </body>
    </html>
  )
}
