'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

export type UserContextValue = {
  user: { name?: string | null; email?: string | null; image?: string | null }
  isSignedIn: boolean
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signInWithSpotify: () => void
  signOutUser: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  const signInWithSpotify = useCallback(() => {
    // Full browser redirect → Spotify’s authorization page → back to /api/auth/callback/spotify
    void signIn('spotify', { callbackUrl: '/' })
  }, [])

  const signOutUser = useCallback(() => {
    void signOut({ callbackUrl: '/' })
  }, [])

  const value = useMemo<UserContextValue>(
    () => ({
      user: session?.user ?? {},
      isSignedIn: status === 'authenticated',
      status,
      signInWithSpotify,
      signOutUser,
    }),
    [session?.user, status, signInWithSpotify, signOutUser],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider')
  }
  return ctx
}
