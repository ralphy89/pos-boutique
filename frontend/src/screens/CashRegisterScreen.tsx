import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowDownRight,
  Banknote,
  Calculator,
  CircleDot,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { FieldLabel, TextField } from '../components/ui/Field'

const STORAGE_KEY = 'pos.cash_register_ui_v1'

type PaymentBreakdown = {
  cash: number
  moncash: number
  transfer: number
  credit: number
}

type RegisterExpense = {
  id: string
  amount: number
  note: string
  at: string
}

type LastCloseSnapshot = {
  closedAt: string
  openingBalance: number
  cashSales: number
  expensesTotal: number
  expectedCash: number
  actualCash: number
  discrepancy: number
  openingNote: string
  closingNote: string
}

type PersistedState = {
  isOpen: boolean
  openedAt: string | null
  openedBy: string | null
  openingBalance: number
  openingNote: string
  expenses: RegisterExpense[]
  /** Stub until backend: sales-by-method for this session */
  paymentBreakdown: PaymentBreakdown
  lastClose: LastCloseSnapshot | null
}

const emptyPayments = (): PaymentBreakdown => ({
  cash: 0,
  moncash: 0,
  transfer: 0,
  credit: 0,
})

const defaultState = (): PersistedState => ({
  isOpen: false,
  openedAt: null,
  openedBy: null,
  openingBalance: 0,
  openingNote: '',
  expenses: [],
  paymentBreakdown: emptyPayments(),
  lastClose: null,
})

function loadState(): PersistedState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const p = JSON.parse(raw) as Partial<PersistedState>
    return {
      ...defaultState(),
      ...p,
      expenses: Array.isArray(p.expenses) ? p.expenses : [],
      paymentBreakdown: { ...emptyPayments(), ...p.paymentBreakdown },
      lastClose: p.lastClose ?? null,
    }
  } catch {
    return defaultState()
  }
}

