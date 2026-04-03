import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Landmark, ShieldCheck, X } from 'lucide-react'
import clsx from 'clsx'
import { createCreditPaymentApi } from '../../api/credit'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { FieldLabel, TextField } from '../../components/ui/Field'
import type { DebtorSummary } from '../../types/credit'

function formatMoney(n: number) {
  return `HTG ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function parseAmount(raw: string): number {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || t === '.') return 0
  const n = parseFloat(t)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

type PayMethod = 'cash' | 'moncash' | 'transfer'

const METHODS: { id: PayMethod; label: string; icon: ReactNode }[] = [
  { id: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'moncash', label: 'MonCash', icon: <CreditCard className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'transfer', label: 'Transfer', icon: <Landmark className="h-4 w-4" strokeWidth={1.5} /> },
]

export function RecordPaymentModal({
  debtor,
  onClose,
  onRecorded,
}: {
  debtor: DebtorSummary | null
  onClose: () => void
  onRecorded: () => void
}) {
  const [amountStr, setAmountStr] = useState('')
  const [method, setMethod] = useState<PayMethod>('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const amount = parseAmount(amountStr)
  const previewBalance = useMemo(() => {
    if (!debtor) return 0
    return Math.max(0, Math.round((debtor.debtBalance - amount) * 100) / 100)
  }, [debtor, amount])

  if (!debtor) return null
  const d = debtor

  async function submit() {
    if (amount <= 0 || amount > d.debtBalance + 0.0001) return
    setBusy(true)
    setSubmitError(null)
    try {
      await createCreditPaymentApi({
        customer_id: d.customerId,
        amount: amount.toFixed(2),
        payment_method: method,
        note: note.trim(),
        cash_register_session_id: null,
      })
      onRecorded()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Payment failed.')
    } finally {
      setBusy(false)
    }
  }

  const overPay = amount > d.debtBalance + 0.01

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/72 backdrop-blur-md"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-[color-mix(in_oklab,var(--bg-1)_96%,white)] shadow-[0_56px_140px_-56px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.07),transparent)]" />

        <div className="relative border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink/50">
                Repayment
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink/92">Record payment</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                Applies on the server and reduces the customer&apos;s outstanding balance.
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-xs font-medium text-ink/45">Customer</div>
            <div className="mt-1 text-sm font-semibold tracking-[-0.02em] text-ink/90">{d.name}</div>
            <div className="mt-0.5 text-xs text-ink/50">{d.phone || '—'}</div>
            <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-white/10 pt-3">
              <span className="text-xs text-ink/50">Outstanding</span>
              <span className="text-sm font-semibold tabular-nums text-[color-mix(in_oklab,var(--highlight)_82%,white)]">
                {formatMoney(d.debtBalance)}
              </span>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="pay-amt">Amount (HTG)</FieldLabel>
            <TextField
              id="pay-amt"
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="mt-1.5"
            />
            {overPay ? (
              <div className="mt-2 text-[11px] text-[color-mix(in_oklab,var(--highlight)_75%,white)]">
                Amount exceeds outstanding balance.
              </div>
            ) : null}
            {submitError ? (
              <div className="mt-2 text-[11px] text-[color-mix(in_oklab,var(--highlight)_75%,white)]">{submitError}</div>
            ) : null}
          </div>

          <div>
            <div className="text-xs font-medium text-ink/70">Method</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-medium transition',
                    method === m.id
                      ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-ink/90'
                      : 'border-white/10 bg-white/[0.02] text-ink/65 hover:bg-white/[0.04]',
                  )}
                >
                  <span className="text-ink/80">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="pay-note">Note (optional)</FieldLabel>
            <TextField
              id="pay-note"
              placeholder="Receipt ref., witness, partial settlement…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div
            className={clsx(
              'rounded-2xl border px-4 py-3',
              amount <= 0
                ? 'border-white/10 bg-white/[0.02]'
                : 'border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]',
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">After payment</div>
            <div className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.03em] text-ink/92">
              {amount <= 0 ? '—' : formatMoney(previewBalance)}
            </div>
            <div className="mt-1 text-xs text-ink/52">Remaining balance (estimated)</div>
          </div>
        </div>

        <div className="relative flex flex-col gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="sm:min-w-[100px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="sm:min-w-[160px]"
            disabled={busy || amount <= 0 || overPay || d.debtBalance <= 0}
            onClick={() => void submit()}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            Record payment
          </Button>
        </div>
      </div>
    </div>
  )
}
