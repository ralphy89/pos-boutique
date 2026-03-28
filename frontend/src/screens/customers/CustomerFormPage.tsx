import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { createCustomerApi, getCustomerApi, updateCustomerApi } from '../../api/customers'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { FieldLabel, TextField } from '../../components/ui/Field'
import { parseCustomerIdParam, toCustomerRecord } from '../../domain/customerView'
import type { CustomerStatus } from '../../types/customer'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function parseCreditLimit(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = raw.trim()
  if (!t) return { ok: true, value: null }
  const n = Number(t.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return { ok: false, message: 'Credit limit must be a positive number or empty.' }
  return { ok: true, value: round2(n) }
}

export function CustomerFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const id = mode === 'edit' ? parseCustomerIdParam(customerId) : null

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [status, setStatus] = useState<CustomerStatus>('active')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(mode === 'edit' && id != null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'create') {
      setName('')
      setPhone('')
      setAddress('')
      setNote('')
      setCreditLimit('')
      setStatus('active')
      setError(null)
      setLoadError(null)
      setLoadingInitial(false)
      return
    }

    if (!id) {
      setLoadingInitial(false)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoadingInitial(true)
    setLoadError(null)
    ;(async () => {
      try {
        const row = await getCustomerApi(id)
        if (cancelled) return
        const c = toCustomerRecord(row)
        setName(c.name)
        setPhone(c.phone)
        setAddress(c.address)
        setNote(c.note)
        setCreditLimit(c.creditLimit != null ? String(c.creditLimit) : '')
        setStatus(c.status)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Could not load customer.')
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, id])

  if (mode === 'edit' && !id) {
    return (
      <AppShell
        title="Edit customer"
        subtitle="Invalid or missing id."
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-ink/60">
          Use a valid customer link from the directory.
        </div>
      </AppShell>
    )
  }

  if (mode === 'edit' && loadingInitial) {
    return (
      <AppShell
        title="Edit customer"
        subtitle="Loading record…"
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-sm text-ink/55">
          <Loader2 className="h-5 w-5 animate-spin text-ink/45" />
          Loading…
        </div>
      </AppShell>
    )
  }

  if (mode === 'edit' && loadError) {
    return (
      <AppShell
        title="Edit customer"
        subtitle="Could not load record."
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-[color-mix(in_oklab,var(--highlight)_75%,white)]">
          {loadError}
        </div>
      </AppShell>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Full name is required.')
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }

    const cl = parseCreditLimit(creditLimit)
    if (!cl.ok) {
      setError(cl.message)
      return
    }

    const payload = {
      name: trimmedName,
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      credit_limit: cl.value,
      status,
    }

    setSubmitting(true)
    try {
      const row =
        mode === 'edit' && id != null
          ? await updateCustomerApi(id, payload)
          : await createCustomerApi(payload)
      navigate(`/customers/${row.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save customer.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'create' ? 'New customer' : 'Edit customer'
  const subtitle =
    mode === 'create'
      ? 'Capture identity, contact, and credit guardrails — minimal friction.'
      : 'Update profile details and internal notes with precision.'

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      quickActionLabel="New sale"
      onQuickAction={() => navigate('/sales/new')}
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent_50%)]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                Profile intake
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink/90">
                {mode === 'create' ? 'Create customer record' : 'Update customer record'}
              </h2>
              <p className="mt-1 max-w-[56ch] text-sm text-ink/55">
                Structured fields keep the ledger trustworthy. Only essentials — no clutter.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Identity & contact" description="How your team reaches this account.">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-name">Full name</FieldLabel>
                <TextField
                  id="cust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maison Karibe"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-phone">Phone number</FieldLabel>
                <TextField
                  id="cust-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+509 …"
                  autoComplete="tel"
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-address">Address</FieldLabel>
                <textarea
                  id="cust-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, delivery notes…"
                  rows={3}
                  className={clsx(
                    'w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-ink shadow-inner',
                    'placeholder:text-ink/35',
                    'focus:border-white/20 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)]',
                  )}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Credit & status" description="Optional ceiling and operational state.">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-limit">Credit limit (optional)</FieldLabel>
                <TextField
                  id="cust-limit"
                  inputMode="numeric"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Leave empty for no limit"
                />
                <p className="text-[11px] leading-relaxed text-ink/45">
                  When set, utilization appears on the customer ledger. Amounts in HTG.
                </p>
              </div>

              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-status">Status</FieldLabel>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <select
                    id="cust-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_92%,white)] px-3 pr-10 text-sm text-ink outline-none transition focus:border-white/20 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="watch">Watch list</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <FieldLabel htmlFor="cust-note">Note</FieldLabel>
                <textarea
                  id="cust-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Terms, preferences, risk flags…"
                  rows={4}
                  className={clsx(
                    'w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-ink shadow-inner',
                    'placeholder:text-ink/35',
                    'focus:border-white/20 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)]',
                  )}
                />
              </div>
            </div>
          </Panel>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)] px-4 py-3 text-sm text-[color-mix(in_oklab,var(--highlight)_88%,white)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'create' ? 'Save customer' : 'Save changes'}
          </Button>
        </div>
      </form>
    </AppShell>
  )
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">{title}</div>
        <div className="mt-1 text-xs text-ink/48">{description}</div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  )
}
