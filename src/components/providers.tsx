'use client'

import { SessionProvider } from 'next-auth/react'
import { UserProvider } from '@/context/UserContext'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <UserProvider>{children}</UserProvider>
    </SessionProvider>
  )
}
