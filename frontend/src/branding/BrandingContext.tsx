import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  type WorkspaceBranding,
  getDefaultWorkspaceBranding,
  loadWorkspaceBranding,
  saveWorkspaceBranding,
} from './workspaceBranding'

type BrandingContextValue = {
  branding: WorkspaceBranding
  setBranding: (next: WorkspaceBranding) => void
  resetBranding: () => void
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<WorkspaceBranding>(() => loadWorkspaceBranding())

  const setBranding = useCallback((next: WorkspaceBranding) => {
    setBrandingState(next)
    saveWorkspaceBranding(next)
  }, [])

  const resetBranding = useCallback(() => {
    const d = getDefaultWorkspaceBranding()
    setBrandingState(d)
    saveWorkspaceBranding(d)
  }, [])

  useEffect(() => {
    document.title = branding.posName.trim() || 'POS'
  }, [branding.posName])

  const value = useMemo(
    () => ({
      branding,
      setBranding,
      resetBranding,
    }),
    [branding, setBranding, resetBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useWorkspaceBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    throw new Error('useWorkspaceBranding must be used within BrandingProvider')
  }
  return ctx
}

/** For components that may render outside the provider (e.g. tests). */
export function useWorkspaceBrandingOptional(): BrandingContextValue | null {
  return useContext(BrandingContext)
}
