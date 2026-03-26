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
        <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col border-x border-sky-200/90 bg-amber-50/20 dark:border-sky-900/80">
          {children}
        </div>
      </body>
    </html>
  )
}
