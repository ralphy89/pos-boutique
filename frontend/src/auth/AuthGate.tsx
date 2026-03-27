import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/endpoints'
import { clearSession, getAccessToken } from './session'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

export function AuthGate({
  mode,
  children,
}: {
  mode: 'protected' | 'guest'
  children: ReactNode
}) {
  const [state, setState] = useState<AuthState>('checking')
  const { pathname } = useLocation()

  useEffect(() => {
    setState('checking')
    const token = getAccessToken()
    if (!token) {
      setState('unauthenticated')
      return
    }

    const controller = new AbortController()

    ;(async () => {
      try {
        const res = await fetch(API_ENDPOINTS.auth.me, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })

        if (res.ok) {
          setState('authenticated')
          return
        }

        // Only hard-logout on explicit auth errors.
        if (res.status === 401 || res.status === 403) {
          clearSession()
          setState('unauthenticated')
          return
        }

        // For temporary API issues, keep local session to avoid false redirects.
        setState('authenticated')
      } catch {
        // Network/CORS/backend down: keep session locally and let user continue.
        setState('authenticated')
      }
    })()

    return () => controller.abort()
  }, [mode, pathname])

  if (state === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink/65">
        Checking session…
      </div>
    )
  }

  if (mode === 'protected') {
    return state === 'authenticated' ? <>{children}</> : <Navigate to="/login" replace />
  }

  // mode === guest
  return state === 'authenticated' ? <Navigate to="/home" replace /> : <>{children}</>
}

