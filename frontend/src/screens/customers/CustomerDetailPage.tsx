import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Phone,
  PiggyBank,
  Receipt,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { getCustomerCreditLedgerApi, type CreditLedgerEntryApi } from '../../api/credit'
import { getCustomerApi } from '../../api/customers'
import { ApiError } from '../../api/client'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { RecordPaymentModal } from '../credits/RecordPaymentModal'
import { customerMetrics, parseCustomerIdParam, toCustomerRecord } from '../../domain/customerView'
import type { CustomerRecord } from '../../types/customer'
import type { DebtorSummary } from '../../types/credit'
import type { PurchaseRow } from '../../types/customer'
import { moneyFromApi } from '../../types/product'

function formatMoney(htg: number) {
  return `HTG ${htg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatPaymentMethod(m: string) {
  if (!m) return '—'
  if (m === 'moncash') return 'MonCash'
  return m.charAt(0).toUpperCase() + m.slice(1)
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

function formatDateOnly(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function channelLabel(ch: PurchaseRow['channel']) {
  if (ch === 'counter') return 'Counter'
  if (ch === 'delivery') return 'Delivery'
  return 'Phone'
}

function mapLedgerForDisplay(entries: CreditLedgerEntryApi[]) {
  return entries.map((e) => {
    const amt = moneyFromApi(e.amount)
    if (e.kind === 'charge') {
      return {
        id: `charge-${e.record_id}`,
        at: e.created_at,
        kind: 'charge' as const,
        title: e.sale_id != null ? `Credit sale #${e.sale_id}` : 'Credit charge',
        detail: `Balance after ${formatMoney(moneyFromApi(e.balance_after))}`,
        amount: amt,
      }
    }
    const parts = [e.payment_method ? formatPaymentMethod(e.payment_method) : null, e.note].filter(Boolean) as string[]
    return {
      id: `pay-${e.record_id}`,
      at: e.created_at,
      kind: 'payment' as const,
      title: 'Repayment',
      detail: parts.length ? parts.join(' · ') : '—',
      amount: amt,
    }
  })
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const id = parseCustomerIdParam(customerId)
  const [c, setC] = useState<CustomerRecord | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntryApi[]>([])
  const [ledgerError, setLedgerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [notFound, setNotFound] = useState(!id)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!id) {
      setC(null)
      setLedgerEntries([])
      setLedgerError(null)
      setLoading(false)
      setNotFound(true)
      setFetchError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setFetchError(null)
    setLedgerError(null)
    ;(async () => {
      try {
        const row = await getCustomerApi(id, { purchaseHistoryLimit: 40 })
        if (cancelled) return
        setC(toCustomerRecord(row))
      } catch (e) {
        if (cancelled) return
        setC(null)
        setLedgerEntries([])
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true)
        } else {
          setFetchError(e instanceof Error ? e.message : 'Failed to load customer.')
        }
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const ledgerRes = await getCustomerCreditLedgerApi(id)
        if (cancelled) return
        setLedgerEntries(ledgerRes.entries)
        setLedgerError(null)
      } catch (e) {
        if (!cancelled) {
          setLedgerEntries([])
          setLedgerError(e instanceof Error ? e.message : 'Could not load credit ledger.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, tick])

  const m = c ? customerMetrics(c) : null
  const over = c && c.creditLimit != null && m && m.currentDebt > c.creditLimit

  const creditLedgerRows = useMemo(() => mapLedgerForDisplay(ledgerEntries), [ledgerEntries])

  const debtorForPayment = useMemo((): DebtorSummary | null => {
    if (!c || !m || c.status !== 'active') return null
    return {
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      status: c.status,
      creditLimit: c.creditLimit,
      debtBalance: m.currentDebt,
    }
  }, [c, m])

  if (loading) {
    return (
      <AppShell
        title="Customer"
        subtitle="Loading profile…"
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-sm text-ink/55">
          <Loader2 className="h-5 w-5 animate-spin text-ink/45" />
          Loading…
        </div>
      </AppShell>
    )
  }

  if (fetchError) {
    return (
      <AppShell
        title="Customer"
        subtitle="Could not load profile."
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-sm text-[color-mix(in_oklab,var(--highlight)_75%,white)]">{fetchError}</p>
          <Button type="button" className="mt-5" onClick={() => navigate('/customers')}>
            Back to directory
          </Button>
        </div>
      </AppShell>
    )
  }

  if (!c || !m || notFound) {
    return (
      <AppShell
        title="Customer"
        subtitle="Profile not found."
        backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-sm text-ink/60">This customer record is missing or was removed.</p>
          <Button type="button" className="mt-5" onClick={() => navigate('/customers')}>
            Back to directory
          </Button>
        </div>
      </AppShell>
    )
  }

  const purchases = [...c.purchases].sort((a, b) => b.date.localeCompare(a.date))
  const activities = [...c.activities].sort((a, b) => b.date.localeCompare(a.date))

  const limitUse =
    c.creditLimit != null && c.creditLimit > 0
      ? Math.min(100, Math.round((m.currentDebt / c.creditLimit) * 100))
      : null

  return (
    <AppShell
      title={c.name}
      subtitle="Ledger, receivables, and relationship context — operational control."
      backOverride={{ to: '/customers', ariaLabel: 'Back to customers', title: 'Customers' }}
      quickActionLabel="Edit profile"
      quickActionIcon={Pencil}
      onQuickAction={() => navigate(`/customers/${c.id}/edit`)}
    >
      <div className="grid gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_40px_120px_-88px_rgba(0,0,0,0.92)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_20%,transparent),transparent)] blur-3xl opacity-70" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                Business profile
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink/92">{c.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/65">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <Phone className="h-4 w-4 text-ink/50" strokeWidth={1.5} />
                  {c.phone}
                </span>
                {c.address ? (
                  <span className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-ink/55">
                    {c.address}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                Edit
              </Button>
              <Button type="button" onClick={() => navigate('/sales/new')}>
                <Receipt className="h-4 w-4" strokeWidth={1.75} />
                New sale
              </Button>
            </div>
          </div>

          {over ? (
            <div className="relative mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--highlight)_38%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)] px-4 py-3 text-sm text-[color-mix(in_oklab,var(--highlight)_88%,white)] shadow-[0_0_40px_-18px_color-mix(in_oklab,var(--highlight)_45%,transparent)]">
              <span className="font-semibold tracking-[-0.02em]">Credit exposure above limit.</span>
              <span className="mt-1 block text-xs text-[color-mix(in_oklab,var(--highlight)_72%,white)]">
                Outstanding balance exceeds the approved credit ceiling — review before extending new terms.
              </span>
            </div>
          ) : null}

          {c.creditLimit != null && limitUse != null ? (
            <div className="relative mt-5">
              <div className="flex items-center justify-between text-[11px] font-medium text-ink/50">
                <span>Limit utilization</span>
                <span className="tabular-nums text-ink/65">{limitUse}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                <div
                  className={clsx(
                    'h-full rounded-full bg-gradient-to-r transition-[width]',
                    over
                      ? 'from-[color-mix(in_oklab,var(--highlight)_65%,white)] to-[color-mix(in_oklab,var(--highlight)_35%,transparent)]'
                      : 'from-[color-mix(in_oklab,var(--accent)_55%,white)] to-[color-mix(in_oklab,var(--accent-2)_35%,transparent)]',
                  )}
                  style={{ width: `${limitUse}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-ink/45">
                Limit {formatMoney(c.creditLimit)} · Balance {formatMoney(m.currentDebt)}
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total purchases"
            value={formatMoney(m.totalPurchases)}
            hint="Lifetime gross from this account"
            icon={<Wallet className="h-4 w-4" strokeWidth={1.5} />}
            glow="accent"
          />
          <SummaryCard
            label="Current debt"
            value={formatMoney(m.currentDebt)}
            hint={m.currentDebt > 0 ? 'Receivable outstanding' : 'No open balance'}
            icon={<CreditCard className="h-4 w-4" strokeWidth={1.5} />}
            glow={m.currentDebt > 0 ? 'risk' : 'muted'}
            emphasize={m.currentDebt > 0}
          />
          <SummaryCard
            label="Amount paid"
            value={formatMoney(m.amountPaid)}
            hint="Paid at checkout (cash, MonCash, transfer — credit sales excluded)"
            icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
            glow="accent2"
          />
          <SummaryCard
            label="Last purchase"
            value={m.lastPurchaseDate ? formatDateOnly(m.lastPurchaseDate) : '—'}
            hint={m.lastPurchaseDate ? formatDateTime(m.lastPurchaseDate) : 'No purchase history'}
            icon={<Activity className="h-4 w-4" strokeWidth={1.5} />}
            glow="muted"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LedgerPanel title="Purchase history" subtitle="Most recent sales for this customer">
            {purchases.length === 0 ? (
              <EmptyPanel text="No purchases recorded yet." />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium tracking-[-0.02em] text-ink/88">{p.reference}</div>
                      <div className="mt-1 text-xs text-ink/50">
                        {formatDateTime(p.date)} · {channelLabel(p.channel)}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums text-ink/90">
                      {formatMoney(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LedgerPanel>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Debt & payments</div>
                <div className="mt-1 text-xs text-ink/48">
                  Credit sales (charges) and repayments — newest first.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="highlight"
                  className="h-9 text-xs"
                  disabled={m.currentDebt <= 0 || c.status !== 'active'}
                  onClick={() => setPaymentOpen(true)}
                >
                  <PiggyBank className="h-4 w-4" strokeWidth={1.75} />
                  Record payment
                </Button>
                <Link
                  to={`/credits/${c.id}`}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-ink/80 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  Credit center
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
            <div className="pt-4">
              {ledgerError ? (
                <div className="mb-4 rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                  {ledgerError}
                </div>
              ) : null}
              {creditLedgerRows.length === 0 ? (
                <EmptyPanel
                  text={
                    ledgerError
                      ? 'Credit ledger unavailable — try refresh or open Credit center.'
                      : 'No credit charges or repayments yet. Credit sales and payments will appear here.'
                  }
                />
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {creditLedgerRows.map((row) => (
                    <div key={row.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={clsx(
                              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
                              row.kind === 'payment'
                                ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200/85'
                                : 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100/85',
                            )}
                          >
                            {row.kind === 'payment' ? 'Payment' : 'Charge'}
                          </span>
                          <span className="text-sm font-medium tracking-[-0.02em] text-ink/88">{row.title}</span>
                        </div>
                        <div className="mt-1 text-xs text-ink/50">{row.detail}</div>
                        <div className="mt-1 text-[11px] text-ink/45">{formatDateTime(row.at)}</div>
                      </div>
                      <div
                        className={clsx(
                          'shrink-0 text-sm font-semibold tabular-nums',
                          row.kind === 'payment' ? 'text-emerald-200/90' : 'text-amber-100/90',
                        )}
                      >
                        {row.kind === 'payment' ? '−' : '+'}
                        {formatMoney(row.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LedgerPanel title="Notes" subtitle="Internal context for operators">
            <div className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                <FileText className="h-4 w-4 text-ink/55" strokeWidth={1.5} />
              </div>
              <p className="text-sm leading-relaxed text-ink/70">
                {c.note.trim() ? c.note : 'No notes on file — add context from the edit screen when needed.'}
              </p>
            </div>
          </LedgerPanel>

          <LedgerPanel title="Account activity" subtitle="Recent operational signals">
            {activities.length === 0 ? (
              <EmptyPanel text="No activity entries yet." />
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--accent)_55%,white)] shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_35%,transparent)]" />
                    <div className="min-w-0">
                      <div className="text-sm text-ink/80">{a.label}</div>
                      <div className="mt-1 text-xs text-ink/48">{formatDateTime(a.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LedgerPanel>
        </div>

        <div className="flex justify-center border-t border-white/10 pt-2">
          <Link
            to="/customers"
            className="text-xs font-medium text-ink/45 transition hover:text-ink/70"
          >
            ← Back to customer directory
          </Link>
        </div>
      </div>

      {paymentOpen && debtorForPayment ? (
        <RecordPaymentModal
          debtor={debtorForPayment}
          onClose={() => setPaymentOpen(false)}
          onRecorded={() => {
            setTick((t) => t + 1)
            setPaymentOpen(false)
          }}
        />
      ) : null}
    </AppShell>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  glow,
  emphasize,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
  glow: 'accent' | 'accent2' | 'risk' | 'muted'
  emphasize?: boolean
}) {
  const glowCls =
    glow === 'accent'
      ? 'from-[color-mix(in_oklab,var(--accent)_18%,transparent)]'
      : glow === 'accent2'
        ? 'from-[color-mix(in_oklab,var(--accent-2)_16%,transparent)]'
        : glow === 'risk'
          ? 'from-[color-mix(in_oklab,var(--highlight)_16%,transparent)]'
          : 'from-white/[0.05]'

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        emphasize &&
          'border-[color-mix(in_oklab,var(--highlight)_28%,transparent)] shadow-[0_0_36px_-16px_color-mix(in_oklab,var(--highlight)_35%,transparent)]',
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-90',
          glowCls,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</div>
          <div
            className={clsx(
              'mt-2 text-lg font-semibold tracking-[-0.03em] tabular-nums text-ink/92',
              emphasize && 'text-[color-mix(in_oklab,var(--highlight)_82%,white)]',
            )}
          >
            {value}
          </div>
          <div className="mt-1 text-xs leading-snug text-ink/50">{hint}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/70">
          {icon}
        </div>
      </div>
    </div>
  )
}

function LedgerPanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">{title}</div>
        <div className="mt-1 text-xs text-ink/48">{subtitle}</div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-ink/50">{text}</div>
}
