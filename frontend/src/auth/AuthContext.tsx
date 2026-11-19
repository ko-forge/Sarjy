import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import * as authApi from "../api/auth"
import type { AuthUser, ProfileInput } from "../types"
import { clearToken, getToken, setToken } from "./storage"

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  saveProfile: (profile: ProfileInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function remember(user: AuthUser): AuthUser {
  if (user.token) {
    setToken(user.token)
  }
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!getToken()) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const me = await authApi.getMe()
        if (!cancelled) setUser(me)
      } catch {
        clearToken()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signup(email, password) {
        setUser(remember(await authApi.signup(email, password)))
      },
      async login(email, password) {
        setUser(remember(await authApi.login(email, password)))
      },
      async logout() {
        try {
          await authApi.logout()
        } finally {
          clearToken()
          setUser(null)
        }
      },
      async saveProfile(profile) {
        setUser(remember(await authApi.updateProfile(profile)))
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return value
}