function saveState(s: PersistedState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

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

function parseAmount(raw: string): number {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || t === '.') return 0
  const n = parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function CashRegisterScreen() {
  const navigate = useNavigate()
  const [state, setState] = useState<PersistedState>(loadState)
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [activityExpanded, setActivityExpanded] = useState(true)

  useEffect(() => {
    saveState(state)
  }, [state])

  const userEmail = typeof localStorage !== 'undefined' ? localStorage.getItem('pos.user_email') : null
  const operator = userEmail?.trim() || 'Operator'

  const cashSales = state.paymentBreakdown.cash
  const expensesTotal = useMemo(
    () => state.expenses.reduce((s, e) => s + e.amount, 0),
    [state.expenses],
  )
  const expectedCash = useMemo(
    () => Math.round((state.openingBalance + cashSales - expensesTotal) * 100) / 100,
    [state.openingBalance, cashSales, expensesTotal],
  )

  const totalSalesAllMethods = useMemo(
    () =>
      state.paymentBreakdown.cash +
      state.paymentBreakdown.moncash +
      state.paymentBreakdown.transfer +
      state.paymentBreakdown.credit,
    [state.paymentBreakdown],
  )

  const handleOpenSession = useCallback((openingBalance: number, openingNote: string) => {
    setState((prev) => ({
      isOpen: true,
      openedAt: new Date().toISOString(),
      openedBy: operator,
      openingBalance,
      openingNote: openingNote.trim(),
      expenses: [],
      paymentBreakdown: emptyPayments(),
      lastClose: prev.lastClose,
    }))
    setOpenModal(false)
  }, [operator])

  const handleCloseSession = useCallback((actualCash: number, closingNote: string) => {
    setState((prev) => {
      if (!prev.isOpen) return prev
      const cSales = prev.paymentBreakdown.cash
      const expTotal = prev.expenses.reduce((s, e) => s + e.amount, 0)
      const expCash = Math.round((prev.openingBalance + cSales - expTotal) * 100) / 100
      const discrepancy = Math.round((actualCash - expCash) * 100) / 100
      return {
        ...defaultState(),
        isOpen: false,
        lastClose: {
          closedAt: new Date().toISOString(),
          openingBalance: prev.openingBalance,
          cashSales: cSales,
          expensesTotal: expTotal,
          expectedCash: expCash,
          actualCash,
          discrepancy,
          openingNote: prev.openingNote,
          closingNote: closingNote.trim(),
        },
      }
    })
    setCloseModal(false)
  }, [])

  const addExpense = useCallback((amount: number, note: string) => {
    if (amount <= 0) return
    setState((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        { id: uid(), amount, note: note.trim() || 'Expense', at: new Date().toISOString() },
      ],
    }))
  }, [])

  const activityItems = useMemo(() => {
    const items: {
      id: string
      at: string
      kind: 'open' | 'expense' | 'sale_stub' | 'close'
      title: string
      detail: string
      amount?: number
    }[] = []

    if (state.isOpen && state.openedAt) {
      items.push({
        id: 'open',
        at: state.openedAt,
        kind: 'open',
        title: 'Session opened',
        detail: `${formatMoney(state.openingBalance)} opening float · ${state.openedBy ?? operator}`,
      })
    }

    for (const e of state.expenses) {
      items.push({
        id: e.id,
        at: e.at,
        kind: 'expense',
        title: 'Expense recorded',
        detail: e.note,
        amount: -e.amount,
      })
    }

    if (totalSalesAllMethods > 0) {
      items.push({
        id: 'sales-agg',
        at: state.openedAt ?? new Date().toISOString(),
        kind: 'sale_stub',
        title: 'Sales (session)',
        detail: 'Cash · MonCash · Transfer · Credit',
        amount: totalSalesAllMethods,
      })
    }

    if (state.lastClose) {
      items.push({
        id: `close-${state.lastClose.closedAt}`,
        at: state.lastClose.closedAt,
        kind: 'close',
        title: 'Last session closed',
        detail:
          state.lastClose.discrepancy === 0
            ? 'Balanced — no cash variance'
            : `Variance ${formatMoney(state.lastClose.discrepancy)}`,
        amount: state.lastClose.discrepancy,
      })
    }

    return items.sort((a, b) => b.at.localeCompare(a.at))
  }, [
    state.isOpen,
    state.openedAt,
    state.openingBalance,
    state.openedBy,
    state.expenses,
    state.lastClose,
    totalSalesAllMethods,
    operator,
  ])

  return (
    <AppShell
      title="Cash register"
      subtitle="Session control, reconciliation, and audit trail — frontend preview until API is live."
      quickActionLabel="New sale"
      onQuickAction={() => navigate('/sales/new')}
      backOverride={{ to: '/home', ariaLabel: 'Back to home', title: 'Home' }}
    >
      <div className="grid gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_40px_120px_-88px_rgba(0,0,0,0.92)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,0.07),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-2)_18%,transparent),transparent)] blur-3xl opacity-80" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink/60">
                <ShieldCheck className="h-3.5 w-3.5 text-ink/70" strokeWidth={1.5} />
                Financial control
              </div>
              <h2 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.04em] text-ink/92">
                Register command center
              </h2>
              <p className="mt-2 max-w-[62ch] text-pretty text-sm leading-relaxed text-ink/58">
                One disciplined view of the drawer: session state, payment mix, expenses, and expected cash. Closing
                highlights variance instantly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.isOpen ? (
                <Button type="button" variant="highlight" onClick={() => setCloseModal(true)}>
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                  Close register
                </Button>
              ) : (
                <Button type="button" onClick={() => setOpenModal(true)}>
                  <Wallet className="h-4 w-4" strokeWidth={1.75} />
                  Open register
                </Button>
              )}
            </div>
          </div>
        </header>

        <SessionStatusCard
          isOpen={state.isOpen}
          openedAt={state.openedAt}
          openedBy={state.openedBy ?? operator}
          openingBalance={state.openingBalance}
          openingNote={state.openingNote}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Cash sales"
            value={formatMoney(state.paymentBreakdown.cash)}
            hint="In-drawer sales"
            icon={<Banknote className="h-4 w-4" strokeWidth={1.5} />}
            accent="emerald"
          />
          <Kpi
            label="MonCash"
            value={formatMoney(state.paymentBreakdown.moncash)}
            hint="Mobile money"
            icon={<CreditCard className="h-4 w-4" strokeWidth={1.5} />}
            accent="sky"
          />
          <Kpi
            label="Transfer"
            value={formatMoney(state.paymentBreakdown.transfer)}
            hint="Bank / wire"
            icon={<Landmark className="h-4 w-4" strokeWidth={1.5} />}
            accent="violet"
          />
          <Kpi
            label="Credit"
            value={formatMoney(state.paymentBreakdown.credit)}
            hint="On account"
            icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Kpi
            label="Expenses"
            value={formatMoney(expensesTotal)}
            hint="Paid from drawer this session"
            icon={<ArrowDownRight className="h-4 w-4" strokeWidth={1.5} />}
            accent="rose"
            emphasize={expensesTotal > 0}
          />
          <Kpi
            label="Expected cash"
            value={formatMoney(state.isOpen ? expectedCash : state.lastClose?.expectedCash ?? 0)}
            hint={state.isOpen ? 'Opening + cash sales − expenses' : 'Last closed expectation'}
            icon={<Calculator className="h-4 w-4" strokeWidth={1.5} />}
            accent="accent"
            emphasize
          />
          <Kpi
            label="Session sales (all methods)"
            value={formatMoney(state.isOpen ? totalSalesAllMethods : 0)}
            hint="Gross attributed to this session"
            icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
            accent="muted"
          />
        </div>

        {!state.isOpen ? (
          <div className="rounded-2xl border border-white/10 border-dashed bg-white/[0.02] px-4 py-3 text-center text-xs text-ink/50">
            Payment splits above stay at HTG 0 until the register API links live sales. Expenses and opening float still
            work in this preview.
          </div>
        ) : null}

        {state.isOpen ? (
          <ExpensePanel onAdd={addExpense} />
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setActivityExpanded((v) => !v)}
          >
            <div>
              <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Register activity</div>
              <div className="mt-1 text-xs text-ink/48">Audit-style feed — opens, expenses, closes</div>
            </div>
            <span className="text-[11px] font-medium text-ink/45">{activityExpanded ? 'Hide' : 'Show'}</span>
          </button>
          {activityExpanded ? (
            <div className="mt-5 space-y-0 divide-y divide-white/[0.06]">
              {activityItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">No activity yet. Open a session to begin the trail.</p>
              ) : (
                activityItems.map((row) => (
                  <ActivityRow key={row.id} {...row} />
                ))
              )}
            </div>
          ) : null}
        </section>

        <SessionSummarySection state={state} />

        {openModal ? (
          <OpenRegisterModal onClose={() => setOpenModal(false)} onConfirm={handleOpenSession} />
        ) : null}
        {closeModal && state.isOpen ? (
          <CloseRegisterModal
            onClose={() => setCloseModal(false)}
            onConfirm={handleCloseSession}
            openingBalance={state.openingBalance}
            cashSales={cashSales}
            expensesTotal={expensesTotal}
            expectedCash={expectedCash}
            paymentBreakdown={state.paymentBreakdown}
          />
        ) : null}
      </div>
    </AppShell>
  )
}

