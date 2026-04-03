import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, KeyRound, Loader2, Mail, RotateCcw, Save, Trash2 } from 'lucide-react'
import { changeAccountPassword, fetchMe, updateSignInEmail } from '../api/auth'
import { ApiError } from '../api/client'
import { setStoredUserEmail } from '../auth/session'
import { useWorkspaceBranding } from '../branding/BrandingContext'
import { getDefaultWorkspaceBranding, processLogoFile } from '../branding/workspaceBranding'
import { AppShell } from '../components/layout/AppShell'
import { BrandMark } from '../components/BrandMark'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'

const MAX_NAME_LEN = 80
const MIN_PASSWORD_LEN = 6

function flash(setter: (v: string | null) => void, text: string, ms = 4000) {
  setter(text)
  window.setTimeout(() => setter(null), ms)
}

export function SettingsScreen() {
  const { branding, setBranding, resetBranding } = useWorkspaceBranding()
  const [posName, setPosName] = useState(branding.posName)
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logoDataUrl)
  const [logoBusy, setLogoBusy] = useState(false)
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [accountLoading, setAccountLoading] = useState(true)
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null)
  const [serverEmail, setServerEmail] = useState('')
  const [signInEmail, setSignInEmail] = useState('')
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)

  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const loadAccount = useCallback(async () => {
    setAccountLoadError(null)
    setAccountLoading(true)
    try {
      const u = await fetchMe()
      setServerEmail(u.email)
      setSignInEmail(u.email)
    } catch (e) {
      setAccountLoadError(e instanceof ApiError ? e.message : 'Could not load account.')
    } finally {
      setAccountLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccount()
  }, [loadAccount])

  useEffect(() => {
    setPosName(branding.posName)
    setLogoPreview(branding.logoDataUrl)
  }, [branding.posName, branding.logoDataUrl])

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setWorkspaceError(null)
    setWorkspaceMessage(null)
    setLogoBusy(true)
    try {
      const dataUrl = await processLogoFile(file)
      setLogoPreview(dataUrl)
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Could not use this image.')
    } finally {
      setLogoBusy(false)
    }
  }

  function handleSaveWorkspace() {
    const name = posName.trim().slice(0, MAX_NAME_LEN)
    if (!name) {
      setWorkspaceError('Enter a name for your POS.')
      return
    }
    setWorkspaceError(null)
    setWorkspaceMessage(null)
    setBranding({
      posName: name,
      logoDataUrl: logoPreview,
    })
    flash(setWorkspaceMessage, 'Workspace settings saved on this device.')
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    setWorkspaceError(null)
  }

  function handleResetWorkspace() {
    resetBranding()
    const d = getDefaultWorkspaceBranding()
    setPosName(d.posName)
    setLogoPreview(null)
    setWorkspaceError(null)
    flash(setWorkspaceMessage, 'Reset to defaults (build name, no logo).')
  }

  async function handleSaveEmail() {
    setAccountError(null)
    setAccountMessage(null)
    const next = signInEmail.trim().toLowerCase()
    if (!next) {
      setAccountError('Enter an email address.')
      return
    }
    if (next === serverEmail) {
      flash(setAccountMessage, 'Sign-in email is unchanged.')
      return
    }
    if (!emailCurrentPassword) {
      setAccountError('Enter your current password to change your sign-in email.')
      return
    }
    setEmailSaving(true)
    try {
      const u = await updateSignInEmail(signInEmail, emailCurrentPassword)
      setServerEmail(u.email)
      setSignInEmail(u.email)
      setStoredUserEmail(u.email)
      setEmailCurrentPassword('')
      flash(setAccountMessage, 'Sign-in email updated.')
    } catch (e) {
      setAccountError(e instanceof ApiError ? e.message : 'Could not update email.')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordMessage(null)
    if (!pwdCurrent) {
      setPasswordError('Enter your current password.')
      return
    }
    if (pwdNew.length < MIN_PASSWORD_LEN) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LEN} characters.`)
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    setPwdSaving(true)
    try {
      await changeAccountPassword(pwdCurrent, pwdNew)
      setPwdCurrent('')
      setPwdNew('')
      setPwdConfirm('')
      flash(setPasswordMessage, 'Password updated.')
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : 'Could not change password.')
    } finally {
      setPwdSaving(false)
    }
  }

  const emailChanged = signInEmail.trim().toLowerCase() !== serverEmail

  return (
    <AppShell
      title="Settings"
      subtitle="Account, workspace name and logo."
      backOverride={{ to: '/home', ariaLabel: 'Back to home', title: 'Home' }}
    >
      <div className="mx-auto grid max-w-[640px] gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_40px_120px_-88px_rgba(0,0,0,0.92)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-ink/88">
              <Mail className="h-4 w-4 text-ink/55" strokeWidth={1.75} />
              Account
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink/52">
              Your sign-in email and password are stored on the server. Changing email requires your current password.
            </p>

            {accountLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-ink/55">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading account…
              </div>
            ) : accountLoadError ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                  {accountLoadError}
                </div>
                <Button type="button" variant="ghost" className="h-10" onClick={() => void loadAccount()}>
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-2">
                  <FieldLabel htmlFor="sign-in-email">Sign-in email</FieldLabel>
                  <TextField
                    id="sign-in-email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  <p className="text-[11px] text-ink/45">This is your username for signing in.</p>
                </div>

                {emailChanged ? (
                  <div className="mt-4 grid gap-2">
                    <FieldLabel htmlFor="email-current-pw">Current password</FieldLabel>
                    <TextField
                      id="email-current-pw"
                      type="password"
                      value={emailCurrentPassword}
                      onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                ) : null}

                {accountError ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                    {accountError}
                  </div>
                ) : null}
                {accountMessage ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--accent-2)_10%,transparent)] px-3 py-2 text-sm text-ink/75">
                    {accountMessage}
                  </div>
                ) : null}

                <div className="mt-4">
                  <Button
                    type="button"
                    disabled={emailSaving || !emailChanged}
                    onClick={() => void handleSaveEmail()}
                  >
                    {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
                    Update email
                  </Button>
                </div>

                <div className="my-8 h-px bg-white/10" />

                <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-ink/88">
                  <KeyRound className="h-4 w-4 text-ink/55" strokeWidth={1.75} />
                  Password
                </div>
                <p className="mt-1 text-xs text-ink/50">Use a strong password you do not reuse elsewhere.</p>

                <div className="mt-4 grid gap-3">
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="pwd-current">Current password</FieldLabel>
                    <TextField
                      id="pwd-current"
                      type="password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="pwd-new">New password</FieldLabel>
                    <TextField
                      id="pwd-new"
                      type="password"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      autoComplete="new-password"
                      placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="pwd-confirm">Confirm new password</FieldLabel>
                    <TextField
                      id="pwd-confirm"
                      type="password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {passwordError ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                    {passwordError}
                  </div>
                ) : null}
                {passwordMessage ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--accent-2)_10%,transparent)] px-3 py-2 text-sm text-ink/75">
                    {passwordMessage}
                  </div>
                ) : null}

                <div className="mt-4">
                  <Button type="button" disabled={pwdSaving} onClick={() => void handleChangePassword()}>
                    {pwdSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    Change password
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_40px_120px_-88px_rgba(0,0,0,0.92)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="relative">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Workspace branding</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/52">
              Shown in the sidebar, sign-in page, and printed receipts. Clearing site data will remove these preferences.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <BrandMark size={52} />
                <div className="text-xs text-ink/50">
                  <div className="font-medium text-ink/70">Preview</div>
                  <div className="mt-0.5 max-w-[200px] truncate">{posName.trim() || '—'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <FieldLabel htmlFor="pos-name">POS name</FieldLabel>
              <TextField
                id="pos-name"
                value={posName}
                onChange={(e) => setPosName(e.target.value.slice(0, MAX_NAME_LEN))}
                placeholder="e.g. Boutique Marie"
                maxLength={MAX_NAME_LEN}
                autoComplete="organization"
              />
              <div className="text-[11px] text-ink/45">{posName.length}/{MAX_NAME_LEN} characters</div>
            </div>

            <div className="mt-6 grid gap-2">
              <FieldLabel>Logo</FieldLabel>
              <p className="text-xs text-ink/50">PNG, JPG, or WebP. Images are resized for storage in the browser.</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={handlePickFile}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  disabled={logoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  {logoBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  {logoBusy ? 'Processing…' : 'Choose image'}
                </Button>
                {logoPreview ? (
                  <Button type="button" variant="ghost" className="h-10 text-ink/70" onClick={handleRemoveLogo}>
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    Remove logo
                  </Button>
                ) : null}
              </div>
              {logoPreview ? (
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <img src={logoPreview} alt="Logo preview" className="mx-auto max-h-32 max-w-full object-contain" />
                </div>
              ) : null}
            </div>

            {workspaceError ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                {workspaceError}
              </div>
            ) : null}
            {workspaceMessage ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--accent-2)_10%,transparent)] px-3 py-2 text-sm text-ink/75">
                {workspaceMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={handleSaveWorkspace}>
                <Save className="h-4 w-4" strokeWidth={1.75} />
                Save workspace
              </Button>
              <Button type="button" variant="ghost" onClick={handleResetWorkspace}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                Reset to defaults
              </Button>
            </div>
          </div>
        </section>

        <p className="text-center text-[11px] text-ink/45">
          For API URL and build-time app label, use environment variables (e.g.{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-ink/60">VITE_APP_NAME</code>) when deploying.
        </p>
      </div>
    </AppShell>
  )
}
