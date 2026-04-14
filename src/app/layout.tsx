import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const euclidFlexUltraLight = localFont({
  src: '../../public/fonts/EuclidFlexUltraLight.ttf',
  variable: '--font-euclid-flex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'POMO + VIBE',
  description:
    'Pomodoro sessions with vibe mixes and optional Spotify connection.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c0c0c',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${euclidFlexUltraLight.variable} m-0 min-h-svh antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
