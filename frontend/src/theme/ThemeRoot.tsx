import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { BrandingProvider } from '../branding/BrandingContext'
import { applyThemeSettings, loadThemeSettings, saveThemeSettings, type ThemeSettings } from './palette'

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => loadThemeSettings())

  useEffect(() => {
    applyThemeSettings(settings)
    saveThemeSettings(settings)
  }, [settings])

  const value = useMemo(
    () => ({
      settings,
      setSettings,
    }),
    [settings],
  )

  ;(window as unknown as { __pos_theme?: typeof value }).__pos_theme = value

  return (
    <BrandingProvider>
      <div className="min-h-dvh bg-app text-ink">{children}</div>
    </BrandingProvider>
  )
}