function SessionStatusCard({
  isOpen,
  openedAt,
  openedBy,
  openingBalance,
  openingNote,
}: {
  isOpen: boolean
  openedAt: string | null
  openedBy: string
  openingBalance: number
  openingNote: string
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl border p-6 shadow-[0_32px_100px_-80px_rgba(0,0,0,0.9)]',
        isOpen
          ? 'border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]'
          : 'border-white/10 bg-white/[0.03]',
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full blur-3xl opacity-60',
          isOpen
            ? 'bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_35%,transparent),transparent)]'
            : 'bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent)]',
        )}
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'grid h-14 w-14 shrink-0 place-items-center rounded-2xl border',
              isOpen
                ? 'border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[color-mix(in_oklab,var(--accent)_85%,white)]'
                : 'border-white/10 bg-white/[0.04] text-ink/70',
            )}
          >
            {isOpen ? <CircleDot className="h-7 w-7" strokeWidth={1.25} /> : <Lock className="h-6 w-6" strokeWidth={1.25} />}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">Session status</div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink/92">
              {isOpen ? 'Open' : 'Closed'}
            </div>
            {isOpen && openedAt ? (
              <div className="mt-3 grid gap-1 text-sm text-ink/62">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Timer className="h-3.5 w-3.5 text-ink/45" strokeWidth={1.5} />
                  <span>Opened {formatDateTime(openedAt)}</span>
                </div>
                <div>
                  <span className="text-ink/45">Opened by </span>
                  <span className="font-medium text-ink/80">{openedBy}</span>
                </div>
                <div>
                  <span className="text-ink/45">Opening balance </span>
                  <span className="font-semibold tabular-nums text-ink/90">{formatMoney(openingBalance)}</span>
                </div>
                {openingNote ? (
                  <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink/50">{openingNote}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 max-w-[52ch] text-sm text-ink/55">
                No active session. Open the register to start tracking float, expenses, and reconciliation.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  accent,
  emphasize,
}: {
  label: string
  value: string
  hint: string
  icon: ReactNode
  accent: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'accent' | 'muted'
  emphasize?: boolean
}) {
  const glow =
    accent === 'emerald'
      ? 'from-emerald-500/[0.12]'
      : accent === 'sky'
        ? 'from-sky-500/[0.12]'
        : accent === 'violet'
          ? 'from-violet-500/[0.12]'
          : accent === 'amber'
            ? 'from-amber-500/[0.12]'
            : accent === 'rose'
              ? 'from-rose-500/[0.14]'
              : accent === 'accent'
                ? 'from-[color-mix(in_oklab,var(--accent)_18%,transparent)]'
                : 'from-white/[0.05]'

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        emphasize &&
          'border-[color-mix(in_oklab,var(--accent)_28%,transparent)] shadow-[0_0_40px_-18px_color-mix(in_oklab,var(--accent)_35%,transparent)]',
      )}
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-95', glow)} />
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

function ExpensePanel({ onAdd }: { onAdd: (amount: number, note: string) => void }) {
  const [amountStr, setAmountStr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  function submit() {
    const amount = parseAmount(amountStr)
    if (amount <= 0) return
    setBusy(true)
    window.setTimeout(() => {
      onAdd(amount, note)
      setAmountStr('')
      setNote('')
      setBusy(false)
    }, 120)
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Record expense</div>
        <div className="mt-1 text-xs text-ink/48">Withdrawals from the drawer — reduces expected cash.</div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
        <div>
          <FieldLabel htmlFor="exp-amt">Amount (HTG)</FieldLabel>
          <TextField
            id="exp-amt"
            inputMode="decimal"
            placeholder="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <FieldLabel htmlFor="exp-note">Note</FieldLabel>
          <TextField
            id="exp-note"
            placeholder="e.g. Petty cash, supplies"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button type="button" variant="ghost" className="h-11 shrink-0" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={1.75} />}
          Add expense
        </Button>
      </div>
    </section>
  )
}

function ActivityRow({
  kind,
  title,
  detail,
  amount,
  at,
}: {
  kind: 'open' | 'expense' | 'sale_stub' | 'close'
  title: string
  detail: string
  amount?: number
  at: string
}) {
  const icon =
    kind === 'open' ? (
      <Wallet className="h-4 w-4" strokeWidth={1.5} />
    ) : kind === 'expense' ? (
      <ArrowDownRight className="h-4 w-4" strokeWidth={1.5} />
    ) : kind === 'close' ? (
      <Lock className="h-4 w-4" strokeWidth={1.5} />
    ) : (
      <Receipt className="h-4 w-4" strokeWidth={1.5} />
    )

  return (
    <div className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/65">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-ink/88">{title}</div>
          {amount != null ? (
            <div
              className={clsx(
                'text-sm font-semibold tabular-nums',
                amount < 0 ? 'text-rose-200/90' : amount > 0 ? 'text-emerald-200/85' : 'text-ink/70',
              )}
            >
              {amount < 0 ? '−' : amount > 0 ? '+' : ''}
              {formatMoney(Math.abs(amount))}
            </div>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-ink/52">{detail}</div>
        <div className="mt-1.5 text-[11px] tabular-nums text-ink/40">{formatDateTime(at)}</div>
      </div>
    </div>
  )
}

function SessionSummarySection({ state }: { state: PersistedState }) {
  const snap = state.lastClose
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm font-semibold tracking-[-0.02em] text-ink/88">Session summary</div>
        <div className="mt-1 text-xs text-ink/48">Last close snapshot — use for handoff and review.</div>
      </div>
      {!snap ? (
        <p className="py-10 text-center text-sm text-ink/50">Close a session once to see a structured summary here.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryChip label="Closed at" value={formatDateTime(snap.closedAt)} />
          <SummaryChip label="Opening balance" value={formatMoney(snap.openingBalance)} />
          <SummaryChip label="Cash sales" value={formatMoney(snap.cashSales)} />
          <SummaryChip label="Expenses" value={formatMoney(snap.expensesTotal)} />
          <SummaryChip label="Expected cash" value={formatMoney(snap.expectedCash)} emphasize />
          <SummaryChip label="Counted cash" value={formatMoney(snap.actualCash)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <div
              className={clsx(
                'rounded-2xl border px-4 py-3',
                snap.discrepancy === 0
                  ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                  : 'border-[color-mix(in_oklab,var(--highlight)_38%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_10%,transparent)]',
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">Cash variance</div>
              <div
                className={clsx(
                  'mt-1 text-xl font-semibold tabular-nums tracking-[-0.03em]',
                  snap.discrepancy === 0 ? 'text-emerald-200/95' : 'text-[color-mix(in_oklab,var(--highlight)_88%,white)]',
                )}
              >
                {snap.discrepancy === 0 ? 'Balanced' : formatMoney(snap.discrepancy)}
              </div>
              <p className="mt-1 text-xs text-ink/55">
                {snap.discrepancy === 0
                  ? 'Counted cash matched the expected drawer.'
                  : snap.discrepancy > 0
                    ? 'Drawer is over — verify deposits and unrecorded sales.'
                    : 'Drawer is short — recount and review payouts.'}
              </p>
            </div>
          </div>
          {snap.closingNote ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-ink/60">
              <span className="font-medium text-ink/45">Closing note · </span>
              {snap.closingNote}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function SummaryChip({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3',
        emphasize && 'border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]',
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-ink/90">{value}</div>
    </div>
  )
}

function OpenRegisterModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (openingBalance: number, note: string) => void
}) {
  const [balanceStr, setBalanceStr] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-[color-mix(in_oklab,var(--bg-1)_96%,white)] shadow-[0_48px_120px_-60px_rgba(0,0,0,0.85)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/50">
                Formal open
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink/92">Open cash register</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                Declare the opening float. This marks the start of an accountable session.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/60 transition hover:bg-white/[0.07] hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="relative space-y-4 px-6 py-5">
          <div>
            <FieldLabel htmlFor="open-bal">Opening balance (HTG)</FieldLabel>
            <TextField
              id="open-bal"
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <FieldLabel htmlFor="open-note">Note (optional)</FieldLabel>
            <textarea
              id="open-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Shift handoff, float source, special instructions…"
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-ink shadow-inner placeholder:text-ink/35 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
            />
          </div>
        </div>
        <div className="relative flex flex-col gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="sm:min-w-[100px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="sm:min-w-[140px]"
            onClick={() => onConfirm(parseAmount(balanceStr), note)}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            Confirm open
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

function CloseRegisterModal({
  onClose,
  onConfirm,
  openingBalance,
  cashSales,
  expensesTotal,
  expectedCash,
  paymentBreakdown,
}: {
  onClose: () => void
  onConfirm: (actual: number, note: string) => void
  openingBalance: number
  cashSales: number
  expensesTotal: number
  expectedCash: number
  paymentBreakdown: PaymentBreakdown
}) {
  const [actualStr, setActualStr] = useState('')
  const [note, setNote] = useState('')

  const actual = parseAmount(actualStr)
  const discrepancy = Math.round((actual - expectedCash) * 100) / 100

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-[color-mix(in_oklab,var(--bg-1)_96%,white)] shadow-[0_56px_140px_-56px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.07),transparent)]" />
        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/50">
                Controlled close
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink/92">Close cash register</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                Reconcile physical cash against the session math. Variance must be explicit before close.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-ink/60 transition hover:bg-white/[0.07] hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="relative max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Opening balance</span>
              <span className="font-medium tabular-nums text-ink/88">{formatMoney(openingBalance)}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Cash sales</span>
              <span className="font-medium tabular-nums text-ink/88">{formatMoney(cashSales)}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink/65">
              <span>MonCash · Transfer · Credit</span>
              <span className="text-xs tabular-nums text-ink/50">
                {formatMoney(paymentBreakdown.moncash + paymentBreakdown.transfer + paymentBreakdown.credit)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-ink/65">
              <span>Expenses</span>
              <span className="font-medium tabular-nums text-rose-200/85">−{formatMoney(expensesTotal)}</span>
            </div>
            <div className="my-1 border-t border-white/10" />
            <div className="flex justify-between gap-3 font-medium text-ink/88">
              <span>Expected closing cash</span>
              <span className="tabular-nums text-[color-mix(in_oklab,var(--accent)_82%,white)]">
                {formatMoney(expectedCash)}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel htmlFor="close-actual">Counted cash in drawer (HTG)</FieldLabel>
            <TextField
              id="close-actual"
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={actualStr}
              onChange={(e) => setActualStr(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div
            className={clsx(
              'mt-5 rounded-2xl border px-4 py-4',
              actualStr.trim() === ''
                ? 'border-white/10 bg-white/[0.03]'
                : discrepancy === 0
                  ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                  : 'border-[color-mix(in_oklab,var(--highlight)_40%,transparent)] bg-[color-mix(in_oklab,var(--highlight)_12%,transparent)]',
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">Difference</div>
            <div
              className={clsx(
                'mt-2 text-3xl font-semibold tracking-[-0.04em] tabular-nums',
                actualStr.trim() === ''
                  ? 'text-ink/35'
                  : discrepancy === 0
                    ? 'text-emerald-200/95'
                    : 'text-[color-mix(in_oklab,var(--highlight)_90%,white)]',
              )}
            >
              {actualStr.trim() === '' ? '—' : formatMoney(discrepancy)}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink/55">
              {actualStr.trim() === ''
                ? 'Enter the physical count to reveal variance vs expected.'
                : discrepancy === 0
                  ? 'Perfect match with expected cash.'
                  : discrepancy > 0
                    ? 'Overage — drawer exceeds expected.'
                    : 'Shortage — drawer below expected.'}
            </p>
          </div>

          <div className="mt-5">
            <FieldLabel htmlFor="close-note">Closing note (optional)</FieldLabel>
            <textarea
              id="close-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Variance explanation, witness, deposit reference…"
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-ink shadow-inner placeholder:text-ink/35 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
            />
          </div>
        </div>

        <div className="relative flex flex-col gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="sm:min-w-[100px]" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="highlight" className="sm:min-w-[160px]" onClick={() => onConfirm(actual, note)}>
            <Lock className="h-4 w-4" strokeWidth={1.75} />
            Close register
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/72 backdrop-blur-md"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full animate-[fadeIn_0.2s_ease-out]">{children}</div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
