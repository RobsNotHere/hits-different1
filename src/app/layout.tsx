import type { Metadata } from 'next'
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
        <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col border-x border-zinc-200/90 dark:border-zinc-800/90">
          {children}
        </div>
      </body>
    </html>
  )
}
