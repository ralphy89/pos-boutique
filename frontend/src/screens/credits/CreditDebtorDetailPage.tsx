import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpLeft, CreditCard, FileText, Loader2, PiggyBank, Receipt, User } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { getCustomerCreditLedgerApi, type CreditLedgerEntryApi } from '../../api/credit'
import { getCustomerApi } from '../../api/customers'
import { listSalesApi } from '../../api/sales'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { creditLimitFromApi, type CustomerDetailResponse } from '../../types/customer'
import type { DebtorSummary, LedgerEntry } from '../../types/credit'
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

function parseId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function debtorStatusFromDetail(d: CustomerDetailResponse): { text: string; risk: boolean } {
  const debt = moneyFromApi(d.debt_balance)
  if (debt <= 0) return { text: 'Clear', risk: false }
  if (d.status === 'watch') return { text: 'Watch', risk: true }
  const lim = creditLimitFromApi(d.credit_limit)
  if (lim != null && lim > 0 && debt > lim) return { text: 'Over limit', risk: true }
  if (lim != null && lim > 0 && debt >= lim * 0.9) return { text: 'Near limit', risk: true }
  return { text: 'Active debt', risk: false }
}

function mapLedgerEntries(entries: CreditLedgerEntryApi[]): LedgerEntry[] {
  return entries.map((e) => {
    const amt = moneyFromApi(e.amount)
    if (e.kind === 'charge') {
      return {
        id: `charge-${e.record_id}`,
        at: e.created_at,
        kind: 'credit_sale',
        label: e.sale_id != null ? `Credit sale #${e.sale_id}` : 'Credit charge',
        detail: `Balance after ${formatMoney(moneyFromApi(e.balance_after))}`,
        amount: amt,
        deltaDebt: amt,
      }
    }
    const parts = [e.payment_method, e.note].filter(Boolean) as string[]
    const detailStr = parts.length ? parts.join(' · ') : '—'
    return {
      id: `pay-${e.record_id}`,
      at: e.created_at,
      kind: 'payment',
      label: 'Repayment',
      detail: detailStr,
      amount: amt,
      deltaDebt: -amt,
    }
  })
}

