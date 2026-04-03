import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Loader2,
  PiggyBank,
  Receipt,
  Scale,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  getCreditSummaryApi,
  listCreditDebtorsApi,
  listCreditPaymentsApi,
  type CreditDebtorRow,
  type CreditPaymentListItem,
} from '../../api/credit'
import { listSalesApi } from '../../api/sales'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { creditLimitFromApi } from '../../types/customer'
import type { DebtorSummary } from '../../types/credit'
import { moneyFromApi } from '../../types/product'
import { RecordPaymentModal } from './RecordPaymentModal'

function formatMoney(n: number) {
  return `HTG ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function localTodayStartIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function localTodayEndIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function debtorFromApi(row: CreditDebtorRow): DebtorSummary {
  return {
    customerId: row.id,
    name: row.name,
    phone: row.phone,
    status: row.status,
    creditLimit: creditLimitFromApi(row.credit_limit),
    debtBalance: moneyFromApi(row.debt_balance),
  }
}

function isSameLocalCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
  )
}

function formatPaymentMethod(m: string) {
  if (m === 'moncash') return 'MonCash'
  return m.charAt(0).toUpperCase() + m.slice(1)
}

function debtorStatusLabel(d: DebtorSummary): { text: string; risk: boolean } {
  if (d.debtBalance <= 0) return { text: 'Clear', risk: false }
  if (d.status === 'watch') return { text: 'Watch', risk: true }
  if (d.creditLimit != null && d.creditLimit > 0 && d.debtBalance > d.creditLimit) {
    return { text: 'Over limit', risk: true }
  }
  if (d.creditLimit != null && d.creditLimit > 0 && d.debtBalance >= d.creditLimit * 0.9) {
    return { text: 'Near limit', risk: true }
  }
  return { text: 'Active debt', risk: false }
}

export function CreditsOverviewPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DebtorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creditSummary, setCreditSummary] = useState<{ totalOutstanding: number; debtorCount: number } | null>(null)
  const [creditTodayTotal, setCreditTodayTotal] = useState<number>(0)
  const [payments, setPayments] = useState<CreditPaymentListItem[]>([])
  const [paymentModalDebtor, setPaymentModalDebtor] = useState<DebtorSummary | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, debtorRows, paymentRows] = await Promise.all([
        getCreditSummaryApi(),
        listCreditDebtorsApi(),
        listCreditPaymentsApi({ limit: 300 }),
      ])
      setRows(debtorRows.map(debtorFromApi))
      setPayments(paymentRows)
      setCreditSummary({
        totalOutstanding: Math.round(moneyFromApi(summary.total_outstanding) * 100) / 100,
        debtorCount: summary.debtor_count,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load credit data.')
      setRows([])
      setPayments([])
      setCreditSummary(null)
    } finally {
      setLoading(false)
    }

    try {
      const creditSales = await listSalesApi({
        payment_method: 'credit',
        created_from: localTodayStartIso(),
        created_to: localTodayEndIso(),
        limit: 200,
      })
      const ct = creditSales.reduce((s, x) => s + moneyFromApi(x.total), 0)
      setCreditTodayTotal(Math.round(ct * 100) / 100)
    } catch {
      setCreditTodayTotal(0)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, tick])

  const debtorsWithBalance = useMemo(() => rows.filter((r) => r.debtBalance > 0), [rows])

  /** Owing first, then by balance (includes approved-limit-only accounts). */
  const creditAccountsSorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const aOwe = a.debtBalance > 0 ? 1 : 0
      const bOwe = b.debtBalance > 0 ? 1 : 0
      if (aOwe !== bOwe) return bOwe - aOwe
      return b.debtBalance - a.debtBalance
    })
    return copy
  }, [rows])

  const lastRepaymentAtByCustomer = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of payments) {
      const cur = m.get(p.customer_id)
      if (!cur || p.created_at > cur) m.set(p.customer_id, p.created_at)
    }
    return m
  }, [payments])

  const kpis = useMemo(() => {
    const now = new Date()
    const payToday = payments.filter((p) => isSameLocalCalendarDay(p.created_at, now))
    const repayTodayCount = payToday.length
    const repayTodaySum = payToday.reduce((s, p) => s + moneyFromApi(p.amount), 0)
    const risky = debtorsWithBalance.filter((d) => debtorStatusLabel(d).risk).length
    const totalOutstanding =
      creditSummary?.totalOutstanding ??
      Math.round(debtorsWithBalance.reduce((s, d) => s + d.debtBalance, 0) * 100) / 100
    const debtorCount = creditSummary?.debtorCount ?? debtorsWithBalance.length
    const creditFileCount = rows.length
    return {
      totalOutstanding,
      debtorCount,
      creditFileCount,
      repayTodayCount,
      repayTodaySum: Math.round(repayTodaySum * 100) / 100,
      creditTodayTotal,
      riskyCount: risky,
    }
  }, [creditSummary, debtorsWithBalance, payments, creditTodayTotal, rows.length])

  const attention = useMemo(() => {
    return debtorsWithBalance
      .filter((d) => debtorStatusLabel(d).risk)
      .slice(0, 6)
  }, [debtorsWithBalance])

  const recentRepayments = useMemo(
    () => [...payments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    [payments],
  )

  return (
    <AppShell
      title="Credits"
      subtitle="Customer debt, repayments, and exposure — operational credit control."
      quickActionLabel="New sale"
      onQuickAction={() => navigate('/sales/new')}
      backOverride={{ to: '/home', ariaLabel: 'Back to home', title: 'Home' }}
    >
      <div className="grid gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_40px_120px_-88px_rgba(0,0,0,0.92)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.07),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-2)_20%,transparent),transparent)] blur-3xl opacity-80" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                <Scale className="h-3.5 w-3.5 text-ink/70" strokeWidth={1.5} />
                Receivables intelligence
              </div>
              <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.04em] text-ink/92">
                Credit control center
              </h2>
              <p className="mt-2 max-w-[62ch] text-pretty text-sm leading-relaxed text-ink/58">
                Scan who owes what, spot risky exposure, and record repayments. Balances and repayments sync with the
                server.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="highlight"
                disabled={debtorsWithBalance.length === 0}
                onClick={() => setPaymentModalDebtor(debtorsWithBalance[0] ?? null)}
              >
                <PiggyBank className="h-4 w-4" strokeWidth={1.75} />
                Record payment
              </Button>
              <Button type="button" variant="ghost" onClick={() => void refresh()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--highlight)_8%,transparent)] px-4 py-3 text-sm text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <CreditKpi
            label="Outstanding"
            value={formatMoney(kpis.totalOutstanding)}
            hint="Total receivables (API)"
            icon={<CreditCard className="h-4 w-4" strokeWidth={1.5} />}
            glow="risk"
            emphasize={kpis.totalOutstanding > 0}
          />
          <CreditKpi
            label="Owing"
            value={String(kpis.debtorCount)}
            hint="Customers with balance &gt; 0"
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            glow="accent"
          />
          {/* <CreditKpi
            label="Credit file"
            value={String(kpis.creditFileCount)}
            hint="Owing or approved credit line"
            icon={<Scale className="h-4 w-4" strokeWidth={1.5} />}
            glow="accent"
          /> */}
          <CreditKpi
            label="Repayments today"
            value={formatMoney(kpis.repayTodaySum)}
            hint={`${kpis.repayTodayCount} payment${kpis.repayTodayCount === 1 ? '' : 's'} (local day)`}
            icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
            glow="emerald"
          />
          <CreditKpi
            label="Credit sales today"
            value={formatMoney(kpis.creditTodayTotal)}
            hint="From linked sales (API)"
            icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
            glow="amber"
          />
          <CreditKpi
            label="Needs review"
            value={String(kpis.riskyCount)}
            hint="Watch / over limit / near limit"
            icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
            glow="rose"
            emphasize={kpis.riskyCount > 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 shadow-[0_34px_120px_-90px_rgba(0,0,0,0.9)]">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Credit accounts</div>
                <div className="mt-1 text-xs text-ink/48">Outstanding balance or approved credit line</div>
              </div>
              <div className="text-[11px] text-ink/45">
                {loading
                  ? 'Loading…'
                  : `${debtorsWithBalance.length} owing`}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink/55">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading balances…
                </div>
              ) : creditAccountsSorted.length === 0 ? (
                <div className="py-14 text-center text-sm text-ink/50">
                  No credit accounts yet. Set a credit limit on a customer or post a credit sale from New sale.
                </div>
              ) : (
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                      <th className="border-b border-white/10 pb-3 pl-1 pr-3">Customer</th>
                      <th className="border-b border-white/10 pb-3 pr-3">Balance</th>
                      <th className="border-b border-white/10 pb-3 pr-3">Limit</th>
                      <th className="border-b border-white/10 pb-3 pr-3">Last repayment</th>
                      <th className="border-b border-white/10 pb-3 pr-3">Status</th>
                      <th className="border-b border-white/10 pb-3 pr-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditAccountsSorted.map((d) => {
                      const st = debtorStatusLabel(d)
                      const lastAt = lastRepaymentAtByCustomer.get(d.customerId)
                      return (
                        <tr key={d.customerId} className="text-ink/80">
                          <td className="border-b border-white/[0.06] py-3 pl-1 pr-3">
                            <div className="font-medium tracking-[-0.02em] text-ink/90">{d.name}</div>
                            <div className="text-xs text-ink/48">{d.phone || '—'}</div>
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-3">
                            <div
                              className={clsx(
                                'font-semibold tabular-nums',
                                st.risk ? 'text-[color-mix(in_oklab,var(--highlight)_82%,white)]' : 'text-ink/90',
                              )}
                            >
                              {formatMoney(d.debtBalance)}
                            </div>
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-3 tabular-nums text-xs text-ink/65">
                            {d.creditLimit != null && d.creditLimit > 0 ? formatMoney(d.creditLimit) : '—'}
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-3 text-xs text-ink/55">
                            {lastAt ? formatDateTime(lastAt) : '—'}
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-3">
                            <span
                              className={clsx(
                                'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]',
                                st.risk
                                  ? 'border-[color-mix(in_oklab,var(--highlight)_35%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)] text-[color-mix(in_oklab,var(--highlight)_78%,white)]'
                                  : 'border-white/12 bg-white/[0.04] text-ink/60',
                              )}
                            >
                              {st.text}
                            </span>
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-1 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 px-2.5 text-xs"
                                disabled={d.debtBalance <= 0}
                                onClick={() => setPaymentModalDebtor(d)}
                              >
                                Pay
                              </Button>
                              <Link
                                to={`/credits/${d.customerId}`}
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 text-xs font-medium text-ink/80 transition hover:border-white/15 hover:bg-white/[0.06]"
                              >
                                Ledger
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <div className="border-b border-white/10 pb-4">
                <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Recent repayments</div>
                <div className="mt-1 text-xs text-ink/48">Newest from server</div>
              </div>
              <div className="mt-4 space-y-0 divide-y divide-white/[0.06]">
                {recentRepayments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink/50">No payments logged yet.</p>
                ) : (
                  recentRepayments.map((p) => {
                    return (
                      <div key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink/88">{p.customer_name}</div>
                          <div className="mt-1 text-xs text-ink/48">
                            {formatDateTime(p.created_at)} · {formatPaymentMethod(p.payment_method)}
                            {p.note ? ` · ${p.note}` : ''}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold tabular-nums text-emerald-200/85">
                          −{formatMoney(moneyFromApi(p.amount))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-ink/88">
                  <Shield className="h-4 w-4 text-ink/55" strokeWidth={1.5} />
                  Needs attention
                </div>
                <div className="mt-1 text-xs text-ink/48">Elevated risk or policy flags</div>
              </div>
              <div className="mt-4 space-y-2">
                {attention.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink/50">No flagged accounts right now.</p>
                ) : (
                  attention.map((d) => (
                    <Link
                      key={d.customerId}
                      to={`/credits/${d.customerId}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink/88">{d.name}</div>
                        <div className="text-xs text-ink/48">{debtorStatusLabel(d).text}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold tabular-nums text-[color-mix(in_oklab,var(--highlight)_78%,white)]">
                        {formatMoney(d.debtBalance)}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-center border-t border-white/10 pt-2">
          <Link to="/customers" className="text-xs font-medium text-ink/45 transition hover:text-ink/70">
            Customer directory →
          </Link>
        </div>
      </div>

      {paymentModalDebtor ? (
        <RecordPaymentModal
          debtor={paymentModalDebtor}
          onClose={() => setPaymentModalDebtor(null)}
          onRecorded={() => setTick((t) => t + 1)}
        />
      ) : null}
    </AppShell>
  )
}

function CreditKpi({
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
  glow: 'accent' | 'emerald' | 'amber' | 'rose' | 'risk'
  emphasize?: boolean
}) {
  const g =
    glow === 'emerald'
      ? 'from-emerald-500/[0.12]'
      : glow === 'amber'
        ? 'from-amber-500/[0.12]'
        : glow === 'rose'
          ? 'from-rose-500/[0.14]'
          : glow === 'risk'
            ? 'from-[color-mix(in_oklab,var(--highlight)_16%,transparent)]'
            : 'from-[color-mix(in_oklab,var(--accent)_16%,transparent)]'

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        emphasize &&
          'border-[color-mix(in_oklab,var(--highlight)_30%,transparent)] shadow-[0_0_44px_-18px_color-mix(in_oklab,var(--highlight)_35%,transparent)]',
      )}
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-95', g)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</div>
          <div className="mt-2 text-lg font-semibold tracking-[-0.03em] tabular-nums text-ink/92">{value}</div>
          <div className="mt-1 text-xs leading-snug text-ink/50">{hint}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/70">
          {icon}
        </div>
      </div>
    </div>
  )
}
