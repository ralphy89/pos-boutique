import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { listCustomersApi } from '../../api/customers'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { FieldLabel, TextField } from '../../components/ui/Field'
import { customerMetrics, toCustomerRecord } from '../../domain/customerView'
import type { CustomerRecord, CustomerStatus } from '../../types/customer'

function formatMoney(htg: number) {
  return `HTG ${htg.toLocaleString()}`
}

function statusLabel(s: CustomerStatus) {
  if (s === 'active') return 'Active'
  if (s === 'inactive') return 'Inactive'
  return 'Watch'
}

export function CustomersListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [rows, setRows] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const root = target.closest(`[data-menu-root="${openMenuId ?? ''}"]`)
      if (root) return
      setOpenMenuId(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [openMenuId])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 320)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const apiRows = await listCustomersApi({ limit: 200 })
        if (cancelled) return
        setRows(apiRows.map(toCustomerRecord))
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load customers.')
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [location.pathname, location.key])

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase()
    return rows.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      const hay = `${c.name} ${c.phone} ${c.address}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, debouncedQuery, statusFilter])

  return (
    <AppShell
      title="Customers"
      subtitle="Relationship intelligence, ledger clarity, and credit control — built for retail operations."
      quickActionLabel="Add customer"
      quickActionIcon={UserPlus}
      onQuickAction={() => navigate('/customers/new')}
    >
      <div className="grid gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_44px_120px_-90px_rgba(0,0,0,0.9)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_80%_at_100%_0%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_55%)]" />
          <div className="pointer-events-none absolute -bottom-24 left-[-20%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-2)_18%,transparent),transparent)] blur-3xl opacity-60" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                <Sparkles className="h-3.5 w-3.5 text-ink/70" strokeWidth={1.5} />
                Commerce control
              </div>
              <h2 className="mt-3 text-balance text-xl font-semibold tracking-[-0.04em] text-ink/92">
                Customer roster
              </h2>
              <p className="mt-1.5 max-w-[62ch] text-pretty text-sm leading-relaxed text-ink/58">
                Live data from your POS API. Search locally by name, phone, or address (up to 200 records).
              </p>
            </div>
            <Button type="button" className="shrink-0" onClick={() => navigate('/customers/new')}>
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              Add customer
            </Button>
          </div>

          <div className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1.15fr_0.55fr_auto] lg:items-end">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="cust-q">Search</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" strokeWidth={1.75} />
                <TextField
                  id="cust-q"
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, phone, or address…"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <FieldLabel htmlFor="cust-status">Status</FieldLabel>
              <div className="relative">
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <select
                  id="cust-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | CustomerStatus)}
                  className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_92%,white)] px-3 pr-10 text-sm text-ink outline-none transition focus:border-white/20 focus:bg-[color-mix(in_oklab,var(--bg-1)_88%,white)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="watch">Watch list</option>
                </select>
              </div>
            </div>

            <div className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-ink/55">
              <span>
                <span className="font-medium text-ink/78">{loading ? '…' : filtered.length}</span> shown
                {!loading ? (
                  <>
                    <span className="mx-2 text-ink/35">·</span>
                    <span className="text-ink/45">{rows.length} loaded</span>
                  </>
                ) : null}
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-visible rounded-3xl border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="text-xs font-medium text-ink/55">Directory</div>
            <div className="mt-1 text-[11px] text-ink/45">
              Tap a row for profile and ledger layout. Purchase and debt totals fill in when those APIs are wired.
            </div>
          </div>

          {error ? (
            <div className="border-b border-white/10 px-5 py-3 text-sm text-[color-mix(in_oklab,var(--highlight)_75%,white)]">
              {error}
            </div>
          ) : null}

          <div className="hidden grid-cols-[1.35fr_0.95fr_0.85fr_0.65fr_auto] gap-3 border-b border-white/10 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45 lg:grid">
            <div>Customer</div>
            <div>Phone</div>
            <div className="text-right">Credit limit</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="grid">
            {loading ? (
              <div className="flex items-center justify-center gap-2 border-t border-white/10 px-5 py-16 text-sm text-ink/55">
                <Loader2 className="h-5 w-5 animate-spin text-ink/45" />
                Loading customers…
              </div>
            ) : filtered.length === 0 ? (
              <div className="relative px-5 py-16 text-center">
                <div className="pointer-events-none absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)] blur-2xl opacity-70" />
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_40px_-20px_color-mix(in_oklab,var(--accent)_40%,transparent)]">
                  <Users className="h-7 w-7 text-ink/55" strokeWidth={1.25} />
                </div>
                <div className="relative mt-5 text-sm font-semibold tracking-[-0.02em] text-ink/88">
                  {rows.length === 0 ? 'No customers yet' : 'No matches for this view'}
                </div>
                <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/52">
                  {rows.length === 0
                    ? 'Start your relationship book with a first profile — structured, auditable, and ready for daily trade.'
                    : 'Adjust search or filters, or add a new customer to extend your roster.'}
                </p>
                {rows.length === 0 ? (
                  <div className="relative mt-6">
                    <Button type="button" onClick={() => navigate('/customers/new')}>
                      <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                      Add customer
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              filtered.map((c, index) => (
                <CustomerRow
                  key={c.id}
                  c={c}
                  menuOpen={openMenuId === c.id}
                  menuOpenUpward={index === filtered.length - 1}
                  onMenuOpenChange={(open) => setOpenMenuId(open ? c.id : null)}
                  onOpen={() => navigate(`/customers/${c.id}`)}
                  onEdit={() => navigate(`/customers/${c.id}/edit`)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function CustomerRow({
  c,
  menuOpen,
  menuOpenUpward,
  onMenuOpenChange,
  onOpen,
  onEdit,
}: {
  c: CustomerRecord
  menuOpen: boolean
  /** Open the actions menu above the trigger so the last row is not clipped by the card. */
  menuOpenUpward: boolean
  onMenuOpenChange: (open: boolean) => void
  onOpen: () => void
  onEdit: () => void
}) {
  const m = customerMetrics(c)
  const owing = m.currentDebt > 0
  const over = c.creditLimit != null && m.currentDebt > c.creditLimit

  const rowSurface = over
    ? 'bg-[linear-gradient(90deg,color-mix(in_oklab,var(--highlight)_16%,transparent),transparent_50%)] shadow-[inset_4px_0_0_0_color-mix(in_oklab,var(--highlight)_58%,transparent)] hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--highlight)_20%,transparent),rgba(255,255,255,0.03))]'
    : owing
      ? 'bg-[linear-gradient(90deg,rgba(251,191,36,0.08),transparent_50%)] shadow-[inset_4px_0_0_0_rgba(251,191,36,0.42)] hover:bg-[linear-gradient(90deg,rgba(251,191,36,0.11),rgba(255,255,255,0.03))]'
      : 'hover:bg-white/[0.04]'

  function onRowKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onRowKeyDown}
      className={clsx(
        'group w-full cursor-pointer border-t border-white/10 px-5 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent)_40%,transparent)] lg:grid lg:grid-cols-[1.35fr_0.95fr_0.85fr_0.65fr_auto] lg:items-center lg:gap-3',
        menuOpen && 'relative z-30',
        rowSurface,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold tracking-[-0.02em] text-ink/92">{c.name}</span>
        </div>
        <div className="mt-1 text-xs text-ink/48 lg:hidden">{c.phone}</div>
        <div className="mt-1 text-xs text-ink/45 lg:hidden">
          Limit: {c.creditLimit != null ? formatMoney(c.creditLimit) : '—'}
        </div>
      </div>

      <div className="hidden text-sm text-ink/72 lg:block">{c.phone}</div>

      <div className="mt-3 hidden text-right text-sm tabular-nums text-ink/80 lg:mt-0 lg:block">
        {c.creditLimit != null ? formatMoney(c.creditLimit) : '—'}
      </div>

      <div className="mt-3 lg:mt-0">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-ink/70">
          {statusLabel(c.status)}
        </span>
      </div>

      <div
        className="mt-4 flex items-center justify-end lg:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative" data-menu-root={String(c.id)}>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-ink/75 transition hover:bg-white/[0.05]"
            aria-label="Actions"
            title="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              onMenuOpenChange(!menuOpen)
            }}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className={clsx(
                'absolute right-0 z-50 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--bg-1)_88%,black)] shadow-[0_30px_90px_-60px_rgba(0,0,0,0.9)]',
                menuOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1',
              )}
            >
              <RowMenuItem
                icon={<Eye className="h-4 w-4" strokeWidth={1.75} />}
                label="View"
                onClick={() => {
                  onMenuOpenChange(false)
                  onOpen()
                }}
              />
              <RowMenuItem
                icon={<Pencil className="h-4 w-4" strokeWidth={1.75} />}
                label="Edit"
                onClick={() => {
                  onMenuOpenChange(false)
                  onEdit()
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RowMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink/80 transition hover:bg-white/[0.06]"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
        {icon}
      </span>
      <span className="font-medium tracking-[-0.01em]">{label}</span>
    </button>
  )
}
