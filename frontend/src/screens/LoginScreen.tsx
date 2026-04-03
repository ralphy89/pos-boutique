import { useMemo, useState } from 'react'
import { HelpCircle, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/endpoints'
import { BackToHome } from '../components/BackToHome'
import { BrandMark } from '../components/BrandMark'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'
import { useWorkspaceBranding } from '../branding/BrandingContext'
import { getDefaultThemeSettings, THEME_PALETTES, type ThemeSettings } from '../theme/palette'

function getThemeController(): { settings: ThemeSettings; setSettings: (s: ThemeSettings) => void } | null {
  const w = window as unknown as { __pos_theme?: { settings: ThemeSettings; setSettings: (s: ThemeSettings) => void } }
  return w.__pos_theme ?? null
}

export function LoginScreen() {
  const navigate = useNavigate()
  const theme = getThemeController()
  const settings = theme?.settings
  const { branding } = useWorkspaceBranding()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [openPalette, setOpenPalette] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const presets = useMemo(() => THEME_PALETTES, [])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Please enter both email and password.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      })

    
      const data = (await res.json()) as { access_token?: string; detail?: string }
      if (!res.ok || !data.access_token) {
        setError(data.detail ?? 'Login failed. Please check your credentials.')
        return
      }

      const store = remember ? localStorage : sessionStorage
      store.setItem('pos.access_token', data.access_token)
      // Keep lightweight identity hints for quick UI personalization.
      store.setItem('pos.user_email', cleanEmail)

      navigate('/home', { replace: true })

    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="absolute left-6 top-6 z-20">
        <BackToHome />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-app" />

      <div className="pointer-events-none absolute -top-56 left-1/2 h-[540px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_35%,transparent),transparent)] blur-2xl opacity-70" />
      <div className="pointer-events-none absolute -bottom-72 left-[-280px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-2)_26%,transparent),transparent)] blur-3xl opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />

      <div className="relative mx-auto flex min-h-dvh max-w-[1160px] items-center px-6 py-16">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-3">
              <BrandMark size={44} />
              <div>
                <div className="text-sm font-semibold tracking-[-0.01em] text-ink/90">{branding.posName}</div>
                <div className="text-xs text-ink/55">Commerce command center</div>
              </div>
            </div>

            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-[-0.04em] text-ink/95">
              Control sales, stock and cashflow with clarity.
            </h1>
            <p className="mt-4 max-w-[54ch] text-pretty text-sm leading-relaxed text-ink/60">
              A premium web platform designed for shops, mini-markets and local stores in Haiti — fast at the counter,
              precise in inventory, and trustworthy in reporting.
            </p>

            <div className="mt-8 grid max-w-[520px] grid-cols-1 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <ShieldCheck className="h-5 w-5 text-ink/80" />
                </div>
                <div>
                  <div className="text-sm font-medium tracking-[-0.01em] text-ink/85">Secure by design</div>
                  <div className="text-xs text-ink/55">Clean permissions, audit-friendly flows, precise actions.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <HelpCircle className="h-5 w-5 text-ink/80" />
                </div>
                <div>
                  <div className="text-sm font-medium tracking-[-0.01em] text-ink/85">Built for real operations</div>
                  <div className="text-xs text-ink/55">Speed at checkout, clarity for owners, readable at night.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[440px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <BrandMark size={40} />
                <div>
                  <div className="text-sm font-semibold tracking-[-0.01em] text-ink/90">{branding.posName}</div>
                  <div className="text-xs text-ink/55">Commerce command center</div>
                </div>
              </div>
              <Button variant="ghost" type="button" onClick={() => setOpenPalette((v) => !v)}>
                <SlidersHorizontal className="h-4 w-4" />
                Theme
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_-72px_rgba(0,0,0,0.95)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 opacity-50 [background:linear-gradient(180deg,transparent,rgba(0,0,0,0.25))]" />
              <div className="pointer-events-none absolute -top-20 right-[-120px] h-64 w-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_28%,transparent),transparent)] blur-2xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold tracking-[-0.03em] text-ink/95">Sign in</div>
                    <div className="mt-1 text-xs leading-relaxed text-ink/55">
                      Access your workspace with precision and control.
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <Button variant="ghost" type="button" onClick={() => setOpenPalette((v) => !v)}>
                      <SlidersHorizontal className="h-4 w-4" />
                      Palette
                    </Button>
                  </div>
                </div>

                <form
                  className="mt-6 grid gap-4"
                  onSubmit={handleLogin}
                >
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="email">Username or email</FieldLabel>
                    <TextField
                      id="email"
                      name="email"
                      autoComplete="username"
                      placeholder="name@shop.ht"
                      value={email}
                      disabled={isLoading}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <TextField
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      disabled={isLoading}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink/65">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/15 bg-white/[0.03] accent-[var(--accent)]"
                        checked={remember}
                        disabled={isLoading}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <a className="text-xs text-ink/65 hover:text-ink/80" href="#">
                      Need help?
                    </a>
                  </div>

                  <Button type="submit" className="mt-1 h-11" disabled={isLoading}>
                    {isLoading ? 'Signing in…' : 'Sign in'}
                  </Button>

                  {error ? (
                    <div className="rounded-xl border border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--highlight)_82%,white)]">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-1 text-xs text-ink/50">
                    Support: <span className="text-ink/65">support@posboutique.ht</span>
                    <span className="mx-2 text-ink/30">•</span>
                    <span className="text-ink/55">Secure session</span>
                  </div>
                </form>
              </div>
            </div>

            <div
              className={[
                'mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all',
                openPalette ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
              aria-hidden={!openPalette}
            >
              <div className="p-4">
                <div className="text-xs font-medium tracking-[-0.01em] text-ink/70">Color palette</div>
                <div className="mt-1 text-xs text-ink/50">
                  Choose a mood — settings persist on this device.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {presets.map((p) => {
                    const active = settings?.paletteName === p.name
                    return (
                      <button
                        key={p.name}
                        type="button"
                        className={[
                          'group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition',
                          active ? 'border-white/20 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                        ].join(' ')}
                        onClick={() => {
                          if (!theme) return
                          theme.setSettings({
                            paletteName: p.name,
                            primary: p.primary,
                            mint: p.mint,
                            cream: p.cream,
                            highlight: p.highlight,
                          })
                        }}
                      >
                        <span className="text-ink/75">{p.name}</span>
                        <span className="inline-flex shrink-0 items-center gap-1">
                          {[p.primary, p.mint, p.cream, p.highlight].map((c, i) => (
                            <span
                              key={`${p.name}-${i}`}
                              className="h-3 w-3 rounded-full ring-1 ring-white/15"
                              style={{ background: c }}
                            />
                          ))}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ColorRow
                    label="Primary"
                    value={settings?.primary ?? getDefaultThemeSettings().primary}
                    onChange={(v) => {
                      if (!theme || !settings) return
                      theme.setSettings({ ...settings, paletteName: 'Custom', primary: v })
                    }}
                  />
                  <ColorRow
                    label="Mint"
                    value={settings?.mint ?? getDefaultThemeSettings().mint}
                    onChange={(v) => {
                      if (!theme || !settings) return
                      theme.setSettings({ ...settings, paletteName: 'Custom', mint: v })
                    }}
                  />
                  <ColorRow
                    label="Cream"
                    value={settings?.cream ?? getDefaultThemeSettings().cream}
                    onChange={(v) => {
                      if (!theme || !settings) return
                      theme.setSettings({ ...settings, paletteName: 'Custom', cream: v })
                    }}
                  />
                  <ColorRow
                    label="Highlight"
                    value={settings?.highlight ?? getDefaultThemeSettings().highlight}
                    onChange={(v) => {
                      if (!theme || !settings) return
                      theme.setSettings({ ...settings, paletteName: 'Custom', highlight: v })
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-xs text-ink/50">Tip: keep contrasts subtle for readability.</div>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setOpenPalette(false)}
                    className="h-9 px-3"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-ink/45">
              By signing in, you agree to operate with accuracy and accountability.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[11px] text-ink/55">{label}</div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] p-1"
      />
    </div>
  )
}