export function CreditDebtorDetailPage() {
  const { customerId: idParam } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const customerId = parseId(idParam)

  const [detail, setDetail] = useState<CustomerDetailResponse | null>(null)
  const [ledgerApi, setLedgerApi] = useState<CreditLedgerEntryApi[]>([])
  const [creditSales, setCreditSales] = useState<Awaited<ReturnType<typeof listSalesApi>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    if (!customerId) {
      setLoading(false)
      setError('Invalid customer.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [d, ledgerRes, sales] = await Promise.all([
        getCustomerApi(customerId, { purchaseHistoryLimit: 40 }),
        getCustomerCreditLedgerApi(customerId),
        listSalesApi({ customer_id: customerId, payment_method: 'credit', limit: 50 }),
      ])
      setDetail(d)
      setLedgerApi(ledgerRes.entries)
      setCreditSales(sales)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer credit profile.')
      setDetail(null)
      setLedgerApi([])
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    void refresh()
  }, [refresh, tick])

  const debtorRow = useMemo((): DebtorSummary | null => {
    if (!detail) return null
    return {
      customerId: detail.id,
      name: detail.name,
      phone: detail.phone,
      status: detail.status,
      creditLimit: creditLimitFromApi(detail.credit_limit),
      debtBalance: moneyFromApi(detail.debt_balance),
    }
  }, [detail])

  const ledger = useMemo(() => mapLedgerEntries(ledgerApi), [ledgerApi])

  const effectiveBalance = detail ? moneyFromApi(detail.debt_balance) : 0
  const st = detail ? debtorStatusFromDetail(detail) : { text: '—', risk: false }

  if (!customerId) {
    return (
      <AppShell title="Credits" subtitle="Invalid link." backOverride={{ to: '/credits', title: 'Credits', ariaLabel: 'Back' }}>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-ink/55">
          Invalid customer.
          <Button type="button" className="mt-4" onClick={() => navigate('/credits')}>
            Back to credits
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={detail?.name ?? 'Customer credit'}
      subtitle="Ledger, exposure, and repayments for this account."
      quickActionLabel="Record payment"
      quickActionDisabled={!detail || effectiveBalance <= 0}
      onQuickAction={() => setPaymentOpen(true)}
      backOverride={{ to: '/credits', ariaLabel: 'Back to credits', title: 'Credits' }}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink/55">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading credit profile…
        </div>
      ) : error || !detail ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-sm text-[color-mix(in_oklab,var(--highlight)_75%,white)]">{error ?? 'Not found.'}</p>
          <Button type="button" className="mt-4" variant="ghost" onClick={() => navigate('/credits')}>
            Back to credits
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.06),transparent_55%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={clsx(
                    'grid h-14 w-14 shrink-0 place-items-center rounded-2xl border',
                    st.risk
                      ? 'border-[color-mix(in_oklab,var(--highlight)_38%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)] text-[color-mix(in_oklab,var(--highlight)_78%,white)]'
                      : 'border-white/10 bg-white/[0.04] text-ink/75',
                  )}
                >
                  <User className="h-7 w-7" strokeWidth={1.25} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                    {st.text}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink/92">{detail.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-ink/60">
                    <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1">{detail.phone || 'No phone'}</span>
                    <span className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1 text-ink/45">
                      #{detail.id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="highlight" disabled={effectiveBalance <= 0} onClick={() => setPaymentOpen(true)}>
                  <PiggyBank className="h-4 w-4" strokeWidth={1.75} />
                  Record payment
                </Button>
                <Link to={`/customers/${detail.id}`}>
                  <Button type="button" variant="ghost">
                    <ArrowUpLeft className="h-4 w-4" />
                    Customer profile
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailKpi
              label="Outstanding"
              value={formatMoney(effectiveBalance)}
              hint="Current debt balance"
              emphasize={effectiveBalance > 0}
              risk={st.risk}
            />
            <DetailKpi
              label="Total purchased"
              value={formatMoney(moneyFromApi(detail.total_purchase))}
              hint="Lifetime sale volume"
            />
            <DetailKpi
              label="Paid at counter"
              value={formatMoney(moneyFromApi(detail.amount_paid))}
              hint="Cash / MonCash / transfer"
            />
            <DetailKpi
              label="Credit limit"
              value={debtorRow?.creditLimit != null ? formatMoney(debtorRow.creditLimit) : '—'}
              hint={debtorRow?.creditLimit != null ? 'Policy ceiling' : 'Not set'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LedgerPanel title="Credit activity" subtitle="Charges and repayments (newest first)">
              {ledger.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">No ledger entries yet.</p>
              ) : (
                <div className="space-y-0 divide-y divide-white/[0.06]">
                  {ledger.map((row) => (
                    <div key={row.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/65">
                        {row.kind === 'payment' ? (
                          <PiggyBank className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                          <CreditCard className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm font-medium text-ink/88">{row.label}</div>
                          {row.deltaDebt != null ? (
                            <div
                              className={clsx(
                                'text-sm font-semibold tabular-nums',
                                row.deltaDebt > 0 ? 'text-amber-100/90' : 'text-emerald-200/85',
                              )}
                            >
                              {row.deltaDebt > 0 ? '+' : '−'}
                              {formatMoney(Math.abs(row.deltaDebt))}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-ink/52">{row.detail}</div>
                        <div className="mt-1 text-[11px] tabular-nums text-ink/40">{formatDateTime(row.at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </LedgerPanel>

            <div className="grid gap-4">
              <LedgerPanel title="Credit sales (linked)" subtitle="Recorded on account for this customer">
                {creditSales.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink/50">No credit sales in recent fetch.</p>
                ) : (
                  <div className="space-y-0 divide-y divide-white/[0.06]">
                    {creditSales.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div>
                          <div className="text-sm font-medium text-ink/88">Sale #{s.id}</div>
                          <div className="mt-1 text-xs text-ink/48">{formatDateTime(s.created_at)}</div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums text-ink/90">{formatMoney(moneyFromApi(s.total))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </LedgerPanel>

              <LedgerPanel title="Recent purchases (all methods)" subtitle="From customer profile">
                {detail.recent_purchases.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink/50">No recent purchases.</p>
                ) : (
                  <div className="space-y-0 divide-y divide-white/[0.06]">
                    {detail.recent_purchases.map((p) => (
                      <div key={p.sale_id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-ink/88">#{p.sale_id}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/55">
                              {p.payment_method}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-ink/48">{formatDateTime(p.created_at)}</div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums text-ink/90">{formatMoney(moneyFromApi(p.total))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </LedgerPanel>

              <LedgerPanel title="Notes" subtitle="Internal context">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <FileText className="h-4 w-4 text-ink/55" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm leading-relaxed text-ink/65">
                    {detail.note.trim() ? detail.note : 'No notes on file — edit from the customer profile.'}
                  </p>
                </div>
              </LedgerPanel>
            </div>
          </div>

        </div>
      )}

      {paymentOpen && debtorRow ? (
        <RecordPaymentModal
          debtor={debtorRow}
          onClose={() => setPaymentOpen(false)}
          onRecorded={() => setTick((t) => t + 1)}
        />
      ) : null}
    </AppShell>
  )
}

function DetailKpi({
  label,
  value,
  hint,
  emphasize,
  risk,
}: {
  label: string
  value: string
  hint: string
  emphasize?: boolean
  risk?: boolean
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        emphasize &&
          (risk
            ? 'border-[color-mix(in_oklab,var(--highlight)_32%,transparent)] shadow-[0_0_40px_-18px_color-mix(in_oklab,var(--highlight)_35%,transparent)]'
            : 'border-[color-mix(in_oklab,var(--accent)_28%,transparent)]'),
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-90',
          risk
            ? 'from-[color-mix(in_oklab,var(--highlight)_14%,transparent)]'
            : 'from-[color-mix(in_oklab,var(--accent)_12%,transparent)]',
        )}
      />
      <div className="relative">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45">{label}</div>
        <div className="mt-2 text-lg font-semibold tabular-nums tracking-[-0.03em] text-ink/92">{value}</div>
        <div className="mt-1 text-xs text-ink/50">{hint}</div>
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
        <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-ink/88">
          <Receipt className="h-4 w-4 text-ink/55" strokeWidth={1.5} />
          {title}
        </div>
        <div className="mt-1 text-xs text-ink/48">{subtitle}</div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}
