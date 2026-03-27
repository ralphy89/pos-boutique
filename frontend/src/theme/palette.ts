/** Four-color palette: primary (brand/actions), mint (secondary glow), cream (warm surface), highlight (accents). */
export type ThemePalette = {
  name: string
  primary: string
  mint: string
  cream: string
  highlight: string
}

/** Default: user-specified palette */
export const THEME_PALETTES: ThemePalette[] = [
  {
    name: 'Printemps',
    primary: '#347928',
    mint: '#C0EBA6',
    cream: '#FFFBE6',
    highlight: '#FCCD2A',
  },
  {
    name: 'Océan',
    primary: '#1565C0',
    mint: '#90CAF9',
    cream: '#E3F2FD',
    highlight: '#FFB74D',
  },
  {
    name: 'Bordeaux',
    primary: '#6D1B35',
    mint: '#E8B4B8',
    cream: '#FFF8F5',
    highlight: '#D4A574',
  },
  {
    name: 'Minuit',
    primary: '#1A237E',
    mint: '#7986CB',
    cream: '#E8EAF6',
    highlight: '#FFD54F',
  },
  {
    name: 'Terre',
    primary: '#4E342E',
    mint: '#BCAAA4',
    cream: '#EFEBE9',
    highlight: '#FF8F00',
  },
]

export type ThemeSettings = {
  paletteName: string
  primary: string
  mint: string
  cream: string
  highlight: string
}

const STORAGE_KEY = 'posboutique.theme.v2'

function paletteToSettings(p: ThemePalette): ThemeSettings {
  return {
    paletteName: p.name,
    primary: p.primary,
    mint: p.mint,
    cream: p.cream,
    highlight: p.highlight,
  }
}

export function getDefaultThemeSettings(): ThemeSettings {
  return paletteToSettings(THEME_PALETTES[0]!)
}

/** Legacy v1 used accent + accent2 only — migrate to new default */
function migrateLegacy(raw: string): ThemeSettings | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed && typeof parsed.primary === 'string' && typeof parsed.mint === 'string') {
      return null
    }
    if (parsed && typeof parsed.accent === 'string' && !parsed.primary) {
      return getDefaultThemeSettings()
    }
  } catch {
    /* ignore */
  }
  return null
}

export function loadThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const old = localStorage.getItem('posboutique.theme.v1')
      if (old) {
        const migrated = migrateLegacy(old)
        if (migrated) return migrated
      }
      return getDefaultThemeSettings()
    }
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    const base = getDefaultThemeSettings()
    if (typeof parsed.primary !== 'string' || typeof parsed.mint !== 'string') {
      return getDefaultThemeSettings()
    }
    return {
      paletteName: typeof parsed.paletteName === 'string' ? parsed.paletteName : base.paletteName,
      primary: parsed.primary,
      mint: typeof parsed.mint === 'string' ? parsed.mint : base.mint,
      cream: typeof parsed.cream === 'string' ? parsed.cream : base.cream,
      highlight: typeof parsed.highlight === 'string' ? parsed.highlight : base.highlight,
    }
  } catch {
    return getDefaultThemeSettings()
  }
}

export function saveThemeSettings(settings: ThemeSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Maps to CSS variables used across the app.
 * --accent / --accent-2 kept for compatibility (primary + mint).
 */
export function applyThemeSettings(settings: ThemeSettings) {
  const root = document.documentElement
  root.style.setProperty('--accent', settings.primary)
  root.style.setProperty('--accent-2', settings.mint)
  root.style.setProperty('--surface-cream', settings.cream)
  root.style.setProperty('--highlight', settings.highlight)
}
